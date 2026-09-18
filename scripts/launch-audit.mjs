// Local source inspection only: never imports configuration as code or opens owner passports.
import { open, realpath, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const within = (root, target) => {
  const relative = path.relative(root, target);
  return (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
};
async function readLocal(root, relative, maxBytes) {
  const requested = path.resolve(root, relative);
  const target = await realpath(requested);
  // Reject links even within the checkout: public assets must not alias private state.
  const samePath = (a, b) =>
    process.platform === 'win32'
      ? a.toLowerCase() === b.toLowerCase()
      : a === b;
  if (!within(root, target) || !samePath(requested, target))
    throw new Error('UNSAFE_INPUT');
  const handle = await open(target, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes)
      throw new Error('INVALID_INPUT');
    const buffer = Buffer.alloc(maxBytes + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        size,
        buffer.length - size,
        null,
      );
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > maxBytes) throw new Error('INVALID_INPUT');
    return buffer.subarray(0, size);
  } finally {
    await handle.close();
  }
}
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const slug = (value) =>
  typeof value === 'string' &&
  /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value);
const reserved = (value) =>
  /^\/(?:api|admin|account|login|catalog|cdn-cgi|robots\.txt|sitemap\.xml|llms(?:-full)?\.txt)(?:\/|$)/.test(
    value,
  );

