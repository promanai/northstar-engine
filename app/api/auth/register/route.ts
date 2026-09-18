import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { createSession, hashPassword, publicUser } from '@/lib/auth';
import { digest, textValue } from '@/lib/security-policy';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 8192);
    await limitRequest(request, 'register', 10, 3600);
    if (
      !textValue(body.email, 254, true) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
      !textValue(body.password, 256, true) ||
      body.password.length < 8
    )
      throw new RequestFailure(
        'Укажите корректный email и пароль от 8 до 256 символов',
      );
    for (const key of ['firstName', 'lastName', 'phone'])
      if (body[key] !== undefined && !textValue(body[key], 120))
        throw new RequestFailure('Некорректные контактные данные');
    const db = getDb();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .limit(1)
      .get();
    const matchesSetupToken = Boolean(
      env.INITIAL_ADMIN_TOKEN &&
        env.INITIAL_ADMIN_TOKEN.length >= 32 &&
        textValue(body.setupToken, 256, true) &&
        (await digest(body.setupToken)) ===
          (await digest(env.INITIAL_ADMIN_TOKEN)),
    );

    if (!existing) {
      if (!env.INITIAL_ADMIN_TOKEN || env.INITIAL_ADMIN_TOKEN.length < 32)
        throw new RequestFailure(
          'Первичная настройка закрыта. Владелец должен задать INITIAL_ADMIN_TOKEN длиной от 32 символов.',
          503,
        );
      if (!matchesSetupToken)
        throw new RequestFailure(
          'Для первого администратора нужен установочный код владельца',
          403,
        );
    }
    const now = new Date();
    const user = {
      id: crypto.randomUUID(),
      email: body.email.trim().toLowerCase(),
      passwordHash: await hashPassword(body.password),
      firstName: (body.firstName as string | undefined)?.trim() || null,
      lastName: (body.lastName as string | undefined)?.trim() || null,
      phone: (body.phone as string | undefined)?.trim() || null,
      role: !existing || matchesSetupToken ? 'admin' : 'customer',
      createdAt: now,
      updatedAt: now,
    };
    if (!existing) {
      // One atomic statement: two concurrent installations cannot create two initial admins.
      const result = await env.DB.prepare(
        "INSERT INTO users (id,email,password_hash,first_name,last_name,phone,role,created_at,updated_at) SELECT ?,?,?,?,?,?,'admin',?,? WHERE NOT EXISTS (SELECT 1 FROM users)",
      )
        .bind(
          user.id,
          user.email,
          user.passwordHash,
          user.firstName,
          user.lastName,
          user.phone,
          Math.floor(now.getTime() / 1000),
          Math.floor(now.getTime() / 1000),
        )
        .run();
      if (result.meta.changes !== 1)
        throw new RequestFailure(
          'Сайт уже настроен. Войдите или зарегистрируйтесь как клиент.',
          409,
        );
    } else {
      try {
        await db.insert(users).values(user);
      } catch (error) {
        if (String(error).includes('UNIQUE'))
          throw new RequestFailure(
            'Пользователь с таким email уже существует',
            409,
          );
        throw error;
      }
    }
    const session = await createSession(user.id, request);
    return Response.json(
      { user: publicUser(user), mode: 'registered' },
      {
        status: 201,
        headers: { 'set-cookie': session.header, 'cache-control': 'no-store' },
      },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
