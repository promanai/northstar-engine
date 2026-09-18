import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createBackupManifest,
  parseArgs,
  parseJsonc,
  restoreConfirmation,
  validateBackupManifest,
} from './operations-policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = path.join(
  ROOT,
  'node_modules',
  'wrangler',
  'bin',
  'wrangler.js',
);

function usage() {
  console.log(`Операции D1 Northstar Engine

Резервная копия:
  npm run db:backup -- --config wrangler.jsonc --target remote --output backups/site.sql
  npm run db:backup -- --config tests/wrangler.json --target local --persist-to .test-state-example --output backups/test.sql

Восстановление (требует точного подтверждения):
  npm run db:restore -- --config wrangler.jsonc --target remote --file backups/site.sql --confirm-restore RESTORE-REMOTE-D1

Дополнительно: --database NAME, --persist-to PATH, --overwrite, --env-file PATH,
--allow-migration-drift. Удалённое восстановление необратимо для целевой базы.`);
}

async function readConfig(configPath) {
  const absolute = path.resolve(ROOT, configPath);
  const config = parseJsonc(await readFile(absolute, 'utf8'));
  const database = config.d1_databases?.find((item) => item.binding === 'DB');
  if (!database?.database_name)
    throw new Error('В конфигурации не найден D1 binding DB');
  return { absolute, config, database };
}

async function readMigrations(configPath, database) {
  const directory = path.resolve(
    path.dirname(configPath),
    database.migrations_dir ?? 'drizzle',
  );
  const names = await readdir(directory);
  const files = [];
  for (const name of names.filter((item) => item.endsWith('.sql')).sort())
    files.push([name, await readFile(path.join(directory, name), 'utf8')]);
  return files;
}

function wranglerArgs(action, database, args, configPath) {
  const target = args.target ?? 'local';
  if (!['local', 'remote'].includes(target))
    throw new Error('--target должен быть local или remote');
  const result = [
    'd1',
    action,
    args.database ?? database.database_name,
    '--config',
    configPath,
  ];
  result.push(target === 'remote' ? '--remote' : '--local');
  if (
    target === 'local' &&
    (typeof args['persist-to'] !== 'string' || !args['persist-to'].trim())
  )
    throw new Error(
      'Для локальной операции обязателен явный --persist-to PATH; источник и цель не выбираются автоматически',
    );
  if (target === 'remote' && args['persist-to'] !== undefined)
    throw new Error('--persist-to применим только к local');
  if (target === 'local' && action !== 'export')
    result.push('--persist-to', path.resolve(ROOT, args['persist-to']));
  for (const envFile of []
    .concat(args['env-file'] ?? [])
    .filter((value) => typeof value === 'string'))
    result.push('--env-file', path.resolve(ROOT, envFile));
  return { result, target };
}

async function exportLocal(database, args, output) {
  // Use the same export primitive as the installed Wrangler. Its export CLI
  // does not accept --persist-to, so never silently fall back to default state.
  const d1Persist = path.join(
    path.resolve(ROOT, args['persist-to']),
    'v3',
    'd1',
  );
  const entries = await readdir(d1Persist, { recursive: true });
  if (!entries.some((name) => name.endsWith('.sqlite')))
    throw new Error(
      'В выбранном каталоге нет локальной D1; пустая копия не создана',
    );
  const { Miniflare } = await import('miniflare');
  const runtime = new Miniflare({
    modules: true,
    script: 'export default {}',
    d1Persist,
    d1Databases: {
      DATABASE:
        database.preview_database_id ??
        database.database_id ??
        database.binding,
    },
  });
  try {
    const db = await runtime.getD1Database('DATABASE');
    const tables = await db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
      )
      .all();
    if (!tables.results.length)
      throw new Error(
        'Выбранная D1 пуста или binding не совпадает с каталогом данных',
      );
    // Create ALL tables before any inserts. A normal interleaved dump may
    // insert a child before its parent table exists; deferred FKs cannot fix
    // "no such table". Run while application writes are stopped.
    const schema = await db
      .prepare('PRAGMA miniflare_d1_export(?,?,?);')
      .bind(false, true)
      .raw();
    const data = await db
      .prepare('PRAGMA miniflare_d1_export(?,?,?);')
      .bind(true, false)
      .raw();
    if (!schema[0]?.length || !data[0]?.length)
      throw new Error('Локальный экспорт не вернул SQL');
    await writeFile(output, [...schema[0], ...data[0]].join('\n'), {
      flag: args.overwrite ? 'w' : 'wx',
    });
  } finally {
    await runtime.dispose();
  }
}

