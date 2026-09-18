import type { ContentActor } from './access-policy';

export type ChatFileView = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  available?: boolean;
  downloadUrl: string | null;
};
export function chatFileView(
  actor: ContentActor,
  file: {
    id: string;
    userId: string | null;
    filename: string;
    contentType: string;
    size: number;
    status: string;
  } | null,
): ChatFileView | null {
  if (
    !file ||
    (actor.tokenId &&
      !actor.scopes?.some((s) => s === '*' || s === 'files:read'))
  )
    return null;
  if (file.userId !== actor.id && !['owner', 'admin'].includes(actor.role))
    return null;
  const available = file.status === 'uploaded';
  return {
    id: file.id,
    filename: available ? file.filename : 'Файл недоступен',
    contentType: available ? file.contentType : '',
    size: available ? file.size : 0,
    available,
    downloadUrl: available ? `/api/files/${file.id}/download` : null,
  };
}

export function chatFileInput(body: Record<string, unknown>) {
  if (
    Object.keys(body).some(
      (key) =>
        ![
          'message',
          'conversationId',
          'fileId',
          'confirmFile',
          'fileProvider',
        ].includes(key),
    )
  )
    throw new Error('Неизвестное поле сообщения');
  if (body.fileId === undefined) {
    if (body.confirmFile !== undefined || body.fileProvider !== undefined)
      throw new Error('Подтверждение файла требует fileId');
    return null;
  }
  if (
    typeof body.fileId !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(body.fileId)
  )
    throw new Error('Некорректный идентификатор файла');
  if (
    body.confirmFile !== true ||
    typeof body.fileProvider !== 'string' ||
    !['openai', 'xai'].includes(body.fileProvider)
  )
    throw new Error('Подтвердите передачу файла выбранному AI-провайдеру');
  return { id: body.fileId, provider: body.fileProvider as 'openai' | 'xai' };
}
export function canAnalyzeFile(
  actor: ContentActor | null,
  ownerId: string | null,
) {
  return (
    !!actor &&
    !actor.tokenId &&
    ['owner', 'admin', 'customer'].includes(actor.role) &&
    actor.id === ownerId
  );
}
export function bytesBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function historyContent(content: string, fileId: string | null) {
  return fileId
    ? `${content}\n[К этому сообщению прикреплялся файл. Его содержимое на текущем ходе не передано.]`
    : content;
}
