import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { chatRequests, conversations, messages, files } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { chatFileView } from '@/lib/chat-file-policy';
import { chatRequestId } from '@/lib/chat-request';
import { chatRequestKey } from '@/lib/chat-request-policy';
import { canAccessConversation } from '@/lib/security-policy';
import {
  failureResponse,
  guestIdentity,
  limitRequest,
  RequestFailure,
} from '@/lib/request-security';

// Read-only recovery: never submits/retries an AI operation or changes its lease.
export async function GET(request: Request) {
  try {
    if (
      (request.headers.has('origin') &&
        request.headers.get('origin') !== new URL(request.url).origin) ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new RequestFailure('Межсайтовый запрос запрещён', 403);
    if (request.headers.has('authorization'))
      throw new RequestFailure('Требуется браузерная сессия', 401);
    let key: string;
    try {
      key = chatRequestKey(request.headers.get('idempotency-key'));
    } catch (error) {
      throw new RequestFailure((error as Error).message);
    }
    const user = await getSessionUser(request),
      guest = await guestIdentity(request);
    if (user && !['owner', 'admin', 'customer'].includes(user.role))
      throw new RequestFailure('Недостаточно прав', 403);
    if (!user && !guest.existingHash)
      throw new RequestFailure(
        'Войдите в прежний аккаунт или используйте прежнюю гостевую сессию',
        401,
      );
    await limitRequest(
      request,
      'chat-status',
      60,
      60,
      user?.id ?? guest.existingHash!,
    );
    const db = getDb();
    const row = await db
      .select()
      .from(chatRequests)
      .where(
        eq(
          chatRequests.id,
          await chatRequestId(user?.id, guest.existingHash, key),
        ),
      )
      .get();
    if (!row)
      throw new RequestFailure('Запрос не найден в текущей сессии', 404);
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, row.conversationId))
      .get();
    if (
      conversation &&
      !canAccessConversation(conversation, user, guest.existingHash)
    )
      throw new RequestFailure('Запрос не найден в текущей сессии', 404);
    const state =
      row.state === 'pending' && row.leaseUntil <= Date.now()
        ? 'unknown'
        : row.state;
    const headers = {
      'cache-control': 'private, no-store',
      'x-chat-request-state': state,
      ...(state === 'pending' ? { 'retry-after': '3' } : {}),
    };
    if (state === 'completed') {
      if (!conversation)
        throw new RequestFailure('Диалог больше недоступен', 404);
      const result = JSON.parse(row.response!);
      const records = await db
        .select({
          message: {
            id: messages.id,
            role: messages.role,
            content: messages.content,
            createdAt: messages.createdAt,
          },
          file: {
            id: files.id,
            userId: files.userId,
            filename: files.filename,
            contentType: files.contentType,
            size: files.size,
            status: files.status,
          },
        })
        .from(messages)
        .leftJoin(files, eq(messages.fileId, files.id))
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            inArray(messages.role, ['user', 'assistant']),
          ),
        )
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(100);
      return Response.json(
        {
          state,
          conversationId: conversation.id,
          result: {
            message: result.message,
            assistant: result.assistant,
            mode: result.mode,
          },
          messages: records
            .reverse()
            .map(({ message, file }) => ({
              ...message,
              attachment: user ? chatFileView(user, file) : null,
            })),
        },
        { headers },
      );
    }
    const error =
      state === 'failed' ? JSON.parse(row.response!).body?.error : undefined;
    return Response.json(
      {
        state,
        ...(conversation ? { conversationId: conversation.id } : {}),
        ...(state === 'failed'
          ? {
              error:
                typeof error === 'string'
                  ? error
                  : 'Попытка завершилась ошибкой',
              responseStatus: row.httpStatus,
            }
          : {}),
      },
      { headers },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