function runWrangler(argumentsList) {
  const result = spawnSync(process.execPath, [WRANGLER, ...argumentsList], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Wrangler завершился с кодом ${result.status ?? 'unknown'}`,
    );
}

async function backup(args) {
  if (!args.output || typeof args.output !== 'string')
    throw new Error('Для backup обязателен --output PATH');
  const {
    absolute: configPath,
    config,
    database,
  } = await readConfig(args.config ?? 'wrangler.jsonc');
  if (
    args.database !== undefined &&
    ![database.database_name, database.binding].includes(args.database)
  )
    throw new Error(
      '--database должен совпадать с настроенным binding DB или его именем',
    );
  const { result, target } = wranglerArgs('export', database, args, configPath);
  const output = path.resolve(ROOT, args.output);
  const manifestPath = `${output}.manifest.json`;
  if ((existsSync(output) || existsSync(manifestPath)) && !args.overwrite)
    throw new Error(
      `Файл уже существует: ${output}. Используйте --overwrite осознанно.`,
    );
  await mkdir(path.dirname(output), { recursive: true });
  result.push('--output', output, '--skip-confirmation');
  if (target === 'local') await exportLocal(database, args, output);
  else runWrangler(result);
  const sql = await readFile(output);
  if (!sql.length) throw new Error('Wrangler создал пустую резервную копию');
  const migrations = await readMigrations(configPath, database);
  const manifest = createBackupManifest({
    database: args.database ?? database.database_name,
    target,
    sqlFile: path.basename(output),
    sqlBytes: sql,
    config: { name: config.name, binding: database.binding },
    migrations,
  });
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  console.log(`Готово: ${output}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`SHA-256: ${manifest.sha256}`);
}

async function restore(args) {
  if (!args.file || typeof args.file !== 'string')
    throw new Error('Для restore обязателен --file PATH');
  const { absolute: configPath, database } = await readConfig(
    args.config ?? 'wrangler.jsonc',
  );
  const file = path.resolve(ROOT, args.file);
  const manifestPath = `${file}.manifest.json`;
  await access(file);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const sql = await readFile(file);
  const { result, target } = wranglerArgs(
    'execute',
    database,
    args,
    configPath,
  );
  if (!restoreConfirmation(target, args['confirm-restore']))
    throw new Error(
      `Восстановление требует --confirm-restore ${target === 'remote' ? 'RESTORE-REMOTE-D1' : 'RESTORE-LOCAL-D1'}`,
    );
  const migrations = await readMigrations(configPath, database);
  const errors = validateBackupManifest(manifest, sql, migrations, {
    allowMigrationDrift: Boolean(args['allow-migration-drift']),
  });
  if (errors.length) throw new Error(errors.join('; '));
  result.push('--file', file, '--yes');
  console.warn(
    `ВНИМАНИЕ: выполняется восстановление D1 (${target}) из ${file}`,
  );
  runWrangler(result);
  console.log(
    'Восстановление завершено. Проверьте health-check и миграционный журнал.',
  );
}

async function main() {
  const [command, ...raw] = process.argv.slice(2);
  const args = parseArgs(raw);
  if (args.help || !command) return usage();
  if (command === 'backup') return backup(args);
  if (command === 'restore') return restore(args);
  throw new Error(`Неизвестная операция: ${command}`);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
  });
