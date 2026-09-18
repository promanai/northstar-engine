import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDotEnv,
  migrationHashes,
  parseArgs,
  parseJsonc,
} from './operations-policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  console.log(
    'Проверка установки: npm run db:preflight -- --config wrangler.example.jsonc [--production] [--env-file .dev.vars] [--format json]',
  );
}

function check(report, label, ok, detail, strict = false) {
  const status = ok ? 'pass' : strict ? 'fail' : 'warn';
  report.push({ status, label, detail });
}

async function loadEnvironment(args) {
  const environment = { ...process.env };
  for (const file of []
    .concat(args['env-file'] ?? [])
    .filter((value) => typeof value === 'string')) {
    const values = loadDotEnv(await readFile(path.resolve(ROOT, file), 'utf8'));
    Object.assign(environment, values);
  }
  return environment;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  const production = Boolean(args.production);
  const report = [];
  const configFile = path.resolve(
    ROOT,
    args.config ?? 'deployment/lite.example.json',
  );
  let config;
  try {
    config = parseJsonc(await readFile(configFile, 'utf8'));
    check(report, 'Wrangler config', true, path.relative(ROOT, configFile));
  } catch (error) {
    check(report, 'Wrangler config', false, error.message, true);
  }

  const mainFile =
    config?.main && path.resolve(path.dirname(configFile), config.main);
  const assets =
    config?.assets?.directory &&
    path.resolve(path.dirname(configFile), config.assets.directory);
  check(
    report,
    'Worker entrypoint',
    Boolean(mainFile && existsSync(mainFile)),
    mainFile ? path.relative(ROOT, mainFile) : 'main не задан',
    production,
  );
  check(
    report,
    'Static assets',
    Boolean(assets && existsSync(assets)),
    assets ? path.relative(ROOT, assets) : 'assets.directory не задан',
    production,
  );

  const db = config?.d1_databases?.find((item) => item.binding === 'DB');
  const environment = { ...config?.vars, ...(await loadEnvironment(args)) };
  const mode = environment.ENGINE_MODE ?? (db ? 'standard' : 'lite');
  check(report, 'Engine mode', ['lite', 'standard'].includes(mode), mode, true);
  if (mode === 'standard') {
    check(
      report,
      'Analytics retention schedule',
      config?.triggers?.crons?.includes('17 * * * *'),
      config?.triggers?.crons?.includes('17 * * * *')
        ? 'Расписание настроено: каждый час на 17-й минуте UTC'
        : 'Добавьте triggers.crons: ["17 * * * *"]; без него остаётся очистка по запросам',
    );
    check(
      report,
      'D1 binding DB',
      Boolean(db?.database_name),
      db?.database_name ?? 'binding DB не найден',
      true,
    );
    check(
      report,
      'D1 database_id',
      Boolean(db?.database_id && !db.database_id.includes('REPLACE')),
      db?.database_id?.includes('REPLACE')
        ? 'замените placeholder на ID клиента'
        : 'ID задан',
      production,
    );
    const r2 = config?.r2_buckets?.find((item) => item.binding === 'FILES');
    check(
      report,
      'R2 binding FILES',
      Boolean(r2?.bucket_name),
      r2?.bucket_name ?? 'добавьте R2 binding FILES для загрузок',
      production,
    );
  } else {
    check(report, 'Storage', true, 'Lite: D1/R2 и миграции не нужны');
    if (environment.LITE_VOICE_ENABLED === 'true') {
      check(
        report,
        'Voice key',
        Boolean(environment.OPENAI_API_KEY?.trim()),
        'OpenAI server key is required for voice',
        production,
      );
      check(
        report,
        'Voice limit',
        Boolean(
          config?.ratelimits?.some((b) => b.name === 'LITE_VOICE_LIMITER'),
        ),
        'LITE_VOICE_LIMITER is required for voice',
        true,
      );
    }
    if (environment.LITE_AI_ENABLED === 'true') {
      const key =
        environment.LITE_AI_PROVIDER === 'xai'
          ? environment.XAI_API_KEY
          : environment.OPENAI_API_KEY;
      check(
        report,
        'AI key',
        Boolean(key),
        'Проверено наличие серверного ключа',
        production,
      );
      check(
        report,
        'AI request limit',
        Boolean(
          config?.ratelimits?.some((b) => b.name === 'LITE_RATE_LIMITER'),
        ),
        'LITE_RATE_LIMITER обязателен для live AI',
        true,
      );
    }
  }

  const migrationDirectory =
    db?.migrations_dir &&
    path.resolve(path.dirname(configFile), db.migrations_dir);
  let migrations = [];
  if (
    mode === 'standard' &&
    migrationDirectory &&
    existsSync(migrationDirectory)
  ) {
    const names = (await readdir(migrationDirectory))
      .filter((name) => name.endsWith('.sql'))
      .sort();
    migrations = await Promise.all(
      names.map(async (name) => [
        name,
        await readFile(path.join(migrationDirectory, name), 'utf8'),
      ]),
    );
    check(
      report,
      'D1 migrations',
      names.length > 0,
      `${names.length} SQL-файлов, последний: ${names.at(-1) ?? 'нет'}`,
      true,
    );
    const prefixes = names.map((name) => name.split('_', 1)[0]);
    check(
      report,
      'Уникальные номера миграций',
      new Set(prefixes).size === prefixes.length,
      'проверьте дубликаты префиксов',
      true,
    );
  } else if (mode === 'standard')
    check(report, 'D1 migrations', false, 'migrations_dir не найден', true);

  const release = path.join(ROOT, 'engine-release.json');
  let releaseManifest;
  try {
    releaseManifest = JSON.parse(await readFile(release, 'utf8'));
    check(
      report,
      'Release manifest',
      releaseManifest.engine === 'northstar-engine' &&
        releaseManifest.updateProtocol === 1 &&
        releaseManifest.migrationPolicy === 'additive',
      'engine/updateProtocol/migrationPolicy',
      true,
    );
  } catch (error) {
    check(report, 'Release manifest', false, error.message, true);
  }
  const provider = String(
    args.provider ??
      environment.PAYMENT_PROVIDER ??
      config?.vars?.PAYMENT_PROVIDER ??
      '',
  ).toLowerCase();
  if (mode === 'lite') check(report, 'Payments', true, 'Lite: отключены');
  else if (provider === 'stripe') {
    check(
      report,
      'Stripe secret',
      Boolean(environment.STRIPE_SECRET_KEY),
      'STRIPE_SECRET_KEY передаётся через env/secrets и не печатается',
      production,
    );
    check(
      report,
      'Stripe webhook secret',
      Boolean(environment.STRIPE_WEBHOOK_SECRET),
      'STRIPE_WEBHOOK_SECRET передаётся через env/secrets и не печатается',
      production,
    );
    let url;
    try {
      url = new URL(environment.PUBLIC_SITE_URL ?? '');
    } catch {
      url = null;
    }
    check(
      report,
      'Public HTTPS URL',
      url?.protocol === 'https:' && !url.username && !url.password,
      'PUBLIC_SITE_URL должен быть HTTPS origin',
      true,
    );
  } else
    check(
      report,
      'Payment provider',
      !provider || ['stripe', 'external'].includes(provider),
      provider
        ? `неизвестный provider: ${provider}`
        : 'не выбран; платёжные checkout-операции будут отключены',
      Boolean(provider && !['stripe', 'external'].includes(provider)),
    );

  const migrationDigest = Object.values(migrationHashes(migrations))
    .join('')
    .slice(0, 16);
  const failed = report.filter((item) => item.status === 'fail').length;
  const result = {
    ok: failed === 0,
    production,
    config: path.relative(ROOT, configFile),
    migrationDigest,
    checks: report,
  };
  if (args.format === 'json') console.log(JSON.stringify(result, null, 2));
  else {
    console.log(
      `Preflight ${result.ok ? 'OK' : 'FAILED'} (${production ? 'production' : 'local'})`,
    );
    for (const item of report)
      console.log(
        `${item.status === 'pass' ? '✓' : item.status === 'warn' ? '!' : '✗'} ${item.label}: ${item.detail}`,
      );
    console.log(`Migration digest: ${migrationDigest || 'нет'}`);
  }
  if (!result.ok) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
  });
