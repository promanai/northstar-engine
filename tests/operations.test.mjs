import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackupManifest,
  migrationHashes,
  parseJsonc,
  restoreConfirmation,
  validateBackupManifest,
} from '../scripts/operations-policy.mjs';
import {
  validateOpenApi,
  validatePublicCatalog,
} from '../scripts/contract-policy.mjs';

void test('backup manifest detects tampering and preserves migration digest', () => {
  const migrations = [['0001_init.sql', 'CREATE TABLE users (id text);\n']];
  const sql = Buffer.from(
    "PRAGMA foreign_keys=OFF;\nINSERT INTO users VALUES ('1');\n",
  );
  const manifest = createBackupManifest({
    database: 'test-db',
    target: 'local',
    sqlFile: 'backup.sql',
    sqlBytes: sql,
    config: { name: 'test' },
    migrations,
  });
  assert.equal(validateBackupManifest(manifest, sql, migrations).length, 0);
  assert.equal(
    validateBackupManifest(
      manifest,
      Buffer.from(`${sql.toString('utf8')}tampered`),
      migrations,
    ).length,
    2,
  );
  assert.deepEqual(Object.keys(manifest.migrationHashes), ['0001_init.sql']);
  assert.equal(migrationHashes(migrations)['0001_init.sql'].length, 64);
});

void test('restore requires explicit target-specific confirmation', () => {
  assert.equal(restoreConfirmation('local', 'RESTORE-LOCAL-D1'), true);
  assert.equal(restoreConfirmation('remote', 'RESTORE-REMOTE-D1'), true);
  assert.equal(restoreConfirmation('remote', 'RESTORE-LOCAL-D1'), false);
  assert.equal(restoreConfirmation('local', true), false);
});

void test('restore rejects missing or malformed migration hashes even with drift override', () => {
  const migrations = [['0001.sql', 'CREATE TABLE sample (id text);']];
  const sql = Buffer.from('test');
  const manifest = createBackupManifest({
    database: 'test',
    target: 'local',
    sqlFile: 'test.sql',
    sqlBytes: sql,
    migrations,
  });
  for (const hashes of [
    undefined,
    null,
    [],
    'invalid',
    { '0001.sql': 'invalid' },
  ]) {
    for (const allowMigrationDrift of [false, true])
      assert.ok(
        validateBackupManifest(
          { ...manifest, migrationHashes: hashes },
          sql,
          migrations,
          { allowMigrationDrift },
        ).length,
      );
  }
});

void test('jsonc parser does not strip URLs inside strings', () => {
  const config = parseJsonc(
    '{"$schema":"https://example.com/schema.json", // comment\n "items":[1,2,],}',
  );
  assert.equal(config.$schema, 'https://example.com/schema.json');
  assert.deepEqual(config.items, [1, 2]);
});

void test('contract gate covers agent and customer machine interfaces', () => {
  const spec = {
    openapi: '3.0.3',
    info: { title: 'Northstar', version: '1' },
    components: { securitySchemes: { bearerAuth: {}, cookieAuth: {} } },
    paths: {
      '/auth/register': { post: { summary: 'register' } },
      '/auth/login': { post: { summary: 'login' } },
    },
  };
  assert.ok(validateOpenApi(spec).some((error) => error.includes('/mcp')));
  assert.ok(
    validateOpenApi({
      ...spec,
      paths: {
        '/auth/register': {
          post: {
            summary: 'register',
            operationId: 'post_register',
            responses: { 200: {} },
          },
        },
      },
    }).some((error) => error.includes('/mcp')),
  );
  assert.deepEqual(
    validatePublicCatalog({ products: [{ id: '1', title: 'Public' }] }),
    [],
  );
  assert.notDeepEqual(
    validatePublicCatalog({ products: [{ aiInstructions: 'secret' }] }),
    [],
  );
});
