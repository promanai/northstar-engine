import { saveSelfProfile } from '@/lib/customer-service';
import { checked } from '@/lib/assistant-service';
import {
  expectedRevision,
  recordFields,
  customerInput,
} from '@/lib/admin-policy';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import {
  createSession,
  getSessionUser,
  hashPassword,
  publicUser,
  verifyPassword,
} from '@/lib/auth';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { textValue } from '@/lib/security-policy';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user)
    return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  return Response.json({ user }, { headers: { 'cache-control': 'no-store' } });
}

export async function PATCH(request: Request) {
  try {
    const current = await getSessionUser(request);
    if (!current)
      return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
    type ProfileChange = {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    const raw = await readJson(request, 8192);
    await limitRequest(request, 'profile', 20, 900, current.id);
    for (const key of [
      'firstName',
      'lastName',
      'phone',
      'email',
      'currentPassword',
      'newPassword',
    ])
      if (
        raw[key] !== undefined &&
        !textValue(raw[key], key.includes('Password') ? 256 : 254)
      )
        throw new RequestFailure('Некорректные поля профиля');
    checked(() =>
      recordFields(raw, [
        'firstName',
        'lastName',
        'phone',
        'email',
        'currentPassword',
        'newPassword',
        'revision',
      ]),
    );
    const revision = checked(() => expectedRevision(raw.revision));
    if (revision !== current.revision)
      throw new RequestFailure(
        'Профиль уже изменён. Обновите данные перед сохранением.',
        409,
      );
    const contact = Object.fromEntries(
      Object.entries(raw).filter(([key]) =>
        ['email', 'firstName', 'lastName', 'phone'].includes(key),
      ),
    );
    if (Object.keys(contact).length) checked(() => customerInput(contact));
    const body = raw as ProfileChange;
    const email = body.email?.trim().toLowerCase();
    if (email && !email.includes('@'))
      return Response.json({ error: 'Некорректный email' }, { status: 400 });
    const passwordUpdate = body.currentPassword || body.newPassword;
    if (passwordUpdate) {
      if (
        !body.currentPassword ||
        !body.newPassword ||
        body.newPassword.length < 8
      )
        return Response.json(
          {
            error:
              'Для смены пароля укажите текущий пароль и новый пароль от 8 символов',
          },
          { status: 400 },
        );
      const stored = await getDb()
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, current.id))
        .get();
      if (
        !stored?.passwordHash ||
        !(await verifyPassword(body.currentPassword, stored.passwordHash))
      )
        return Response.json(
          { error: 'Текущий пароль указан неверно' },
          { status: 400 },
        );
    }
    const update: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      email?: string;
      passwordHash?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (body.firstName !== undefined)
      update.firstName = body.firstName.trim() || null;
    if (body.lastName !== undefined)
      update.lastName = body.lastName.trim() || null;
    if (body.phone !== undefined) update.phone = body.phone.trim() || null;
    if (email) update.email = email;
    if (body.newPassword)
      update.passwordHash = await hashPassword(body.newPassword);
    await saveSelfProfile(current.id, revision, update);
    const updated = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, current.id))
      .get();
    if (!updated) throw new RequestFailure('Профиль недоступен', 503);
    const user = publicUser(updated);
    let cookie: string | undefined;
    if (body.newPassword) {
      cookie = (await createSession(current.id, request)).header;
    }
    return Response.json(
      { user },
      {
        headers: {
          'cache-control': 'no-store',
          ...(cookie ? { 'set-cookie': cookie } : {}),
        },
      },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
