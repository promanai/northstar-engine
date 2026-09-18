import { env } from 'cloudflare:workers';
import { isAdministrator, type ContentActor } from '@/lib/access-policy';
import { checked } from '@/lib/assistant-service';
import { RequestFailure } from '@/lib/request-security';
import { digest } from '@/lib/security-policy';
import { ticketAccess, ticketCursor, ticketInput } from '@/lib/ticket-policy';

type Ticket = {
  id: string;
  customerId: string;
  subject: string;
  status: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
type Event = {
  id: string;
  ticketId: string;
  revision: number;
  status: string;
  fingerprint: string;
};
const columns =
  'id,customer_id AS customerId,subject,status,revision,created_at AS createdAt,updated_at AS updatedAt';
export function requireTicketAccess(actor: ContentActor | null, write = false) {
  if (!actor) throw new RequestFailure('Требуется авторизация', 401);
  if (!ticketAccess(actor, write))
    throw new RequestFailure('Недостаточно прав', 403);
  return actor;
}
async function accessible(actor: ContentActor, id: string) {
  const row = await env.DB.prepare(
    `SELECT ${columns} FROM support_tickets WHERE id=?`,
  )
    .bind(id)
    .first<Ticket>();
  if (!row || (row.customerId !== actor.id && !isAdministrator(actor.role)))
    throw new RequestFailure('Обращение не найдено', 404);
  return row;
}
export async function listTickets(
  actor: ContentActor | null,
  options: { before?: unknown; all?: unknown } = {},
) {
  const user = requireTicketAccess(actor);
  if (options.all !== undefined && typeof options.all !== 'boolean')
    throw new RequestFailure('Некорректный параметр all');
  if (options.all && !isAdministrator(user.role))
    throw new RequestFailure('Недостаточно прав', 403);
  const cursor = checked(() => ticketCursor(options.before));
  const conditions: string[] = [],
    values: (string | number)[] = [];
  if (!options.all) {
    conditions.push('customer_id=?');
    values.push(user.id);
  }
  if (cursor) {
    conditions.push('(created_at,id)<(?,?)');
    values.push(cursor.time, cursor.id);
  }
  const result = await env.DB.prepare(
    `SELECT ${columns} FROM support_tickets ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC,id DESC LIMIT 51`,
  )
    .bind(...values)
    .all<Ticket>();
  const tickets = result.results.slice(0, 50),
    last = tickets.at(-1);
  return {
    tickets,
    nextBefore:
      result.results.length > 50 && last
        ? `${last.createdAt}_${last.id}`
        : null,
  };
}
export async function readTicket(
  actor: ContentActor | null,
  id: string,
  before?: number,
) {
  const user = requireTicketAccess(actor);
  const ticket = await accessible(user, id);
  if (before !== undefined && (!Number.isSafeInteger(before) || before < 1))
    throw new RequestFailure('Некорректный курсор сообщений');
  // Bound the event snapshot by the revision read above, even if another message arrives.
  const result = await env.DB.prepare(
    'SELECT id,author,action,body,revision,created_at AS createdAt FROM ticket_events WHERE ticket_id=? AND revision<=? AND revision<? ORDER BY revision DESC LIMIT 51',
  )
    .bind(id, ticket.revision, before ?? ticket.revision + 1)
    .all<{
      id: string;
      author: string;
      action: string;
      body: string | null;
      revision: number;
      createdAt: number;
    }>();
  const events = result.results.slice(0, 50).reverse();
  return {
    ticket,
    events,
    nextBefore: result.results.length > 50 ? events[0].revision : null,
  };
}
export async function changeTicket(
  actor: ContentActor | null,
  id: string | undefined,
  raw: Record<string, unknown>,
  source: 'rest' | 'mcp',
) {
  const user = requireTicketAccess(actor, true),
    create = id === undefined;
  const input = checked(() => ticketInput(raw, create));
  const db = env.DB,
    eventId = await digest(JSON.stringify([user.id, input.idempotencyKey]));
  const fingerprint = await digest(
    JSON.stringify([
      id ?? null,
      input.subject ?? null,
      input.body,
      input.action,
      input.revision,
    ]),
  );
  if (id) await accessible(user, id);
  const replay = async () => {
    const row = await db
      .prepare(
        'SELECT id,ticket_id AS ticketId,revision,status,fingerprint FROM ticket_events WHERE id=?',
      )
      .bind(eventId)
      .first<Event>();
    if (!row) return null;
    if (row.fingerprint !== fingerprint)
      throw new RequestFailure(
        'Ключ уже использован с другими параметрами',
        409,
      );
    await accessible(user, row.ticketId);
    return {
      id: row.ticketId,
      eventId: row.id,
      revision: row.revision,
      status: row.status,
      replayed: true,
    };
  };
  const previous = await replay();
  if (previous) return previous;
  const ticketId = id ?? crypto.randomUUID(),
    now = Date.now(),
    statements: D1PreparedStatement[] = [];
  const author = isAdministrator(user.role) ? 'support' : 'customer';
  if (create) {
    // The event's unique ID is the cross-transport idempotency key. Duplicate creates
    // must not leave a second ticket behind when concurrent requests win elsewhere.
    statements.push(
      db
        .prepare(`INSERT INTO support_tickets (id,customer_id,subject,status,revision,mutation_id,created_at,updated_at)
      SELECT ?,?,?,'open',1,?,?,? WHERE NOT EXISTS(SELECT 1 FROM ticket_events WHERE id=?)`)
        .bind(ticketId, user.id, input.subject!, eventId, now, now, eventId),
    );
  } else {
    const desired = input.action === 'close' ? 'closed' : 'open';
    const expectedStatus = input.action === 'reopen' ? 'closed' : 'open';
    statements.push(
      db
        .prepare(`UPDATE support_tickets SET status=?,revision=revision+1,mutation_id=?,updated_at=?
      WHERE id=? AND revision=? AND status=? AND revision<2000 AND NOT EXISTS(SELECT 1 FROM ticket_events WHERE id=?)`)
        .bind(
          desired,
          eventId,
          now,
          ticketId,
          input.revision,
          expectedStatus,
          eventId,
        ),
    );
  }
  statements.push(
    db
      .prepare(`INSERT INTO ticket_events (id,ticket_id,actor_id,author,action,body,revision,status,fingerprint,source,created_at)
    SELECT ?,id,?,?,?,?,revision,status,?,?,? FROM support_tickets WHERE id=? AND mutation_id=?
    ON CONFLICT(id) DO NOTHING`)
      .bind(
        eventId,
        user.id,
        author,
        input.action,
        input.body,
        fingerprint,
        source,
        now,
        ticketId,
        eventId,
      ),
  );
  const result = await db.batch(statements);
  const saved = await replay();
  if (!saved)
    throw new RequestFailure(
      'Обращение изменилось, закрыто или достигло лимита истории (2000 событий). Обновите переписку, сохранив черновик.',
      409,
    );
  return { ...saved, replayed: result[0].meta.changes !== 1 };
}
