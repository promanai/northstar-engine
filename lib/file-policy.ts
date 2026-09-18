export const fileLimit = 2 * 1024 * 1024;
export const multipartLimit = fileLimit + 16384;
export const fileAccept = '.png,.jpg,.jpeg,.webp,.pdf,.txt,.md';
export function validateStoredFile(
  name: unknown,
  mime: unknown,
  bytes: Uint8Array,
) {
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 160 ||
    name.includes('/') ||
    name.includes('\\')
  )
    throw new Error('Некорректное имя файла');
  for (const char of name)
    if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
      throw new Error('Управляющие символы в имени файла запрещены');
  if (!bytes.length || bytes.length > fileLimit)
    throw new Error('Файл должен быть от 1 байта до 2 МБ');
  const ext = name.split('.').at(-1)?.toLowerCase();
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/plain',
  };
  const contentType = Object.hasOwn(types, ext ?? '') ? types[ext!] : undefined;
  if (
    !contentType ||
    (mime &&
      mime !== contentType &&
      mime !== 'application/octet-stream' &&
      !(ext === 'md' && mime === 'text/markdown'))
  )
    throw new Error(
      'Разрешены PNG, JPEG, WebP, PDF и UTF-8 TXT/MD с соответствующим типом',
    );
  const starts = (...signature: number[]) =>
    signature.every((b, i) => bytes[i] === b);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  const valid =
    contentType === 'image/png'
      ? starts(137, 80, 78, 71, 13, 10, 26, 10)
      : contentType === 'image/jpeg'
        ? starts(255, 216, 255)
        : contentType === 'image/webp'
          ? ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP'
          : contentType === 'application/pdf'
            ? ascii(0, 5) === '%PDF-'
            : bytes.length <= 64000 && !bytes.includes(0);
  if (!valid)
    throw new Error('Содержимое не соответствует формату; TXT/MD — до 64 КБ');
  if (contentType === 'text/plain')
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return { filename: name.trim(), contentType, size: bytes.length };
}
export function uploadKey(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(value))
    throw new Error(
      'Требуется Idempotency-Key: 16–100 букв, цифр, дефисов или подчёркиваний',
    );
  return value;
}
export function fileDisposition(filename: string) {
  const encoded = encodeURIComponent(filename.toWellFormed()).replace(
    /['()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
  return `attachment; filename="download"; filename*=UTF-8''${encoded}`;
}
export function fileQuota(env: Record<string, unknown>) {
  const number = (key: string, fallback: number, max: number) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isSafeInteger(value) || value < 1 || value > max)
      throw new Error('Некорректная квота файлов');
    return value;
  };
  return {
    userBytes: number('FILES_USER_MAX_BYTES', 50 * 1024 * 1024, 2 ** 31 - 1),
    siteBytes: number('FILES_SITE_MAX_BYTES', 512 * 1024 * 1024, 2 ** 31 - 1),
    userCount: number('FILES_USER_MAX_COUNT', 50, 10000),
    siteCount: number('FILES_SITE_MAX_COUNT', 2000, 100000),
  };
}
