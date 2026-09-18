import { createHash } from 'node:crypto';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeSql(text) {
  return text.replaceAll('\r\n', '\n');
}

export function migrationHashes(entries) {
  return Object.fromEntries(
    entries
      .filter(([name]) => name.endsWith('.sql'))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, text]) => [name, sha256(normalizeSql(text))]),
  );
}

export function createBackupManifest({
  database,
  target,
  sqlFile,
  sqlBytes,
  config,
  migrations,
}) {
  return {
    format: 1,
    engine: 'northstar-engine',
    createdAt: new Date().toISOString(),
    database,
    target,
    sqlFile,
    bytes: sqlBytes.length,
    sha256: sha256(sqlBytes),
    config: config ?? null,
    migrationHashes: migrationHashes(migrations),
  };
}

export function validateBackupManifest(
  manifest,
  sqlBytes,
  currentMigrations,
  options = {},
) {
  const errors = [];
  if (
    !manifest ||
    manifest.format !== 1 ||
    manifest.engine !== 'northstar-engine'
  )
    errors.push('Неподдерживаемый или повреждённый manifest резервной копии');
  if (manifest?.bytes !== sqlBytes.length)
    errors.push('Размер SQL-файла не совпадает с manifest');
  if (manifest?.sha256 !== sha256(sqlBytes))
    errors.push('SHA-256 SQL-файла не совпадает с manifest');

  const hashes = manifest?.migrationHashes;
  if (
    !hashes ||
    typeof hashes !== 'object' ||
    Array.isArray(hashes) ||
    Object.entries(hashes).some(
      ([name, hash]) =>
        !name.endsWith('.sql') ||
        typeof hash !== 'string' ||
        !/^[a-f0-9]{64}$/.test(hash),
    )
  )
    errors.push('Отсутствует или повреждён список хешей миграций');
  else if (!options.allowMigrationDrift) {
    const actual = migrationHashes(currentMigrations);
    const expected = manifest.migrationHashes;
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      errors.push(
        'Набор миграций проекта отличается от набора, с которым создана копия; используйте --allow-migration-drift только после ручной проверки',
      );
  }
  return errors;
}

export function restoreConfirmation(target, value) {
  return (
    value === (target === 'remote' ? 'RESTORE-REMOTE-D1' : 'RESTORE-LOCAL-D1')
  );
}

export function parseArgs(argv) {
  const values = {};
  const setValue = (key, value) => {
    if (!(key in values)) values[key] = value;
    else
      values[key] = Array.isArray(values[key])
        ? [...values[key], value]
        : [values[key], value];
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--'))
      throw new Error(`Неизвестный аргумент: ${token}`);
    const equals = token.indexOf('=');
    const key = token.slice(2, equals === -1 ? undefined : equals);
    if (!key) throw new Error('Пустой аргумент командной строки');
    if (equals !== -1) setValue(key, token.slice(equals + 1));
    else if (argv[index + 1] && !argv[index + 1].startsWith('--'))
      setValue(key, argv[++index]);
    else setValue(key, true);
  }
  return values;
}

export function parseJsonc(text) {
  let output = '';
  let quote = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
        output += char;
      }
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      } else if (char === '\n') output += char;
      continue;
    }
    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"') {
      quote = true;
      output += char;
    } else if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else output += char;
  }
  return JSON.parse(output.replace(/,\s*([}\]])/g, '$1'));
}

export function loadDotEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trimStart().startsWith('#')) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}
