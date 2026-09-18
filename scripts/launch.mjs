import { readFile, open, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wizardHtml } from './launch-wizard.mjs';
import { auditLaunch, auditMarkdown } from './launch-audit.mjs';
import {
  createPassport,
  evaluatePassport,
  launchMarkdown,
  PASSPORT_MAX_BYTES,
  serializePassport,
} from './launch-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (command === '--help' || !command) {
    console.log(
      'Мастер в браузере: npm run launch:ui\nАвтономный HTML: npm run launch -- wizard --output .northstar-launch/wizard.html',
    );
    console.log(
      'Проверка исходников без сети: npm run launch -- audit --mode lite [--json] [--output PATH] [--require-pass]\nОшибки дают exit 1; --require-pass также блокирует предупреждения. Ручная приёмка остаётся обязательной.',
    );
    console.log(
      'Паспорт запуска (локально, без сети)\n npm run launch -- init --mode lite\n npm run launch -- status [--json] [--require-ready]\n npm run launch -- report --output .northstar-launch/report.md\n npm run launch -- guide --mode lite --output docs/LAUNCH_CHECKLIST.md\n--state PATH: существующий паспорт вне public/dist; default .northstar-launch/state.json\nОтветы редактируются владельцем/его агентом в state.json. Пароли и ключи запрещены. Существующие файлы не перезаписываются.',
    );
    return;
  }
  if (
    !['init', 'status', 'report', 'guide', 'wizard', 'audit'].includes(command)
  )
    throw new Error('INVALID_COMMAND');
  const allowed = {
    init: ['--mode', '--state'],
    status: ['--state', '--json', '--require-ready'],
    report: ['--state', '--output'],
    guide: ['--mode', '--output'],
    wizard: ['--output'],
    audit: ['--mode', '--json', '--output', '--require-pass'],
  }[command];
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i];
    if (!allowed.includes(key) || key in options)
      throw new Error('INVALID_ARGUMENTS');
    if (['--json', '--require-ready', '--require-pass'].includes(key))
      options[key] = true;
    else {
      const value = rest[++i];
      if (!value || value.startsWith('--'))
        throw new Error('INVALID_ARGUMENTS');
      options[key] = value;
    }
  }
  const plan = JSON.parse(
    await readFile(path.join(root, 'onboarding/checklist.json'), 'utf8'),
  );
  const statePath = path.resolve(
    options['--state'] || '.northstar-launch/state.json',
  );
  // Never write an owner's passport/report into the engine's published assets.
  const safeOutput = (filename) => {
    const resolved = path.resolve(filename);
    const parts = resolved.replaceAll('\\', '/').toLowerCase().split('/');
    if (
      parts.some((p) => ['public', 'dist', '.git', 'node_modules'].includes(p))
    )
      throw new Error('UNSAFE_OUTPUT');
    return resolved;
  };
  const writeNew = async (filename, content) => {
    const target = safeOutput(filename);
    safeOutput(
      path.join(await realpath(path.dirname(target)), path.basename(target)),
    );
    const file = await open(target, 'wx', 0o600);
    try {
      await file.writeFile(content);
    } finally {
      await file.close();
    }
  };
  if (command === 'audit') {
    const report = await auditLaunch(root, options['--mode'] || 'lite');
    const content = options['--json']
      ? JSON.stringify(report, null, 2) + '\n'
      : auditMarkdown(report);
    if (options['--output']) await writeNew(options['--output'], content);
    else console.log(content);
    // Strict source gate: manual checks remain explicit, never become a launch approval.
    if (
      report.summary.fail ||
      (options['--require-pass'] && report.summary.warn)
    )
      process.exitCode = 1;
    return;
  }
  if (command === 'init') {
    const state = createPassport(plan, options['--mode'] || 'lite');
    safeOutput(statePath);
    if (!options['--state'])
      await mkdir('.northstar-launch', { recursive: true });
    await writeNew(statePath, serializePassport(plan, state));
    console.log(
      'Паспорт создан. Заполняйте ответы, статусы и доказательства; секреты не сохраняйте.',
    );
    return;
  }
  if (command === 'wizard') {
    if (!options['--output']) throw new Error('OUTPUT_REQUIRED');
    await writeNew(options['--output'], await wizardHtml());
    console.log(
      'Автономный мастер создан. Откройте HTML в браузере и выберите JSON-паспорт; ответы в HTML не встроены.',
    );
    return;
  }
  if (command === 'guide') {
    if (!options['--output']) throw new Error('OUTPUT_REQUIRED');
    await writeNew(
      options['--output'],
      launchMarkdown(plan, createPassport(plan, options['--mode'] || 'lite')),
    );
    console.log('Чеклист с вопросами и графом создан.');
    return;
  }
  const handle = await open(statePath, 'r');
  let state;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > PASSPORT_MAX_BYTES)
      throw new Error('INVALID_STATE');
    state = JSON.parse(await handle.readFile('utf8'));
  } finally {
    await handle.close();
  }
  const report = evaluatePassport(plan, state);
  if (command === 'report') {
    if (!options['--output']) throw new Error('OUTPUT_REQUIRED');
    await writeNew(options['--output'], launchMarkdown(plan, state));
    console.log(
      'Отчёт со списком и графом создан; ответы и доказательства не экспортированы.',
    );
  } else {
    console.log(
      options['--json']
        ? JSON.stringify(report, null, 2)
        : `Закрыто ${report.completed}/${report.total} (${report.percent}%). Готов: ${report.ready ? 'да, по паспорту' : 'нет'}. Следующие шаги: ${report.next.join(', ') || 'нет'}.`,
    );
    if (options['--require-ready'] && !report.ready) process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url))
  main().catch(() => {
    console.error(
      process.argv[2] === 'audit'
        ? 'Проверка не завершена. Проверьте режим lite/standard, аргументы и новый путь вывода вне public/dist. Существующий отчёт не перезаписывается; содержимое входных файлов скрыто.'
        : 'Паспорт не обработан. Проверьте команду, схему, ответы/доказательства и новый путь вывода вне public/dist. Существующие файлы не перезаписываются. Содержимое и секреты не выводятся.',
    );
    process.exitCode = 1;
  });
