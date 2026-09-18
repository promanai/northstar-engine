import { env } from 'cloudflare:workers';
import { digest, textValue } from './security-policy';
import { RequestFailure } from './request-security';
import { scheduleBookingNotifications } from './booking-notifications';
import {
  instant,
  slotRange,
  validTimeZone,
  bookingExpectation,
  type BookingView,
  type SlotView,
  type ResourceView,
} from './booking-policy';

type User = { id: string; role: string };
export const bookingAdmin = (user: User | null) =>
  !!user && (user.role === 'owner' || user.role === 'admin');
function owner(user: User) {
  if (!bookingAdmin(user))
    throw new RequestFailure('Требуется администратор', 403);
}
function fields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new RequestFailure('Неизвестное или запрещённое поле');
}
function id(value: unknown) {
  if (!textValue(value, 128, true))
    throw new RequestFailure('Требуется идентификатор');
  return value.trim();
}
function revision(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new RequestFailure('Требуется целая revision >= 0');
  return value;
}
function policy<T>(run: () => T) {
  try {
    return run();
  } catch (e) {
    throw new RequestFailure((e as Error).message);
  }
}
const bookingColumns = `id, customer_id AS customerId, service, starts_at AS startsAt, ends_at AS endsAt, status, slot_id AS slotId, product_id AS productId, resource_name AS resourceName, time_zone AS timeZone, price, currency, customer_note AS customerNote, payment_status AS paymentStatus, hold_expires_at AS holdExpiresAt, (SELECT payment_url FROM booking_payment_intents pi WHERE pi.booking_id = bookings.id LIMIT 1) AS paymentUrl, revision`;
const slotColumns = `s.id, s.resource_id AS resourceId, s.product_id AS productId, s.starts_at AS startsAt, s.ends_at AS endsAt, s.available, s.revision, r.name AS resourceName, r.time_zone AS timeZone, p.title AS service, p.price, p.currency,
  EXISTS(SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND (b.status = 'confirmed' OR (b.status = 'pending_payment' AND b.hold_expires_at > CAST(strftime('%s','now') AS INTEGER)))) AS occupied`;
const slotJoins =
  'booking_slots s JOIN booking_resources r ON r.id = s.resource_id JOIN products p ON p.id = s.product_id';

