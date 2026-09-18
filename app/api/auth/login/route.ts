import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { createSession, publicUser, verifyPassword } from '@/lib/auth';
import { textValue } from '@/lib/security-policy';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 8192);
    await limitRequest(request, 'login', 10, 900);
    if (
      !textValue(body.email, 254, true) ||
      !textValue(body.password, 256, true)
    )
      throw new RequestFailure('Укажите email и пароль');
    const email = body.email.trim().toLowerCase();
    const user = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();
    if (
      !user?.passwordHash ||
      !(await verifyPassword(body.password, user.passwordHash))
    )
      throw new RequestFailure('Неверный email или пароль', 401);
    if (user.suspended)
      throw new RequestFailure('Аккаунт заблокирован. Обратитесь к администратору.', 403);
    const session = await createSession(user.id, request);
    return Response.json(
      { user: publicUser(user), mode: 'authenticated' },
      {
        headers: { 'set-cookie': session.header, 'cache-control': 'no-store' },
      },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