export async function auditLaunch(root, mode = 'lite') {
  if (!['lite', 'standard'].includes(mode)) throw new Error('INVALID_MODE');
  root = await realpath(root);
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const inputs = [];
  let complete = true;
  // Digest the same byte buffers used by checks, not a second read after evaluation.
  const inspect = async (slot, directory, relative, maxBytes) => {
    try {
      const bytes = await readLocal(directory, relative, maxBytes);
      inputs.push([slot, sha(bytes)]);
      return bytes.toString('utf8');
    } catch (error) {
      complete = false;
      inputs.push([slot, null]);
      throw error;
    }
  };
  const rules = sha(await readFile(new URL(import.meta.url)));
  const checks = [];
  const add = (id, taskId, status, title, action) =>
    checks.push({ id, taskId, status, title, action });
  let config;
  try {
    config = JSON.parse(
      await inspect('config', root, 'site.config.json', 2 * 1024 * 1024),
    );
    if (!object(config)) throw new Error('INVALID_CONFIG');
    add(
      'config.readable',
      'scope',
      'pass',
      'Конфигурация читается как JSON',
      'Проверен только локальный файл, не настройки опубликованного Worker.',
    );
  } catch {
    add(
      'config.readable',
      'scope',
      'fail',
      'Конфигурация недоступна или повреждена',
      'Проверьте site.config.json: JSON-объект до 2 МиБ внутри проекта. Содержимое ошибки скрыто.',
    );
  }
  if (mode === 'standard') {
    add(
      'standard.runtime',
      'scope',
      'manual',
      'Рабочие данные Standard находятся в D1',
      'Проверьте бренд, страницы, каталог и настройки через авторизованную админку; локальный JSON их не подтверждает.',
    );
  } else if (config) {
    add(
      'brand.name',
      'brand',
      text(config.name, 100)
        ? /^northstar(?: engine)?$/i.test(config.name.trim())
          ? 'warn'
          : 'pass'
        : 'fail',
      'Название сайта',
      'Задайте согласованное название бизнеса в name, не оставляйте название движка.',
    );
    add(
      'seo.description',
      'seo',
      text(config.description, 320) ? 'pass' : 'warn',
      'Описание сайта',
      'Заполните description: непустое описание до 320 символов. Релевантность текста проверяет владелец.',
    );
    add(
      'brand.theme',
      'brand',
      ['northstar', 'editorial', 'ocean'].includes(config.theme)
        ? 'pass'
        : 'fail',
      'Поддерживаемый шаблон',
      'Выберите northstar, editorial или ocean; визуальную приёмку выполните отдельно.',
    );
    const pages = config.pages;
    const validPages =
      Array.isArray(pages) &&
      pages.length <= 500 &&
      pages.every(
        (p) =>
          object(p) &&
          slug(p.slug) &&
          !reserved(p.slug) &&
          text(p.title, 200) &&
          text(p.description, 320) &&
          text(p.text, 100000),
      ) &&
      new Set(pages.map((p) => p.slug)).size === pages.length;
    add(
      'pages.shape',
      'navigation',
      validPages ? 'pass' : 'fail',
      'Страницы и ЧПУ',
      'Нужен массив pages: уникальные пути /about или /help/contact, title, description, text. Пути системных разделов зарезервированы. Эта проверка использует консервативный формат ЧПУ.',
    );
    add(
      'pages.content',
      'content',
      validPages && pages.length > 0 ? 'pass' : 'warn',
      'Содержание страниц',
      'Добавьте страницы о бизнесе и условиях; наличие текста не подтверждает его качество или согласование.',
    );
    const products = config.products;
    const validProducts =
      Array.isArray(products) &&
      products.length <= 500 &&
      products.every(
        (p) =>
          object(p) &&
          text(p.id, 100) &&
          typeof p.slug === 'string' &&
          slug('/' + p.slug) &&
          !p.slug.includes('/') &&
          text(p.title, 200) &&
          ['service', 'product'].includes(p.kind) &&
          text(p.shortDescription, 1000) &&
          text(p.description, 100000) &&
          Number.isSafeInteger(p.price) &&
          p.price >= 0 &&
          typeof p.currency === 'string' &&
          /^[A-Z]{3}$/.test(p.currency) &&
          (p.active === undefined || typeof p.active === 'boolean'),
      ) &&
      new Set(products.map((p) => p.id)).size === products.length &&
      new Set(products.map((p) => p.slug)).size === products.length;
    add(
      'catalog.shape',
      'content',
      validProducts ? 'pass' : 'fail',
      'Карточки каталога',
      'Проверьте уникальные id/slug, kind service/product, описания, целую неотрицательную цену в минимальных единицах валюты и трёхбуквенный currency.',
    );
    add(
      'catalog.visible',
      'content',
      validProducts && products.some((p) => p.active !== false)
        ? 'pass'
        : 'warn',
      'Публичные товары и услуги',
      'Если каталог нужен бизнесу, добавьте хотя бы одну активную карточку. Пустой каталог допустим только по решению владельца.',
    );
    const background = config.backgroundImage;
    if (background === '' || background === undefined) {
      add(
        'background.asset',
        'brand',
        'pass',
        'Фон без изображения',
        'Изображение необязательно; оцените читаемость выбранной темы.',
      );
    } else {
      let status = 'fail';
      try {
        if (
          !text(background, 2048) ||
          background.includes('\\') ||
          Array.from(background).some((c) => c.charCodeAt(0) <= 32)
        )
          throw new Error('INVALID_URL');
        const url = new URL(background, 'https://local.invalid');
        if (url.username || url.password || url.protocol !== 'https:')
          throw new Error('INVALID_URL');
        if (background.startsWith('/') && !background.startsWith('//')) {
          const publicRoot = path.join(root, 'public');
          const decoded = decodeURIComponent(url.pathname);
          if (decoded.includes('\\') || decoded.includes('\0'))
            throw new Error('INVALID_URL');
          const asset = await inspect(
            'background',
            publicRoot,
            '.' + decoded,
            8 * 1024 * 1024,
          );
          status = asset.length > 0 ? 'pass' : 'fail';
        } else if (background.startsWith('https://')) status = 'manual';
      } catch {
        /* Do not echo paths, URL credentials or file contents. */
      }
      add(
        'background.asset',
        'brand',
        status,
        'Фоновое изображение',
        'Для локального URL проверяется непустой файл public до 8 МиБ. Внешние HTTPS-изображения не запрашиваются; их доступность и вид проверьте в браузере.',
      );
    }
  }
  try {
    const icon = await inspect(
      'favicon',
      root,
      'public/favicon.svg',
      256 * 1024,
    );
    if (!/<svg(?:\s|>)/i.test(icon)) throw new Error('INVALID_ICON');
    add(
      'favicon.asset',
      'favicon',
      'pass',
      'Файл favicon.svg найден',
      'Подтверждено наличие SVG-разметки, не её безопасность, рендеринг или соответствие бренду.',
    );
  } catch {
    add(
      'favicon.asset',
      'favicon',
      'warn',
      'Стандартный favicon.svg не найден или не читается',
      'Добавьте public/favicon.svg либо проверьте альтернативный значок и его подключение вручную.',
    );
  }
  add(
    'favicon.browser',
    'favicon',
    'manual',
    'Значок во вкладке',
    'Откройте сайт и проверьте подключение favicon, читаемость на 16/32 px и соответствие бренду.',
  );
  for (const [id, file, title] of [
    ['seo.robots', 'app/robots.txt/route.ts', 'Исходник robots.txt'],
    ['seo.sitemap', 'app/sitemap.xml/route.ts', 'Исходник sitemap.xml'],
    ['seo.markdown', 'app/llms.txt/route.ts', 'Исходник llms.txt'],
  ]) {
    let present = false;
    try {
      present = (await inspect(id, root, file, 256 * 1024)).trim().length > 0;
    } catch {
      /* fixed report only */
    }
    add(
      id,
      'seo',
      present ? 'pass' : 'warn',
      title,
      'Это наличие исходника, не проверка HTTP-ответа. После сборки проверьте содержимое и публичную доступность маршрута.',
    );
  }
  for (const [id, taskId, title, action] of [
    [
      'domain.live',
      'domain',
      'Домен, DNS и HTTPS',
      'Локальные файлы не доказывают привязку домена. Проверьте точный публичный адрес, DNS и сертификат отдельно.',
    ],
    [
      'ai.live',
      'ai_connection',
      'Реальный ответ ассистента',
      'Проверьте ключ, выбранную модель, лимиты и ответ в рабочем окружении. Этот аудит не читает секреты и не вызывает AI.',
    ],
    [
      'business.acceptance',
      'launch',
      'Приёмка владельцем',
      'Согласуйте содержание, поведение ассистента и путь клиента. Внесите фактические доказательства в паспорт самостоятельно.',
    ],
  ])
    add(id, taskId, 'manual', title, action);
  const summary = Object.fromEntries(
    ['pass', 'warn', 'fail', 'manual'].map((status) => [
      status,
      checks.filter((c) => c.status === status).length,
    ]),
  );
  return {
    version: 2,
    kind: 'launch-source-audit',
    generatedAt: new Date().toISOString(),
    source: {
      scope: 'checked-inputs-v1',
      algorithm: 'sha256',
      digest: sha(JSON.stringify({ mode, rules, inputs })),
      complete,
      files: inputs.filter(([, digest]) => digest !== null).length,
    },
    mode,
    summary,
    checks,
    boundaries: [
      'Локальные исходники, не опубликованный сайт',
      'Без сети, секретов, D1 и паспорта владельца',
      'Статусы чеклиста не изменяются; оценка готовности в процентах не вычисляется',
    ],
  };
}

export function auditMarkdown(report) {
  const labels = {
    pass: 'Проверено',
    warn: 'Внимание',
    fail: 'Ошибка',
    manual: 'Проверить вручную',
  };
  return [
    '# Проверка подготовки сайта',
    '',
    `Режим: ${report.mode}. Исходники — не доказательство готовности рабочего сайта.`,
    '',
    ...(report.version === 2
      ? [
          `Дата локальной проверки: ${report.generatedAt}`,
          '',
          `Отпечаток проверенных входов (SHA-256): ${report.source.digest}`,
          '',
          `Все запрошенные файлы прочитаны: ${report.source.complete ? 'да' : 'нет'}. Метка не является подписью, ID клиента или хешем всего сайта.`,
          '',
        ]
      : []),
    ...report.checks.flatMap((c) => [
      `## ${labels[c.status]}: ${c.title}`,
      '',
      `Шаг паспорта: \`${c.taskId}\` · Проверка: \`${c.id}\``,
      '',
      c.action,
      '',
    ]),
    ...report.boundaries.map((b) => `- ${b}`),
    '',
  ].join('\n');
}
