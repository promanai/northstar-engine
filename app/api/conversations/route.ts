import { isAdministrator } from '@/lib/access-policy';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { conversations, messages, files } from '@/db/schema';
import { getRequestUser } from '@/lib/auth';
import { failureResponse, RequestFailure } from '@/lib/request-security';
import { chatFileView } from '@/lib/chat-file-policy';

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    if (user.role !== 'customer' && !isAdministrator(user.role))
      throw new RequestFailure('Недостаточно прав', 403);
    const mine =
      user.role === 'customer' ||
      new URL(request.url).searchParams.get('scope') === 'mine';
    const rows = await getDb()
      .select()
      .from(conversations)
      .where(mine ? eq(conversations.customerId, user.id) : undefined)
      .orderBy(desc(conversations.updatedAt))
      .limit(mine ? 100 : 200);
    const withMessages = await Promise.all(
      rows.map(async (conversation) => {
        const records = await getDb()
          .select({
            message: messages,
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
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt), desc(messages.id))
          .limit(100);
        return {
          ...conversation,
          messages: records.reverse().map(({ message, file }) => {
            const { fileId: _fileId, ...publicMessage } = message;
            return { ...publicMessage, attachment: chatFileView(user, file) };
          }),
        };
      }),
    );
    return Response.json(
      { conversations: withMessages },
      { headers: { 'cache-control': 'private, no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
