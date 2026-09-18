export function recordFields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new Error('Неизвестное поле запроса');
}
export function expectedRevision(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('Требуется целая revision >= 0');
  return value;
}
function bounded(value: unknown, maximum: number, label: string, empty = true) {
  if (
    typeof value !== 'string' ||
    value.length > maximum ||
    (!empty && !value.trim()) ||
    Array.from(value).some((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
    })
  )
    throw new Error(`Некорректное поле: ${label}`);
  return value.trim();
}
export const defaultAssistant = {
  name: 'Northstar',
  systemPrompt: '',
  defaultLocale: 'ru',
  status: 'active',
};
export type AssistantConfig = typeof defaultAssistant;
export function assistantInput(
  body: Record<string, unknown>,
): Partial<AssistantConfig> {
  const result: Partial<AssistantConfig> = {};
  for (const key of [
    'name',
    'systemPrompt',
    'defaultLocale',
    'status',
  ] as const)
    if (body[key] !== undefined) {
      result[key] = bounded(
        body[key],
        key === 'systemPrompt' ? 16000 : key === 'name' ? 120 : 35,
        key,
        key === 'systemPrompt',
      );
    }
  if (
    result.defaultLocale &&
    !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(result.defaultLocale)
  )
    throw new Error('Некорректный язык');
  if (result.status && !['active', 'disabled'].includes(result.status))
    throw new Error('Статус: active или disabled');
  if (!Object.keys(result).length) throw new Error('Нет полей для изменения');
  return result;
}
export function customerInput(body: Record<string, unknown>, create = false) {
  const result: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    password?: string;
  } = {};
  if (create || body.email !== undefined) {
    result.email = bounded(body.email, 254, 'email', false).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))
      throw new Error('Некорректный email');
  }
  for (const key of ['firstName', 'lastName', 'phone'] as const)
    if (body[key] !== undefined) {
      result[key] = bounded(body[key], key === 'phone' ? 40 : 120, key) || null;
      if (
        key === 'phone' &&
        result.phone &&
        !/^[+0-9() .-]{3,40}$/.test(result.phone)
      )
        throw new Error('Некорректный телефон');
    }
  if (body.password !== undefined) {
    if (
      !create ||
      typeof body.password !== 'string' ||
      body.password.length < 8 ||
      body.password.length > 256
    )
      throw new Error('Пароль при создании: от 8 до 256 символов');
    result.password = body.password;
  }
  if (!Object.keys(result).length) throw new Error('Нет полей для изменения');
  return result;
}
