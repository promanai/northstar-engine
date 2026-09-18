import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Wrangler resolves secret files relative to its config in dist/server.
// Use absolute root paths so secrets survive rebuilds and never enter dist.
const child = spawn(
  process.execPath,
  [
    path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
    'dev',
    '--config',
    path.join(root, 'dist/server/wrangler.json'),
    '--persist-to',
    path.join(root, '.wrangler-state'),
    ...['.env', '.env.local']
      .map((name) => path.join(root, name))
      .filter(existsSync)
      .flatMap((filename) => ['--env-file', filename]),
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: 'inherit', windowsHide: true },
);
child.on('error', () => {
  console.error('Не удалось запустить локальный Worker');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
