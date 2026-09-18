import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { passwordResetTokens, sessions, users } from '@/db/schema';
import { hashPassword } from '@/lib/auth';
import { limitRequest, RequestFailure } from '@/lib/request-security';
import { digest } from '@/lib/security-policy';

export async function requestPasswordReset(
  rawEmail: unknown,
  request: Request,
) {
  await limitRequest(request, 'pwd_reset_ip', 10, 3600);

  if (
    typeof rawEmail !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim()) ||
    rawEmail.length > 254
  ) {
    throw new RequestFailure('Укажите корректный адрес электронной почты');
  }

  const email = rawEmail.trim().toLowerCase();
  const db = getDb();
  const user = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    return {
      success: true,
      message: 'Если адрес зарегистрирован, код для сброса пароля отправлен.',
    };
  }

  const rawToken = `prt_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  const tokenHash = await digest(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  return {
    success: true,
    message: 'Если адрес зарегистрирован, код для сброса пароля отправлен.',
    resetToken: rawToken,
  };
}

export async function executePasswordReset(
  rawToken: unknown,
  rawPassword: unknown,
  request: Request,
) {
  await limitRequest(request, 'pwd_reset_attempt', 10, 900);

  if (typeof rawToken !== 'string' || !/^prt_[a-f0-9]{64}$/.test(rawToken.trim())) {
    throw new RequestFailure('Недействительный или устаревший код сброса пароля', 400);
  }

  if (typeof rawPassword !== 'string' || rawPassword.length < 8 || rawPassword.length > 128) {
    throw new RequestFailure('Пароль должен содержать от 8 до 128 символов', 400);
  }

  const token = rawToken.trim();
  const password = rawPassword;
  const tokenHash = await digest(token);
  const now = new Date();
  const db = getDb();

  const record = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .get();

  if (!record) {
    throw new RequestFailure('Ссылка для сброса пароля недействительна или её срок действия истёк', 400);
  }

  const passwordHash = await hashPassword(password);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, record.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, record.id));

  // Revoke all existing sessions so any compromised logins are immediately killed
  await db.delete(sessions).where(eq(sessions.userId, record.userId));

  return {
    success: true,
    message: 'Пароль успешно обновлён. Все активные сессии завершены. Войдите с новым паролем.',
  };
}
