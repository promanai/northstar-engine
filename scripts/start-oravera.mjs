// Local-only Standard preview. Never reads or replaces owner launch state.
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const state = path.join(root, '.oravera-standard-local');
const secrets = path.join(state, '.env');
await mkdir(state, { recursive: true });
try {
  await writeFile(
    secrets,
    `INITIAL_ADMIN_TOKEN=${randomBytes(32).toString('hex')}\n`,
    { flag: 'wx', mode: 0o600 },
  );
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const args = [
  '--config',
  path.join(root, 'deployment/oravera.standard.local.json'),
  '--persist-to',
  state,
];
const options = {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
};
const migration = spawnSync(
  process.execPath,
  [cli, 'd1', 'migrations', 'apply', 'DB', '--local', ...args],
  { ...options, encoding: 'utf8' },
);
if (migration.status !== 0) {
  console.error(migration.stdout, migration.stderr);
  process.exit(1);
}
console.log('OraVera local D1 ready. No remote resources were changed.');
console.log(
  'First owner registration: use the INITIAL_ADMIN_TOKEN value in ' +
    secrets +
    '. It is not a login password.',
);
const child = spawn(
  process.execPath,
  [
    cli,
    'dev',
    '--local',
    ...args,
    '--env-file',
    secrets,
    '--port',
    '8787',
    '--inspector-port',
    '0',
    '--log-level',
    'warn',
  ],
  { ...options, stdio: 'inherit' },
);
child.on('error', () => {
  console.error('Local Worker could not start.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
