export function validTimeZone(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > 80 ||
    !/^[A-Za-z]/.test(value)
  )
    return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
export function instant(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  )
    throw new Error('Дата должна быть ISO 8601 с Z или часовым смещением');
  const ms = Date.parse(value);
  if (
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59
  )
    throw new Error('Некорректное время');
  const date = value.slice(0, 10);
  if (
    !Number.isFinite(ms) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error('Некорректная дата');
  return Math.floor(ms / 1000);
}
export function slotRange(
  startsAt: unknown,
  endsAt: unknown,
  now = Date.now() / 1000,
) {
  const start = instant(startsAt),
    end = instant(endsAt);
  if (start <= now || start > now + 366 * 86400)
    throw new Error(
      'Слот должен начинаться в будущем, не позднее чем через год',
    );
  if (end - start < 300 || end - start > 12 * 3600)
    throw new Error('Длительность слота: от 5 минут до 12 часов');
  return { start, end };
}
// Local wall time -> an unambiguous UTC instant. Refuse DST gaps/folds instead of silently moving appointments.
export function wallTimeToIso(local: string, timeZone: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ||
    !validTimeZone(timeZone)
  )
    throw new Error('Укажите дату, время и часовой пояс');
  const naive = Date.parse(`${local}:00Z`);
  if (
    !Number.isFinite(naive) ||
    new Date(naive).toISOString().slice(0, 16) !== local
  )
    throw new Error('Некорректная дата');
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const wall = (ms: number) => {
    const p = Object.fromEntries(
      formatter.formatToParts(ms).map((part) => [part.type, part.value]),
    );
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  };
  const candidates = new Set<number>();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const sample = naive + hours * 3600_000;
    const offset = Date.parse(wall(sample) + 'Z') - sample;
    const candidate = naive - offset;
    if (wall(candidate) === `${local}:00`) candidates.add(candidate);
  }
  if (candidates.size !== 1)
    throw new Error(
      candidates.size
        ? 'Время повторяется при переводе часов. Выберите другое время или задайте точный ISO-момент через API.'
        : 'Этого времени нет из-за перевода часов. Выберите другое время.',
    );
  return new Date([...candidates][0]).toISOString();
}
export const bookingStatus: Record<string, string> = {
  pending_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  pending: 'Старая запись · ожидает',
};
export type BookingView = {
  id: string;
  customerId: string | null;
  service: string;
  startsAt: number | null;
  endsAt: number | null;
  status: string;
  paymentStatus: string;
  holdExpiresAt: number | null;
  paymentUrl?: string | null;
  slotId: string | null;
  productId: string | null;
  resourceName: string | null;
  timeZone: string | null;
  price: number | null;
  currency: string | null;
  customerNote: string | null;
  revision: number;
};
export type SlotView = {
  id: string;
  resourceId: string;
  productId: string;
  startsAt: number;
  endsAt: number;
  resourceName: string;
  timeZone: string;
  service: string;
  price: number;
  currency: string;
  available: number;
  revision: number;
  occupied: number;
};
export type ResourceView = {
  id: string;
  name: string;
  timeZone: string;
  active: number;
  revision: number;
};
// Optional for older integrations; first-party confirmation binds all three values.
export function bookingExpectation(body: Record<string, unknown>) {
  const keys = ['expectedPrice', 'expectedCurrency', 'expectedSlotRevision'];
  if (keys.every((key) => body[key] === undefined)) return null;
  if (
    !Number.isSafeInteger(body.expectedPrice) ||
    Number(body.expectedPrice) < 0 ||
    typeof body.expectedCurrency !== 'string' ||
    !/^[A-Z]{3}$/.test(body.expectedCurrency) ||
    !Number.isSafeInteger(body.expectedSlotRevision) ||
    Number(body.expectedSlotRevision) < 0
  )
    throw new Error(
      'Передайте expectedPrice, expectedCurrency и expectedSlotRevision из выбранного слота',
    );
  return {
    price: body.expectedPrice as number,
    currency: body.expectedCurrency,
    revision: body.expectedSlotRevision as number,
  };
}
export function bookingTime(timestamp: number | null, timeZone = 'UTC') {
  if (timestamp === null) return 'Время не задано';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(timestamp * 1000);
}
