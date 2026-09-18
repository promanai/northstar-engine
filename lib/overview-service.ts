import { env } from 'cloudflare:workers';
import { overviewRange, type OverviewData } from '@/lib/overview-policy';

export async function readOverview(
  query: URLSearchParams,
): Promise<OverviewData> {
  const range = overviewRange(query);
  const from = Math.ceil(range.from / 1000),
    to = Math.ceil(range.to / 1000);
  // One read batch provides a coherent snapshot; no per-client or per-message
  // rows leave D1. Counts are exact, so large installations still pay for scans.
  const results = await env.DB.batch([
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM users WHERE role='customer' AND created_at>=? AND created_at<?) AS customers,
      (SELECT COUNT(DISTINCT m.conversation_id) FROM messages m JOIN conversations c ON c.id=m.conversation_id
        LEFT JOIN users u ON u.id=c.customer_id WHERE m.role='user' AND m.created_at>=? AND m.created_at<?
        AND (c.customer_id IS NULL OR u.role='customer')) AS conversations,
      (SELECT COUNT(*) FROM orders WHERE created_at>=? AND created_at<?) AS orders,
      (SELECT COUNT(*) FROM bookings WHERE created_at>=? AND created_at<?) AS bookings,
      (SELECT COUNT(*) FROM support_tickets WHERE created_at>=? AND created_at<?) AS tickets,
      (SELECT COUNT(*) FROM orders WHERE status='pending') AS pendingOrders,
      (SELECT COUNT(*) FROM support_tickets WHERE status='open') AS openTickets,
      (SELECT COUNT(*) FROM bookings WHERE starts_at>=? AND starts_at<?
        AND ((status='confirmed' AND (payment_status<>'pending' OR hold_expires_at>?))
          OR (status='pending_payment' AND hold_expires_at>?))) AS upcomingBookings`).bind(
      from,
      to,
      from,
      to,
      from,
      to,
      from,
      to,
      range.from,
      range.to,
      to,
      to + 7 * 86400,
      Math.floor(range.to / 1000),
      Math.floor(range.to / 1000),
    ),
    env.DB.prepare(
      'SELECT id,subject,status,created_at AS createdAt FROM support_tickets ORDER BY created_at DESC,id DESC LIMIT 5',
    ),
  ]);
  if (!results.every((r) => r.success) || !results[0].results[0])
    throw new Error('Overview snapshot unavailable');
  return {
    ...range,
    summary: results[0].results[0] as OverviewData['summary'],
    recentTickets: results[1].results as OverviewData['recentTickets'],
  };
}
