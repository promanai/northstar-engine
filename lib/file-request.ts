import { fileLimit, multipartLimit, uploadKey } from '@/lib/file-policy';
import { RequestFailure } from '@/lib/request-security';
export async function readUpload(request: Request) {
  const origin = request.headers.get('origin');
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new RequestFailure('Межсайтовый запрос запрещён', 403);
  try {
    uploadKey(request.headers.get('idempotency-key'));
  } catch (error) {
    throw new RequestFailure((error as Error).message);
  }
  const type = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data\s*;/i.test(type))
    throw new RequestFailure('Требуется multipart/form-data', 415);
  if (Number(request.headers.get('content-length')) > multipartLimit)
    throw new RequestFailure('Максимальный размер запроса превышен', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestFailure('Требуется файл');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > multipartLimit) {
        await reader.cancel();
        throw new RequestFailure('Максимальный размер запроса превышен', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let form: FormData;
  try {
    form = await new Response(bytes, {
      headers: { 'content-type': type },
    }).formData();
  } catch {
    throw new RequestFailure('Некорректный multipart-запрос');
  }
  const entries = [...form.entries()];
  if (
    entries.length !== 1 ||
    entries[0][0] !== 'file' ||
    !(entries[0][1] instanceof File)
  )
    throw new RequestFailure('Требуется ровно одно поле file');
  const file = entries[0][1];
  if (file.size > fileLimit)
    throw new RequestFailure('Файл должен быть не больше 2 МБ', 413);
  return file;
}