export async function listSlots(
  input: Record<string, unknown>,
  managed = false,
) {
  await expireBookingHolds();
  const now = Math.floor(Date.now() / 1000);
  const from =
    input.from === undefined ? now : policy(() => instant(input.from));
  const to =
    input.to === undefined ? from + 7 * 86400 : policy(() => instant(input.to));
  if (to <= from || to - from > 31 * 86400)
    throw new RequestFailure('Окно поиска: от 1 секунды до 31 дня');
  const productId = input.productId === undefined ? null : id(input.productId);
  const rows = await env.DB.prepare(`SELECT ${slotColumns} FROM ${slotJoins}
    WHERE s.starts_at >= ? AND s.starts_at < ? AND (? IS NULL OR s.product_id = ?)
    ${managed ? '' : "AND s.starts_at > ? AND s.available = 1 AND r.active = 1 AND p.active = 1 AND p.kind = 'service' AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND (b.status = 'confirmed' OR (b.status = 'pending_payment' AND b.hold_expires_at > CAST(strftime('%s','now') AS INTEGER))))"}
    ORDER BY s.starts_at, s.id LIMIT 201`)
    .bind(
      ...(managed
        ? [from, to, productId, productId]
        : [from, to, productId, productId, now]),
    )
    .all<SlotView>();
  return {
    slots: rows.results.slice(0, 200),
    truncated: rows.results.length > 200,
    from: new Date(from * 1000).toISOString(),
    to: new Date(to * 1000).toISOString(),
  };
}
export async function resources(user: User) {
  owner(user);
  return (
    await env.DB.prepare(
      'SELECT id, name, time_zone AS timeZone, active, revision FROM booking_resources ORDER BY name, id LIMIT 200',
    ).all<ResourceView>()
  ).results;
}
export async function schedule(user: User, body: Record<string, unknown>) {
  owner(user);
  const now = Math.floor(Date.now() / 1000);
  if (body.action === 'create_resource') {
    fields(body, ['action', 'name', 'timeZone']);
    if (!textValue(body.name, 120, true) || !validTimeZone(body.timeZone))
      throw new RequestFailure(
        'Укажите имя ресурса и действительный часовой пояс IANA',
      );
    const resourceId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO booking_resources (id, name, time_zone, active, revision, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?)',
    )
      .bind(resourceId, body.name.trim(), body.timeZone, now, now)
      .run();
    return { id: resourceId };
  }
  if (body.action === 'set_resource') {
    fields(body, ['action', 'id', 'active', 'revision']);
    if (typeof body.active !== 'boolean')
      throw new RequestFailure('Требуется active');
    const row = await env.DB.prepare(
      'UPDATE booking_resources SET active = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING id',
    )
      .bind(Number(body.active), now, id(body.id), revision(body.revision))
      .first();
    if (!row)
      throw new RequestFailure(
        'Ресурс изменён или не найден. Обновите список.',
        409,
      );
    return row;
  }
  if (body.action === 'create_slot') {
    fields(body, ['action', 'resourceId', 'productId', 'startsAt', 'endsAt']);
    const resourceId = id(body.resourceId),
      productId = id(body.productId);
    const { start, end } = policy(() =>
      slotRange(body.startsAt, body.endsAt, now),
    );
    const slotId = crypto.randomUUID();
    // Check and insert in one SQL statement. All slots, including closed slots, reserve the schedule geometry.
    const row =
      await env.DB.prepare(`INSERT INTO booking_slots (id, resource_id, product_id, starts_at, ends_at, available, revision, created_at, updated_at)
      SELECT ?, r.id, p.id, ?, ?, 1, 0, ?, ? FROM booking_resources r JOIN products p ON p.id = ?
      WHERE r.id = ? AND r.active = 1 AND p.active = 1 AND p.kind = 'service'
      AND NOT EXISTS(SELECT 1 FROM booking_slots s WHERE s.resource_id = r.id AND s.starts_at < ? AND s.ends_at > ?)
      RETURNING id`)
        .bind(slotId, start, end, now, now, productId, resourceId, end, start)
        .first();
    if (!row)
      throw new RequestFailure(
        'Слот пересекается с существующим либо ресурс/услуга недоступны',
        409,
      );
    return row;
  }
  if (body.action === 'set_slot') {
    fields(body, ['action', 'id', 'available', 'revision']);
    if (typeof body.available !== 'boolean')
      throw new RequestFailure('Требуется available');
    const row = await env.DB.prepare(
      'UPDATE booking_slots SET available = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING id',
    )
      .bind(Number(body.available), now, id(body.id), revision(body.revision))
      .first();
    if (!row)
      throw new RequestFailure(
        'Слот изменён или не найден. Обновите список.',
        409,
      );
    return row;
  }
  throw new RequestFailure('Неизвестное действие расписания');
}
export async function listBookings(user: User, mine = false) {
  await expireBookingHolds();
  const rows = await env.DB.prepare(
    `SELECT ${bookingColumns} FROM bookings ${!mine && bookingAdmin(user) ? '' : 'WHERE customer_id = ?'} ORDER BY starts_at DESC, id LIMIT 201`,
  )
    .bind(...(!mine && bookingAdmin(user) ? [] : [user.id]))
    .all<BookingView>();
  return {
    bookings: rows.results.slice(0, 200),
    truncated: rows.results.length > 200,
  };
}
export async function bookingDetail(user: User, bookingId: string) {
  await expireBookingHolds();
  const booking = await env.DB.prepare(
    `SELECT ${bookingColumns} FROM bookings WHERE id = ?`,
  )
    .bind(id(bookingId))
    .first<BookingView>();
  if (!booking || (!bookingAdmin(user) && booking.customerId !== user.id))
    throw new RequestFailure('Запись не найдена', 404);
  const events = await env.DB.prepare(
    'SELECT action, revision, slot_id AS slotId, starts_at AS startsAt, created_at AS createdAt FROM booking_events WHERE booking_id = ? ORDER BY revision',
  )
    .bind(booking.id)
    .all();
  return { booking, events: events.results };
}
function eventStatement(
  bookingId: string,
  mutationId: string,
  user: User,
  action: string,
  now: number,
) {
  return env.DB.prepare(`INSERT INTO booking_events (id, booking_id, actor_id, action, revision, slot_id, starts_at, created_at)
    SELECT ?, id, ?, ?, revision, slot_id, starts_at, ? FROM bookings WHERE id = ? AND mutation_id = ?`).bind(
    mutationId,
    user.id,
    action,
    now,
    bookingId,
    mutationId,
  );
}
export async function createBooking(
  user: User,
  body: Record<string, unknown>,
  key: unknown,
) {
  await expireBookingHolds();
  fields(body, [
    'slotId',
    'customerId',
    'customerNote',
    'idempotencyKey',
    'expectedPrice',
    'expectedCurrency',
    'expectedSlotRevision',
  ]);
  const expectation = policy(() => bookingExpectation(body));
  const slotId = id(body.slotId);
  if (!textValue(key, 128, true) || !/^[a-zA-Z0-9_-]{16,128}$/.test(key))
    throw new RequestFailure(
      'Требуется Idempotency-Key: 16–128 букв, цифр, _ или -',
    );
  const customerId =
    body.customerId === undefined ? user.id : id(body.customerId);
  if (!bookingAdmin(user) && customerId !== user.id)
    throw new RequestFailure('Нельзя записать другого клиента', 403);
  if (body.customerNote !== undefined && !textValue(body.customerNote, 1000))
    throw new RequestFailure('Комментарий: не более 1000 символов');
  const note =
    typeof body.customerNote === 'string' ? body.customerNote.trim() : '';
  const requestKey = await digest(`${user.id}:${key}`),
    requestHash = await digest(
      JSON.stringify({
        slotId,
        customerId,
        note,
        ...(expectation ? { expectation } : {}),
      }),
    );
  const previous = async () => {
    const row = await env.DB.prepare(
      'SELECT id, request_hash AS hash FROM bookings WHERE request_key = ?',
    )
      .bind(requestKey)
      .first<{ id: string; hash: string }>();
    if (row && row.hash !== requestHash)
      throw new RequestFailure(
        'Этот ключ уже использован для другой записи',
        409,
      );
    return row;
  };
  const existing = await previous();
  if (existing)
    return { ...(await bookingDetail(user, existing.id)), replayed: true };
  const bookingId = crypto.randomUUID(),
    mutationId = crypto.randomUUID(),
    now = Math.floor(Date.now() / 1000);
  const insert =
    env.DB.prepare(`INSERT INTO bookings (id, customer_id, service, starts_at, ends_at, status, slot_id, product_id, time_zone, resource_name, price, currency, customer_note, payment_status, hold_expires_at, request_key, request_hash, mutation_id, revision, created_at, updated_at)
    SELECT ?, ?, p.title, s.starts_at, s.ends_at, 'confirmed', s.id, p.id, r.time_zone, r.name, p.price, p.currency, ?, CASE WHEN p.price > 0 THEN 'pending' ELSE 'not_required' END, CASE WHEN p.price > 0 THEN ? ELSE NULL END, ?, ?, ?, 0, ?, ? FROM ${slotJoins}
    WHERE s.id = ? AND s.starts_at > ? AND s.available = 1 AND r.active = 1 AND p.active = 1 AND p.kind = 'service'
    AND EXISTS(SELECT 1 FROM users WHERE id = ?) AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND (b.status = 'confirmed' OR (b.status = 'pending_payment' AND b.hold_expires_at > ?)))
    AND (? IS NULL OR (p.price = ? AND p.currency = ? AND s.revision = ?))
    ON CONFLICT DO NOTHING`).bind(
      bookingId,
      customerId,
      note,
      now + 15 * 60,
      requestKey,
      requestHash,
      mutationId,
      now,
      now,
      slotId,
      now,
      customerId,
      now,
      expectation?.price ?? null,
      expectation?.price ?? null,
      expectation?.currency ?? null,
      expectation?.revision ?? null,
    );
  await env.DB.batch([
    insert,
    eventStatement(bookingId, mutationId, user, 'created', now),
  ]);
  const created = await previous();
  if (!created)
    throw new RequestFailure(
      'Слот занят, закрыт либо цена/версия изменились. Обновите данные.',
      409,
    );
  scheduleBookingNotifications();
  return {
    ...(await bookingDetail(user, created.id)),
    replayed: created.id !== bookingId,
  };
}
export async function changeBooking(
  user: User,
  bookingId: string,
  body: Record<string, unknown>,
) {
  fields(body, ['id', 'action', 'revision', 'slotId']);
  const expected = revision(body.revision);
  const { booking } = await bookingDetail(user, bookingId);
  if (!booking.slotId)
    throw new RequestFailure(
      'Старая запись без слота доступна только для чтения',
      409,
    );
  if (
    body.action !== 'cancel' &&
    body.action !== 'reschedule' &&
    body.action !== 'complete'
  )
    throw new RequestFailure('Допустимы cancel, reschedule, complete');
  if (body.action === 'complete' && !bookingAdmin(user))
    throw new RequestFailure(
      'Завершить услугу может только администратор',
      403,
    );
  const now = Math.floor(Date.now() / 1000),
    mutationId = crypto.randomUUID();
  let update: D1PreparedStatement;
  if (body.action === 'reschedule') {
    const target = id(body.slotId);
    if (target === booking.slotId)
      throw new RequestFailure('Выберите другой слот');
    update =
      env.DB.prepare(`UPDATE bookings SET (slot_id, starts_at, ends_at, resource_name, time_zone) =
      (SELECT s.id, s.starts_at, s.ends_at, r.name, r.time_zone FROM ${slotJoins} WHERE s.id = ?),
      revision = revision + 1, mutation_id = ?, updated_at = ?
      WHERE id = ? AND revision = ? AND status = 'confirmed' AND starts_at > ?
      AND EXISTS(SELECT 1 FROM ${slotJoins} WHERE s.id = ? AND s.product_id = bookings.product_id AND s.starts_at > ? AND s.available = 1 AND r.active = 1 AND p.active = 1 AND p.kind = 'service'
        AND NOT EXISTS(SELECT 1 FROM bookings other WHERE other.slot_id = s.id AND (other.status = 'confirmed' OR (other.status = 'pending_payment' AND other.hold_expires_at > ?))))`).bind(
        target,
        mutationId,
        now,
        booking.id,
        expected,
        now,
        target,
        now,
        now,
      );
  } else {
    if (body.slotId !== undefined)
      throw new RequestFailure('slotId используется только при переносе');
    const condition =
      body.action === 'complete'
        ? "AND ends_at <= ? AND payment_status != 'pending'"
        : bookingAdmin(user)
          ? ''
          : 'AND starts_at > ?';
    update = env.DB.prepare(
      `UPDATE bookings SET status = ?, payment_status = CASE WHEN ? = 'cancelled' AND status = 'pending_payment' THEN 'cancelled' ELSE payment_status END, hold_expires_at = CASE WHEN ? = 'cancelled' THEN NULL ELSE hold_expires_at END, revision = revision + 1, mutation_id = ?, updated_at = ? WHERE id = ? AND revision = ? AND status IN ('confirmed', 'pending_payment') ${condition}`,
    ).bind(
      body.action === 'cancel' ? 'cancelled' : 'completed',
      body.action === 'cancel' ? 'cancelled' : 'completed',
      body.action === 'cancel' ? 'cancelled' : 'completed',
      mutationId,
      now,
      booking.id,
      expected,
      ...(condition ? [now] : []),
    );
  }
  const results = await env.DB.batch([
    update,
    eventStatement(booking.id, mutationId, user, body.action, now),
  ]);
  if (!results[0].meta.changes)
    throw new RequestFailure(
      'Запись изменена, время уже прошло или новый слот занят. Обновите данные.',
      409,
    );
  scheduleBookingNotifications();
  return bookingDetail(user, booking.id);
}

async function expireBookingHolds() {
  const now = Math.floor(Date.now() / 1000);
  const mutation = env.DB.prepare(
    `UPDATE bookings SET status = 'cancelled', payment_status = 'expired', hold_expires_at = NULL, revision = revision + 1, mutation_id = 'hold_expired:' || id, updated_at = ? WHERE status IN ('confirmed', 'pending_payment') AND payment_status = 'pending' AND hold_expires_at <= ?`,
  ).bind(now, now);
  const event = env.DB.prepare(
    `INSERT INTO booking_events (id, booking_id, actor_id, action, revision, slot_id, starts_at, created_at) SELECT 'hold_expired:' || id, id, 'system', 'payment_expired', revision, slot_id, starts_at, ? FROM bookings WHERE mutation_id = 'hold_expired:' || id AND NOT EXISTS (SELECT 1 FROM booking_events e WHERE e.id = 'hold_expired:' || bookings.id)`,
  ).bind(now);
  await env.DB.batch([mutation, event]);
}
