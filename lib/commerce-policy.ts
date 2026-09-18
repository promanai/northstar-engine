export const orderStatusLabels: Record<string, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплата подтверждена',
  cancelled: 'Отменён',
  refunded: 'Возврат подтверждён',
};
export function isOwner(user: { role: string } | null) {
  return !!user && ['admin', 'owner'].includes(user.role);
}
export function allowedTransition(from: string, to: string) {
  return (
    (from === 'pending' && ['paid', 'cancelled'].includes(to)) ||
    (from === 'paid' && to === 'refunded')
  );
}
export function paymentLink(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function money(amount: number, currency: string) {
  return `${(amount / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
