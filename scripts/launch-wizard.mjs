import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateChecklist } from './launch-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function wizardHtml() {
  const plan = validateChecklist(
    JSON.parse(
      await readFile(path.join(root, 'onboarding/checklist.json'), 'utf8'),
    ),
  );
  const policy = (
    await readFile(path.join(root, 'scripts/launch-policy.mjs'), 'utf8')
  ).replace(/^export /gm, '');
  const auditPolicy = (
    await readFile(path.join(root, 'scripts/launch-audit-report.mjs'), 'utf8')
  ).replace(/^export /gm, '');
  const template = await readFile(
    path.join(root, 'onboarding/wizard.html'),
    'utf8',
  );
  const client = await readFile(
    path.join(root, 'onboarding/wizard-client.js'),
    'utf8',
  );
  const script = (
    policy +
    '\n' +
    auditPolicy +
    '\nconst plan = ' +
    JSON.stringify(plan).replaceAll('<', '\\u003c') +
    ';\n' +
    client
  ).replaceAll('\r\n', '\n');
  if (/<\/script/i.test(script)) throw new Error('UNSAFE_WIZARD_SCRIPT');
  const hash = createHash('sha256').update(script).digest('base64');
  return template
    .replace('<!--WIZARD_SCRIPT-->', () => '<script>' + script + '</script>')
    .replace('SCRIPT_HASH', () => hash);
}

// Serves only generic UI. Never reads a passport, accepts a body, logs requests,
// serves arbitrary files, or makes outbound calls. Answers live in the browser/file.
export async function startWizard(port = 0) {
  const html = await wizardHtml();
  const server = createServer((req, res) => {
    const host = `127.0.0.1:${server.address().port}`;
    const allowed =
      req.headers.host === host &&
      (!req.headers.origin || req.headers.origin === `http://${host}`) &&
      !['cross-site'].includes(req.headers['sec-fetch-site']);
    const headers = {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'content-type': 'text/html; charset=utf-8',
    };
    if (!allowed || !['GET', 'HEAD'].includes(req.method) || req.url !== '/') {
      res.writeHead(allowed ? 404 : 403, headers);
      res.end('Not available');
      return;
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : html);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const port =
    args.length === 0
      ? 0
      : args.length === 2 && args[0] === '--port' && /^\d{1,5}$/.test(args[1])
        ? Number(args[1])
        : -1;
  if (port < 0 || port > 65535) {
    console.error('Укажите --port от 0 до 65535');
    process.exitCode = 1;
  } else
    startWizard(port)
      .then((server) => {
        console.log(
          `Мастер запуска: http://127.0.0.1:${server.address().port}/`,
        );
        console.log(
          'Откройте JSON-паспорт кнопкой «Открыть файл». Ответы не отправляются на сервер. Ctrl+C — остановить.',
        );
        const close = () => server.close(() => process.exit(0));
        process.on('SIGINT', close);
        process.on('SIGTERM', close);
      })
      .catch(() => {
        console.error(
          'Не удалось запустить мастер. Проверьте файлы и выбранный порт.',
        );
        process.exitCode = 1;
      });
}
