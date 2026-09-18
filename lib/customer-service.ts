import { env } from 'cloudflare:workers';
import { type ContentActor } from '@/lib/access-policy';
import { hashPassword } from '@/lib/auth';
import {
  checked,
  requireAdminResource,
  canReadAdminResource,
} from '@/lib/assistant-service';
import {
  customerInput,
  expectedRevision,
  recordFields,
} from '@/lib/admin-policy';
import { RequestFailure } from '@/lib/request-security';
type Customer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  suspended: number;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
const columns =
  'id,email,first_name AS firstName,last_name AS lastName,phone,role,suspended,revision,created_at AS createdAt,updated_at AS updatedAt';
function view(row: Customer) {
  return {
    ...row,
    createdAt: new Date(row.createdAt * 1000).toISOString(),
    updatedAt: new Date(row.updatedAt * 1000).toISOString(),
  };
}
const conflict = () =>
  new RequestFailure(
    'Клиент уже изменён. Загрузите актуальную карточку и сравните с вашими правками.',
    409,
  );
// Self-service profile edits participate in the same revision stream as admin/MCP edits.
export async function saveSelfProfile(
  id: string,
  revision: number,
  update: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    passwordHash?: string;
    updatedAt: Date;
  },
) {
  const db = env.DB,
    time = Math.floor(update.updatedAt.getTime() / 1000),
    marker = crypto.randomUUID();
  const current = await db
    .prepare(`SELECT ${columns} FROM users WHERE id=?`)
    .bind(id)
    .first<Customer>();
  if (!current || current.revision !== revision) throw conflict();
  const { passwordHash, updatedAt: _updatedAt, ...contact } = update;
  const next = {
    ...current,
    ...contact,
    revision: revision + 1,
    updatedAt: time,
  };
  const statements: D1PreparedStatement[] = [];
  if (current.role === 'customer')
    statements.push(
      db
        .prepare(`INSERT INTO customer_revisions (customer_id,revision,snapshot,action,actor_id,source,created_at)
    SELECT id,revision,?,'baseline','system','existing',? FROM users WHERE id=? AND revision=? ON CONFLICT(customer_id,revision) DO NOTHING`)
        .bind(JSON.stringify(view(current)), time, id, revision),
    );
  const position = statements.length;
  statements.push(
    db
      .prepare(
        `UPDATE users SET email=?,first_name=?,last_name=?,phone=?,updated_at=?,revision=revision+1,mutation_id=? ${passwordHash ? ',password_hash=?' : ''} WHERE id=? AND revision=?`,
      )
      .bind(
        next.email,
        next.firstName,
        next.lastName,
        next.phone,
        time,
        marker,
        ...(passwordHash ? [passwordHash] : []),
        id,
        revision,
      ),
  );
  if (current.role === 'customer')
    statements.push(
      db
        .prepare(`INSERT INTO customer_revisions (customer_id,revision,snapshot,action,actor_id,source,created_at)
    SELECT id,revision,?,'profile',?,'profile',? FROM users WHERE id=? AND mutation_id=?`)
        .bind(JSON.stringify(view(next)), id, time, id, marker),
    );
  if (passwordHash)
    statements.push(
      db
        .prepare(
          'DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND mutation_id=?)',
        )
        .bind(id, id, marker),
    );
  try {
    const results = await db.batch(statements);
    if (results[position].meta.changes !== 1) throw conflict();
  } catch (error) {
    if (/UNIQUE constraint failed: users.email/i.test(String(error)))
      throw new RequestFailure('Этот email уже занят', 409);
    throw error;
  }
}
async function find(id: string) {
  return env.DB.prepare(
    `SELECT ${columns} FROM users WHERE id=? AND role='customer'`,
  )
    .bind(id)
    .first<Customer>();
}
export async function readCustomer(actor: ContentActor | null, id: string) {
  requireAdminResource(actor, 'customers');
  const row = await find(id);
  if (!row) throw new RequestFailure('Клиент не найден', 404);
  return view(row);
}
function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}
export async function listCustomers(
  actor: ContentActor | null,
  before?: string,
  query?: string,
) {
  requireAdminResource(actor, 'customers');
  if (before !== undefined && !/^[A-Za-z0-9_-]{1,100}$/.test(before))
    throw new RequestFailure('Некорректный курсор');
  const binds: string[] = [];
  let where = "role='customer'";
  if (query && query.trim().length > 0) {
    const term = `%${escapeLike(query.trim().toLowerCase())}%`;
    where +=
      " AND (LOWER(first_name) LIKE ? ESCAPE '\\' OR LOWER(last_name) LIKE ? ESCAPE '\\' OR LOWER(email) LIKE ? ESCAPE '\\' OR LOWER(phone) LIKE ? ESCAPE '\\')";
    binds.push(term, term, term, term);
  }
  if (before) {
    where += ' AND id < ?';
    binds.push(before);
  }
  const rows = (
    await env.DB.prepare(
      `SELECT ${columns} FROM users WHERE ${where} ORDER BY id DESC LIMIT 100`,
    )
      .bind(...binds)
      .all<Customer>()
  ).results;
  return {
    customers: rows.map(view),
    nextBefore: rows.length === 100 ? rows.at(-1)!.id : null,
  };
}
export async function customerHistory(
  actor: ContentActor | null,
  id: string,
  before?: number,
) {
  requireAdminResource(actor, 'customers');
  if (before !== undefined) checked(() => expectedRevision(before));
  // Administrators' accounts are never included, even if an old customer changed role.
  const role = await env.DB.prepare('SELECT role FROM users WHERE id=?')
    .bind(id)
    .first<{ role: string }>();
  if (role && role.role !== 'customer')
    throw new RequestFailure('Клиент не найден', 404);
  const rows = (
    await env.DB.prepare(
      'SELECT revision, action, actor_id AS actorId, token_id AS tokenId, source, created_at AS createdAt, snapshot FROM customer_revisions WHERE customer_id=? AND revision < ? ORDER BY revision DESC LIMIT 50',
    )
      .bind(id, before ?? Number.MAX_SAFE_INTEGER)
      .all<{ snapshot: string; revision: number }>()
  ).results;
  return rows.map(({ snapshot, ...event }) => ({
    ...event,
    customer: JSON.parse(snapshot),
  }));
}
export async function changeCustomer(
  actor: ContentActor | null,
  action: 'create' | 'update' | 'delete',
  id: string | undefined,
  body: Record<string, unknown>,
  source: 'rest' | 'mcp',
) {
  const user = requireAdminResource(actor, 'customers', true);
  checked(() =>
    recordFields(
      body,
      action === 'delete'
        ? ['revision', 'confirm']
        : [
            'email',
            'firstName',
            'lastName',
            'phone',
            ...(action === 'create' ? ['password'] : ['revision']),
            'confirm',
          ],
    ),
  );
  if (body.confirm !== true)
    throw new RequestFailure('Требуется confirm: true');
  const current = action === 'create' ? null : await find(id ?? '');
  if (action !== 'create' && !current)
    throw new RequestFailure('Клиент не найден', 404);
  if (
    current &&
    current.revision !== checked(() => expectedRevision(body.revision))
  )
    throw conflict();
  const input =
    action === 'delete'
      ? {}
      : checked(() => customerInput(body, action === 'create'));
  const time = Math.floor(Date.now() / 1000),
    mutation = crypto.randomUUID();
  const { password, ...contact } = input;
  const next: Customer = {
    id: crypto.randomUUID(),
    email: '',
    firstName: null,
    lastName: null,
    phone: null,
    role: 'customer',
    suspended: 0,
    createdAt: time,
    ...current,
    ...contact,
    revision: current ? current.revision + 1 : 0,
    updatedAt: time,
  };
  const db = env.DB,
    statements: D1PreparedStatement[] = [];
  if (current) {
    statements.push(
      db
        .prepare(`INSERT INTO customer_revisions (customer_id,revision,snapshot,action,actor_id,source,created_at)
      SELECT id,revision,?,'baseline','system','existing',? FROM users WHERE id=? AND role='customer' AND revision=? ON CONFLICT(customer_id,revision) DO NOTHING`)
        .bind(
          JSON.stringify(view(current)),
          time,
          current.id,
          current.revision,
        ),
    );
    statements.push(
      db
        .prepare(
          "UPDATE users SET email=?,first_name=?,last_name=?,phone=?,revision=revision+1,mutation_id=?,updated_at=? WHERE id=? AND role='customer' AND revision=?",
        )
        .bind(
          next.email,
          next.firstName,
          next.lastName,
          next.phone,
          mutation,
          time,
          current.id,
          current.revision,
        ),
    );
  } else
    statements.push(
      db
        .prepare(
          "INSERT INTO users (id,email,password_hash,first_name,last_name,phone,role,revision,mutation_id,created_at,updated_at) VALUES (?,?,?,?,?,?,'customer',0,?,?,?)",
        )
        .bind(
          next.id,
          next.email,
          password ? await hashPassword(password) : null,
          next.firstName,
          next.lastName,
          next.phone,
          mutation,
          time,
          time,
        ),
    );
  statements.push(
    db
      .prepare(`INSERT INTO customer_revisions (customer_id,revision,snapshot,action,actor_id,token_id,source,created_at)
    SELECT id,revision,?,?,?,?,?,? FROM users WHERE id=? AND mutation_id=?`)
      .bind(
        JSON.stringify(view(next)),
        action,
        user.id,
        user.tokenId ?? null,
        source,
        time,
        next.id,
        mutation,
      ),
  );
  if (action === 'delete' || (current && next.email !== current.email)) {
    for (const table of ['sessions', 'api_tokens'])
      statements.push(
        db
          .prepare(
            `DELETE FROM ${table} WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND mutation_id=?)`,
          )
          .bind(next.id, next.id, mutation),
      );
  }
  if (action === 'delete')
    statements.push(
      db
        .prepare('DELETE FROM users WHERE id=? AND mutation_id=?')
        .bind(next.id, mutation),
    );
  try {
    const results = await db.batch(statements);
    if (results[current ? 1 : 0].meta.changes !== 1) throw conflict();
  } catch (error) {
    if (/UNIQUE constraint failed: users.email/i.test(String(error)))
      throw new RequestFailure('Этот email уже занят', 409);
    if (/FOREIGN KEY constraint failed/i.test(String(error)))
      throw new RequestFailure(
        'У клиента есть связанные данные (заказы, записи, диалоги, обращения или файлы). Удаление отменено; данные и доступ сохранены.',
        409,
      );
    throw error;
  }
  return action === 'delete'
    ? { ok: true, id: next.id, revision: next.revision }
    : {
        customer:
          action === 'create' || canReadAdminResource(user, 'customers')
            ? view(next)
            : { id: next.id, revision: next.revision },
      };
}
export async function customerStats(
  actor: ContentActor | null,
  customerIds: string[],
) {
  requireAdminResource(actor, 'customers');
  if (!customerIds.length) return {};
  const db = env.DB;
  const placeholders = customerIds.map(() => '?').join(',');
  const [orderRows, bookingRows] = await Promise.all([
    db
      .prepare(
        `SELECT customer_id AS cid, COUNT(*) AS cnt FROM orders WHERE customer_id IN (${placeholders}) GROUP BY customer_id`,
      )
      .bind(...customerIds)
      .all<{ cid: string; cnt: number }>(),
    db
      .prepare(
        `SELECT customer_id AS cid, COUNT(*) AS cnt FROM bookings WHERE customer_id IN (${placeholders}) GROUP BY customer_id`,
      )
      .bind(...customerIds)
      .all<{ cid: string; cnt: number }>(),
  ]);
  const stats: Record<string, { orders: number; bookings: number }> = {};
  for (const id of customerIds) stats[id] = { orders: 0, bookings: 0 };
  for (const r of orderRows.results) if (stats[r.cid]) stats[r.cid].orders = r.cnt;
  for (const r of bookingRows.results) if (stats[r.cid]) stats[r.cid].bookings = r.cnt;
  return stats;
}
export async function toggleSuspended(
  actor: ContentActor | null,
  id: string,
  suspended: boolean,
) {
  const user = requireAdminResource(actor, 'customers', true);
  const db = env.DB;
  const row = await find(id);
  if (!row) throw new RequestFailure('Клиент не найден', 404);
  const time = Math.floor(Date.now() / 1000);
  const flag = suspended ? 1 : 0;
  const result = await db
    .prepare(
      "UPDATE users SET suspended=?, updated_at=? WHERE id=? AND role='customer'",
    )
    .bind(flag, time, id)
    .run();
  if (result.meta.changes !== 1)
    throw new RequestFailure('Не удалось обновить статус', 500);
  // Revoke sessions when suspending
  if (suspended) {
    await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();
    await db.prepare('DELETE FROM api_tokens WHERE user_id=?').bind(id).run();
  }
  return {
    ok: true,
    suspended: flag,
    actorId: user.id,
  };
}
