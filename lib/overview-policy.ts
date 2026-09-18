export type OverviewPeriod = '24h' | '7d' | '30d';
export type OverviewData = {
  period: OverviewPeriod;
  from: number;
  to: number;
  summary: {
    customers: number;
    conversations: number;
    orders: number;
    bookings: number;
    tickets: number;
    pendingOrders: number;
    openTickets: number;
    upcomingBookings: number;
  };
  recentTickets: {
    id: string;
    subject: string;
    status: string;
    createdAt: number;
  }[];
};

export function overviewRange(query: URLSearchParams, now = Date.now()) {
  if (
    [...query.keys()].some((key) => key !== 'period') ||
    query.getAll('period').length > 1
  )
    throw new Error('Допустим только один параметр period');
  const period = query.get('period') ?? '30d';
  if (!['24h', '7d', '30d'].includes(period))
    throw new Error('Выберите период 24h, 7d или 30d');
  return {
    period: period as OverviewPeriod,
    from:
      now -
      { '24h': 1, '7d': 7, '30d': 30 }[period as OverviewPeriod] * 86400000,
    to: now,
  };
}
