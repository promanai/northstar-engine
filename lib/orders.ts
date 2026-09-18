import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { orders, orderEvents, products, users } from '@/db/schema';
import { digest, textValue } from '@/lib/security-policy';
import { RequestFailure } from '@/lib/request-security';
import { allowedTransition, isOwner, paymentLink } from '@/lib/commerce-policy';

type User = { id: string; role: string };
export function publicOrder(row: typeof orders.$inferSelect) {
  const {
    requestKey: _key,
    requestHash: _hash,
    mutationId: _mutation,
    ...safe
  } = row;
  return { ...safe, paymentUrl: paymentLink(row.paymentUrl) };
}
export async function findOrder(id: string, user: User) {
  const row = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();
  if (!row || (!isOwner(user) && row.customerId !== user.id))
    throw new RequestFailure('Заказ не найден', 404);
  return row;
}
export async function listOrders(user: User, mine = false) {
  const rows = await getDb()
    .select()
    .from(orders)
    .where(!mine && isOwner(user) ? undefined : eq(orders.customerId, user.id))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(200);
  return rows.map(publicOrder);
}
export async function orderDetail(id: string, user: User) {
  const row = await findOrder(id, user);
  const events = await getDb()
    .select({
      id: orderEvents.id,
      status: orderEvents.status,
      note: orderEvents.note,
      createdAt: orderEvents.createdAt,
    })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, id))
    .orderBy(
      asc(orderEvents.createdAt),
      sql`CASE ${orderEvents.status} WHEN 'pending' THEN 0 WHEN 'refunded' THEN 2 ELSE 1 END`,
      asc(orderEvents.id),
    );
  return { order: publicOrder(row), events };
}
export async function createOrder(
  user: User,
  body: Record<string, unknown>,
  key: unknown,
) {
  if (!textValue(key, 128, true) || !/^[a-zA-Z0-9_-]{16,128}$/.test(key))
    throw new RequestFailure(
      'Требуется Idempotency-Key: 16–128 букв, цифр, _ или -',
    );
  if (!textValue(body.productId, 128, true))
    throw new RequestFailure('Укажите товар или услугу');
  const quantity = body.quantity ?? 1;
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  )
    throw new RequestFailure('Количество должно быть целым числом от 1 до 99');
  if (body.customerNote !== undefined && !textValue(body.customerNote, 2000))
    throw new RequestFailure('Комментарий не должен превышать 2000 символов');
  if (
    body.customerId !== undefined &&
    (!textValue(body.customerId, 128, true) ||
      (!isOwner(user) && body.customerId !== user.id))
  )
    throw new RequestFailure('Нельзя оформить заказ за другого клиента', 403);
  for (const field of [
    'amount',
    'price',
    'currency',
    'status',
    'paymentUrl',
    'paymentProvider',
  ])
    if (body[field] !== undefined)
      throw new RequestFailure('Цена и параметры оплаты определяются сервером');
  const customerId =
    typeof body.customerId === 'string' ? body.customerId : user.id;
  const customerNote =
    typeof body.customerNote === 'string' ? body.customerNote.trim() : null;
  const requestKey = await digest(`${user.id}:${key}`);
  const requestHash = await digest(
    JSON.stringify([body.productId, quantity, customerId, customerNote]),
  );
  const db = getDb();
  const existing = await db
    .select()
    .from(orders)
    .where(eq(orders.requestKey, requestKey))
    .get();
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new RequestFailure(
        'Этот ключ уже использован для другого заказа',
        409,
      );
    return { order: publicOrder(existing), replayed: true };
  }
  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, body.productId), eq(products.active, true)))
    .get();
  if (!product) throw new RequestFailure('Товар или услуга недоступны', 404);
  if (
    !Number.isSafeInteger(product.price) ||
    product.price < 0 ||
    !Number.isSafeInteger(product.price * quantity) ||
    !/^[A-Z]{3}$/.test(product.currency)
  )
    throw new RequestFailure('Цена товара настроена некорректно', 409);
  if (
    !(await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, customerId))
      .get())
  )
    throw new RequestFailure('Клиент не найден', 404);
  const now = new Date();
  const id = crypto.randomUUID();
  // Unique request key and creation event commit together. Concurrent retries insert only once.
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO orders (id,customer_id,product_id,product_title,unit_price,quantity,amount,currency,status,payment_provider,customer_note,request_key,request_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING",
    ).bind(
      id,
      customerId,
      product.id,
      product.title,
      product.price,
      quantity,
      product.price * quantity,
      product.currency,
      env.PAYMENT_PROVIDER_URL ? 'external' : 'manual',
      customerNote,
      requestKey,
      requestHash,
      Math.floor(now.getTime() / 1000),
      Math.floor(now.getTime() / 1000),
    ),
    env.DB.prepare(
      "INSERT INTO order_events (id,order_id,actor_id,status,note,created_at) SELECT ?,id,?,status,'Заказ создан',? FROM orders WHERE id = ?",
    ).bind(id, user.id, Math.floor(now.getTime() / 1000), id),
  ]);
  const saved = await db
    .select()
    .from(orders)
    .where(eq(orders.requestKey, requestKey))
    .get();
  if (!saved) throw new RequestFailure('Не удалось сохранить заказ', 503);
  if (saved.requestHash !== requestHash)
    throw new RequestFailure(
      'Этот ключ уже использован для другого заказа',
      409,
    );
  return { order: publicOrder(saved), replayed: saved.id !== id };
}
export async function changeOrder(
  id: string,
  user: User,
  body: Record<string, unknown>,
  provider = false,
  eventId?: string,
) {
  const row = await findOrder(id, user);
  if (!textValue(body.status, 20, true) || !Number.isInteger(body.revision))
    throw new RequestFailure('Укажите status и revision');
  if (body.paymentUrl !== undefined)
    throw new RequestFailure(
      'Платёжную ссылку создаёт только платёжный адаптер',
    );
  if (
    !isOwner(user) &&
    !(body.status === 'cancelled' && row.paymentProvider === 'manual')
  )
    throw new RequestFailure('Недостаточно прав', 403);
  if (row.paymentProvider !== 'manual' && !provider)
    throw new RequestFailure(
      'Статус онлайн-оплаты изменяется только подтверждением провайдера',
      409,
    );
  if (!allowedTransition(row.status, body.status))
    throw new RequestFailure('Этот переход статуса запрещён', 409);
  if (row.revision !== body.revision)
    throw new RequestFailure('Заказ изменился. Обновите список', 409);
  const mutationId = eventId ?? crypto.randomUUID();
  const note = provider
    ? 'Подтверждение платёжного адаптера'
    : body.status === 'cancelled'
      ? 'Заказ отменён'
      : body.status === 'paid'
        ? 'Получение оплаты отмечено владельцем вручную'
        : 'Выполненный возврат отмечен владельцем вручную';
  const result = await env.DB.batch([
    env.DB.prepare(
      'UPDATE orders SET status = ?, revision = revision + 1, mutation_id = ?, updated_at = ? WHERE id = ? AND revision = ? AND status = ?',
    ).bind(
      body.status,
      mutationId,
      Math.floor(Date.now() / 1000),
      id,
      row.revision,
      row.status,
    ),
    env.DB.prepare(
      'INSERT INTO order_events (id,order_id,actor_id,status,note,created_at) SELECT ?,id,?,status,?,? FROM orders WHERE id = ? AND mutation_id = ?',
    ).bind(
      mutationId,
      user.id,
      note,
      Math.floor(Date.now() / 1000),
      id,
      mutationId,
    ),
  ]);
  if (result[0].meta.changes !== 1)
    throw new RequestFailure('Заказ изменился. Обновите список', 409);
  return orderDetail(id, user);
}
export async function checkoutOrder(id: string, user: User) {
  const row = await findOrder(id, user);
  if (row.status !== 'pending')
    throw new RequestFailure('Заказ уже оплачен или закрыт', 409);
  if (row.paymentProvider !== 'external' || !env.PAYMENT_PROVIDER_URL)
    throw new RequestFailure(
      'Онлайн-оплата не подключена. Свяжитесь с консультантом',
      409,
    );
  if (row.paymentUrl && paymentLink(row.paymentUrl))
    return { order: publicOrder(row) };
  const endpoint = paymentLink(env.PAYMENT_PROVIDER_URL);
  if (!endpoint)
    throw new RequestFailure('Платёжный адаптер настроен некорректно', 503);
  // Adapter MUST implement this stable idempotency key, including concurrent calls.
  let data: { paymentUrl?: string };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': row.id,
        ...(env.PAYMENT_PROVIDER_TOKEN
          ? { authorization: `Bearer ${env.PAYMENT_PROVIDER_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        orderId: row.id,
        amount: row.amount,
        currency: row.currency,
        product: { id: row.productId, title: row.productTitle },
        customerId: row.customerId,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error();
    data = (await response.json()) as typeof data;
    if (!paymentLink(data.paymentUrl)) throw new Error();
  } catch {
    throw new RequestFailure(
      'Не удалось получить ссылку оплаты. Заказ сохранён, повторите позже',
      502,
    );
  }
  await getDb()
    .update(orders)
    .set({ paymentUrl: paymentLink(data.paymentUrl), updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.status, 'pending')));
  const current = await findOrder(id, user);
  if (current.status !== 'pending')
    throw new RequestFailure('Статус заказа уже изменился', 409);
  return { order: publicOrder(current) };
}
