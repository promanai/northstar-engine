import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { isAdministrator } from '@/lib/access-policy';
import { documentStore } from '@/lib/document-store';
import { checked } from '@/lib/assistant-service';
import { RequestFailure, limitRequest } from '@/lib/request-security';
import { digest, readCookie } from '@/lib/security-policy';
import {
  analyticsActions,
  analyticsCookie,
  analyticsDefaults,
  analyticsEvent,
  analyticsPath,
  analyticsRange,
  analyticsSettings,
  cleanupAnalyticsBatch,
} from '@/lib/analytics-policy';

const store = () => documentStore('analytics', analyticsDefaults);
export const readAnalyticsSettings = () => store().read();
export async function analyticsAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || !isAdministrator(user.role))
    throw new RequestFailure('Нужна сессия администратора', 403);
  return user;
}
export async function saveAnalyticsSettings(
  request: Request,
  body: Record<string, unknown>,
) {
  const user = await analyticsAdmin(request);
  if (
    Object.keys(body).some(
      (k) => !['revision', 'value', 'confirm'].includes(k),
    ) ||
    body.confirm !== true ||
    !Number.isSafeInteger(body.revision) ||
    !body.value ||
    typeof body.value !== 'object' ||
    Array.isArray(body.value)
  )
    throw new RequestFailure('Требуются revision, value и подтверждение');
  const value = checked(() =>
      analyticsSettings(body.value as Record<string, unknown>),
    ),
    current = await store().read();
  if (
    body.revision !== current.revision ||
    !(await store().save(current, value, user.id, null, 'rest', null))
  )
    throw new RequestFailure('Настройки изменились. Обновите раздел.', 409);
  return store().read();
}
const token = (request: Request) => {
  const value = readCookie(request, analyticsCookie);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
};
export function analyticsCookieHeader(request: Request, value = '') {
  return `${analyticsCookie}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value ? 1800 : 0}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function publicPath(value: string) {
  const path = analyticsPath(value);
  if (!path) return null;
  if (['/', '/catalog'].includes(path)) return path;
  const page = await env.DB.prepare(
    "SELECT id FROM pages WHERE slug=? AND status='published' LIMIT 1",
  )
    .bind(path)
    .first();
  if (page) return path;
  if (path.startsWith('/catalog/')) {
    const product = await env.DB.prepare(
      "SELECT id FROM products WHERE slug=? AND status='active' LIMIT 1",
    )
      .bind(path.slice(9))
      .first();
    if (product) return path;
  }
  return null;
}
export async function cleanupAnalytics() {
  return cleanupAnalyticsBatch(env.DB);
}
export async function ingestAnalytics(
  request: Request,
  body: Record<string, unknown>,
) {
  if (request.headers.has('authorization'))
    throw new RequestFailure('Только браузерные события', 403);
  if (body.consent === false && Object.keys(body).length === 1)
    return Response.json(
      { enabled: false },
      {
        headers: {
          'cache-control': 'no-store',
          'set-cookie': analyticsCookieHeader(request),
        },
      },
    );
  if (
    body.consent !== true ||
    Object.keys(body).some((k) => !['consent', 'event'].includes(k)) ||
    !body.event ||
    typeof body.event !== 'object' ||
    Array.isArray(body.event)
  )
    throw new RequestFailure('Нужно согласие и событие');
  const settings = await store().read();
  if (
    !settings.value.enabled ||
    request.headers.get('dnt') === '1' ||
    request.headers.get('sec-gpc') === '1'
  )
    return Response.json(
      { enabled: false },
      {
        headers: {
          'cache-control': 'no-store',
          'set-cookie': analyticsCookieHeader(request),
        },
      },
    );
  const user = await getSessionUser(request);
  if (user && user.role !== 'customer')
    return Response.json(
      { excluded: true },
      { headers: { 'cache-control': 'no-store' } },
    );
  const input = checked(() =>
    analyticsEvent(body.event as Record<string, unknown>),
  );
  const path = await publicPath(input.path);
  if (!path) throw new RequestFailure('Непубличная страница');
  let target = '';
  if (input.target) {
    if (analyticsActions.includes(input.target)) target = input.target;
    else target = (await publicPath(input.target)) ?? 'other-link';
  }
  await limitRequest(request, 'analytics-ip', 120, 60);
  const existing = token(request);
  if (!existing) {
    const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    return Response.json(
      { retry: true },
      {
        status: 428,
        headers: {
          'cache-control': 'no-store',
          'set-cookie': analyticsCookieHeader(request, key),
        },
      },
    );
  }
  const visitorId = await digest(existing),
    id = await digest(`${visitorId}:${input.id}`);
  const duplicate = await env.DB.prepare(
    'SELECT id FROM analytics_events WHERE id=?',
  )
    .bind(id)
    .first();
  if (duplicate)
    return Response.json(
      { accepted: true, duplicate: true },
      { headers: { 'cache-control': 'no-store' } },
    );
  await limitRequest(request, 'analytics-daily', 10000, 86400, 'site');
  const entry = await env.DB.prepare(
    'SELECT referrer FROM analytics_events WHERE visitor_id=? ORDER BY created_at,id LIMIT 1',
  )
    .bind(visitorId)
    .first<{ referrer: string }>();
  await env.DB.prepare(
    'INSERT INTO analytics_events (id,visitor_id,user_id,kind,path,target,referrer,device,value,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
  )
    .bind(
      id,
      visitorId,
      user?.id ?? null,
      input.kind,
      path,
      target,
      entry?.referrer ?? input.referrer,
      input.device,
      input.value,
      Date.now(),
    )
    .run();
  await cleanupAnalytics();
  return Response.json(
    { accepted: true },
    {
      headers: {
        'cache-control': 'no-store',
        'set-cookie': analyticsCookieHeader(request, existing),
      },
    },
  );
}
// Operational chat stays independent: analytics failure cannot change a saved answer.
export async function recordChatAnalytics(
  request: Request,
  conversationId: string,
  requestId: string,
  userId: string | null,
) {
  const key = token(request);
  if (
    !key ||
    request.headers.get('dnt') === '1' ||
    request.headers.get('sec-gpc') === '1'
  )
    return;
  try {
    if (!(await store().read()).value.enabled) return;
    const user = await getSessionUser(request);
    if (user && user.role !== 'customer') return;
    const visitor = await digest(key);
    // Only link an existing consented visit, not arbitrary client-supplied conversation IDs.
    const last = await env.DB.prepare(
      'SELECT path,referrer,device FROM analytics_events WHERE visitor_id=? AND created_at>? ORDER BY created_at DESC,id DESC LIMIT 1',
    )
      .bind(visitor, Date.now() - 1800000)
      .first<{ path: string; referrer: string; device: string }>();
    if (!last) return;
    await limitRequest(request, 'analytics-daily', 10000, 86400, 'site');
    await env.DB.prepare(
      "INSERT INTO analytics_events (id,visitor_id,user_id,kind,path,target,referrer,device,value,conversation_id,created_at) VALUES (?,?,?,'chat_turn',?,'',?,?,0,?,?) ON CONFLICT(id) DO NOTHING",
    )
      .bind(
        await digest(`chat:${requestId}`),
        visitor,
        userId,
        last.path,
        last.referrer,
        last.device,
        conversationId,
        Date.now(),
      )
      .run();
  } catch {
    console.error('Chat analytics unavailable; answer retained');
  }
}
export async function analyticsReport(query: URLSearchParams) {
  const settings = await store().read(),
    selected = checked(() => analyticsRange(query));
  const from = Math.max(
      selected.from,
      Date.now() - settings.value.retentionDays * 86400000,
    ),
    to = selected.to;
  const visitor = query.get('visitor'),
    conversation = query.get('conversation'),
    before = query.get('before');
  if (visitor && !/^[a-f0-9]{64}$/.test(visitor))
    throw new RequestFailure('Некорректный сеанс');
  if (conversation && !/^[a-f0-9-]{36}$/.test(conversation))
    throw new RequestFailure('Некорректный диалог');
  if (visitor && conversation)
    throw new RequestFailure('Выберите сеанс или диалог');
  if (before && !visitor && !conversation)
    throw new RequestFailure('Курсор before требует сеанс или диалог');
  if (before && !/^\d{1,15}_[a-f0-9-]{36,64}$/.test(before))
    throw new RequestFailure('Некорректный курсор');
  const cursor = before ? before.split('_') : null;
  const listCursor = (name: string, size: number) => {
    const raw = query.get(name);
    if (!raw) return null;
    if (!new RegExp(`^\\d{1,15}_[a-f0-9-]{${size}}$`).test(raw))
      throw new RequestFailure('Некорректный курсор списка');
    return raw.split('_');
  };
  const visitsBefore = listCursor('visitsBefore', 64),
    chatsBefore = listCursor('chatsBefore', 36);
  const db = env.DB;
  if (conversation) {
    const identity = await db
      .prepare(
        'SELECT c.id,c.customer_id AS userId,u.email,u.first_name AS firstName,u.last_name AS lastName FROM conversations c LEFT JOIN users u ON u.id=c.customer_id WHERE c.id=?',
      )
      .bind(conversation)
      .first();
    if (!identity) throw new RequestFailure('Диалог не найден', 404);
    const rows = await db
      .prepare(
        `SELECT id,role,content,model,created_at AS createdAt FROM messages WHERE conversation_id=? AND role IN ('user','assistant') ${cursor ? 'AND (created_at,id)<(?,?)' : ''} ORDER BY created_at DESC,id DESC LIMIT 51`,
      )
      .bind(conversation, ...(cursor ? [Number(cursor[0]), cursor[1]] : []))
      .all<{
        id: string;
        role: string;
        content: string;
        model: string | null;
        createdAt: number;
      }>();
    const messages = rows.results.slice(0, 50).reverse();
    return {
      conversation: identity,
      messages,
      nextBefore:
        rows.results.length > 50
          ? `${messages[0].createdAt}_${messages[0].id}`
          : null,
    };
  }
  if (visitor) {
    const rows = await db
      .prepare(
        `SELECT id,kind,path,target,referrer,device,value,user_id AS userId,conversation_id AS conversationId,created_at AS createdAt FROM analytics_events WHERE visitor_id=? AND created_at>=? AND created_at<? ${cursor ? 'AND (created_at,id)<(?,?)' : ''} ORDER BY created_at DESC,id DESC LIMIT 101`,
      )
      .bind(
        visitor,
        from,
        to,
        ...(cursor ? [Number(cursor[0]), cursor[1]] : []),
      )
      .all<{ id: string; createdAt: number }>();
    const events = rows.results.slice(0, 100).reverse();
    return {
      events,
      nextBefore:
        rows.results.length > 100
          ? `${events[0].createdAt}_${events[0].id}`
          : null,
    };
  }
  const aggregate = (sql: string) => db.prepare(sql).bind(from, to).all();
  const [
    summary,
    timeline,
    pages,
    sources,
    targets,
    devices,
    visits,
    chats,
    chatTotals,
  ] = await Promise.all([
    db
      .prepare(
        "SELECT COUNT(*) AS events,COUNT(DISTINCT visitor_id) AS visits,COUNT(DISTINCT user_id) AS customers,SUM(kind='page_view') AS pageViews,SUM(kind='click') AS clicks,SUM(CASE WHEN kind='engagement' THEN value ELSE 0 END) AS activeSeconds,COUNT(DISTINCT CASE WHEN kind='chat_turn' THEN visitor_id END) AS chattingVisits FROM analytics_events WHERE created_at>=? AND created_at<?",
      )
      .bind(from, to)
      .first(),
    db
      .prepare(
        "SELECT CAST(created_at/? AS INTEGER)*? AS time,SUM(kind='page_view') AS views,SUM(kind='click') AS clicks,COUNT(DISTINCT visitor_id) AS visits FROM analytics_events WHERE created_at>=? AND created_at<? GROUP BY time ORDER BY time",
      )
      .bind(selected.bucketMs, selected.bucketMs, from, to)
      .all(),
    aggregate(
      "SELECT path AS label,COUNT(*) AS count FROM analytics_events WHERE created_at>=? AND created_at<? AND kind='page_view' GROUP BY path ORDER BY count DESC,label LIMIT 20",
    ),
    aggregate(
      "SELECT referrer AS label,COUNT(DISTINCT visitor_id) AS count FROM analytics_events WHERE created_at>=? AND created_at<? AND kind='page_view' GROUP BY referrer ORDER BY count DESC,label LIMIT 20",
    ),
    aggregate(
      "SELECT path,target,COUNT(*) AS count FROM analytics_events WHERE created_at>=? AND created_at<? AND kind='click' GROUP BY path,target ORDER BY count DESC,path,target LIMIT 30",
    ),
    aggregate(
      'SELECT device AS label,COUNT(DISTINCT visitor_id) AS count FROM analytics_events WHERE created_at>=? AND created_at<? GROUP BY device ORDER BY count DESC,label',
    ),
    db
      .prepare(
        `SELECT visitor_id AS id,MIN(created_at) AS startedAt,MAX(created_at) AS lastAt,COUNT(*) AS events,MAX(user_id) AS userId FROM analytics_events WHERE created_at>=? AND created_at<? GROUP BY visitor_id ${visitsBefore ? 'HAVING (MAX(created_at),visitor_id)<(?,?)' : ''} ORDER BY lastAt DESC,id DESC LIMIT 51`,
      )
      .bind(
        from,
        to,
        ...(visitsBefore ? [Number(visitsBefore[0]), visitsBefore[1]] : []),
      )
      .all(),
    db
      .prepare(
        `SELECT m.conversation_id AS id,MAX(m.created_at) AS lastAt,COUNT(*) AS prompts FROM messages m JOIN conversations c ON c.id=m.conversation_id LEFT JOIN users u ON u.id=c.customer_id WHERE m.role='user' AND m.created_at>=? AND m.created_at<? AND (c.customer_id IS NULL OR u.role='customer') GROUP BY m.conversation_id ${chatsBefore ? 'HAVING (MAX(m.created_at),m.conversation_id)<(?,?)' : ''} ORDER BY lastAt DESC,id DESC LIMIT 51`,
      )
      .bind(
        Math.ceil(selected.from / 1000),
        Math.ceil(to / 1000),
        ...(chatsBefore ? [Number(chatsBefore[0]), chatsBefore[1]] : []),
      )
      .all(),
    db
      .prepare(
        "SELECT COUNT(*) AS prompts,COUNT(DISTINCT m.conversation_id) AS conversations FROM messages m JOIN conversations c ON c.id=m.conversation_id LEFT JOIN users u ON u.id=c.customer_id WHERE m.role='user' AND m.created_at>=? AND m.created_at<? AND (c.customer_id IS NULL OR u.role='customer')",
      )
      .bind(Math.ceil(selected.from / 1000), Math.ceil(to / 1000))
      .first(),
  ]);
  await cleanupAnalytics();
  const next = (rows: Record<string, unknown>[]) =>
    rows.length > 50
      ? `${String(rows[49].lastAt)}_${String(rows[49].id)}`
      : null;
  return {
    settings,
    range: { ...selected, effectiveFrom: from },
    summary,
    chatTotals,
    timeline: timeline.results,
    pages: pages.results,
    sources: sources.results,
    targets: targets.results,
    devices: devices.results,
    visits: visits.results.slice(0, 50),
    visitsNext: next(visits.results),
    chats: chats.results.slice(0, 50),
    chatsNext: next(chats.results),
  };
}
