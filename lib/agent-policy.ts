export const scopeLabels: Record<string, string> = {
  'content:read': 'Чтение публичных страниц',
  'tickets:read': 'Чтение обращений',
  'tickets:write': 'Сообщения и статусы обращений',
  'catalog:read': 'Чтение каталога',
  'catalog:write': 'Изменение каталога',
  'orders:read': 'Чтение заказов',
  'orders:write': 'Создание и изменение заказов',
  'checkout:write': 'Получение ссылки оплаты',
  'site:read': 'Чтение настроек сайта',
  'site:write': 'Изменение настроек сайта',
  'pages:read': 'Чтение страниц',
  'pages:write': 'Изменение страниц',
  'assistant:read': 'Чтение контекста ассистента',
  'assistant:write': 'Изменение ассистента',
  'customers:read': 'Чтение клиентов',
  'customers:write': 'Изменение клиентов',
  'bookings:read': 'Чтение бронирований',
  'bookings:write': 'Изменение бронирований',
  'integrations:read': 'Чтение интеграций',
  'integrations:write': 'Изменение интеграций',
  'conversations:read': 'Чтение диалогов',
  'files:read': 'Чтение файлов',
  'files:write': 'Загрузка и удаление файлов',
};
export const customerScopes = [
  'content:read',
  'tickets:read',
  'tickets:write',
  'catalog:read',
  'orders:read',
  'orders:write',
  'checkout:write',
  'bookings:read',
  'bookings:write',
  'files:read',
  'files:write',
];
export const isAgentOwner = (role: string) =>
  role === 'owner' || role === 'admin';
export function validScopes(
  value: unknown,
  role: string,
  confirmFullAccess: unknown = false,
): string[] | null {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > Object.keys(scopeLabels).length ||
    value.some((s) => typeof s !== 'string')
  )
    return null;
  const scopes = [...new Set(value as string[])];
  if (scopes.includes('*'))
    return isAgentOwner(role) &&
      scopes.length === 1 &&
      confirmFullAccess === true
      ? scopes
      : null;
  return scopes.every(
    (s) =>
      Object.hasOwn(scopeLabels, s) &&
      (isAgentOwner(role) ||
        (role === 'customer' && customerScopes.includes(s))),
  )
    ? scopes
    : null;
}
export function hasScope(scopes: string[], required: string) {
  return scopes.includes('*') || scopes.includes(required);
}
export const toolScopes: Record<string, string[]> = {
  list_tickets: ['tickets:read'],
  get_ticket: ['tickets:read'],
  create_ticket: ['tickets:write'],
  update_ticket: ['tickets:write'],
  site_config_get: ['site:read'],
  site_config_update: ['site:write'],
  site_config_history: ['site:read'],
  site_config_restore: ['site:read', 'site:write'],
  navigation_get: ['site:read'],
  navigation_update: ['site:write'],
  navigation_history: ['site:read'],
  navigation_restore: ['site:read', 'site:write'],
  site_get: ['site:read', 'assistant:read', 'pages:read', 'catalog:read'],
  site_update_settings: ['site:write'],
  list_pages: ['pages:read'],
  upsert_page: ['pages:write'],
  delete_page: ['pages:write'],
  page_history: ['pages:read'],
  restore_page: ['pages:read', 'pages:write'],
  get_page_markdown: ['content:read'],
  get_assistant: ['assistant:read'],
  assistant_history: ['assistant:read'],
  restore_assistant: ['assistant:read', 'assistant:write'],
  update_assistant: ['assistant:write'],
  list_customers: ['customers:read'],
  get_customer: ['customers:read'],
  customer_history: ['customers:read'],
  create_customer: ['customers:write'],
  update_customer: ['customers:write'],
  delete_customer: ['customers:write'],
  list_products: ['catalog:read'],
  upsert_product: ['catalog:write'],
  delete_product: ['catalog:write'],
  create_order: ['orders:write'],
  list_orders: ['orders:read'],
  get_order: ['orders:read'],
  update_order: ['orders:write'],
  checkout_order: ['checkout:write'],
  list_bookings: ['bookings:read'],
  list_booking_slots: ['bookings:read'],
  list_booking_activity: ['bookings:read'],
  list_booking_schedule: ['bookings:read'],
  get_booking: ['bookings:read'],
  create_booking: ['bookings:write'],
  checkout_booking: ['bookings:write'],
  refund_booking: ['bookings:write'],
  manage_booking_schedule: ['bookings:write'],
  update_booking: ['bookings:write'],
  list_integrations: ['integrations:read'],
  upsert_integration: ['integrations:write'],
  list_conversations: ['conversations:read'],
  list_files: ['files:read'],
  get_file: ['files:read'],
  delete_file: ['files:write'],
};
const customerTools = [
  'get_page_markdown',
  'list_tickets',
  'get_ticket',
  'create_ticket',
  'update_ticket',
  'list_files',
  'get_file',
  'delete_file',
  'list_products',
  'create_order',
  'list_orders',
  'get_order',
  'update_order',
  'checkout_order',
  'list_bookings',
  'list_booking_slots',
  'get_booking',
  'create_booking',
  'checkout_booking',
  'update_booking',
];
export function toolAllowed(role: string, scopes: string[], name: string) {
  // Existing owner page-reader tokens retain public Markdown access.
  if (
    name === 'get_page_markdown' &&
    isAgentOwner(role) &&
    hasScope(scopes, 'pages:read')
  )
    return true;
  if (
    !isAgentOwner(role) &&
    !(role === 'customer' && customerTools.includes(name))
  )
    return false;
  return (
    Object.hasOwn(toolScopes, name) &&
    toolScopes[name].every((s) => hasScope(scopes, s))
  );
}
export function bearerRouteAllowed(
  path: string,
  method: string,
  scopes: string[],
) {
  if (
    path === '/api/tokens' ||
    path === '/api/patient-agent' ||
    path.startsWith('/api/updates')
  )
    return false;
  if (path === '/api/mcp') return true; // Each tool is authorized separately.
  const read = method === 'GET' || method === 'HEAD';
  if (/^\/api\/customers\/[^/]+\/history$/.test(path))
    return read && hasScope(scopes, 'customers:read');
  if (/^\/api\/files\/[^/]+\/download$/.test(path))
    return read && hasScope(scopes, 'files:read');
  if (/^\/api\/pages\/[^/]+\/history$/.test(path))
    return read && hasScope(scopes, 'pages:read');
  if (/^\/api\/pages\/[^/]+\/restore$/.test(path))
    return (
      method === 'POST' &&
      hasScope(scopes, 'pages:read') &&
      hasScope(scopes, 'pages:write')
    );
  if (/^\/api\/orders\/[^/]+\/checkout$/.test(path))
    return method === 'POST' && hasScope(scopes, 'checkout:write');
  if (/^\/api\/bookings\/[^/]+\/checkout$/.test(path))
    return method === 'POST' && hasScope(scopes, 'bookings:write');
  const resources: Record<string, string> = {
    tickets: 'tickets',
    products: 'catalog',
    orders: 'orders',
    bookings: 'bookings',
    'booking-slots': 'bookings',
    'booking-activity': 'bookings',
    pages: 'pages',
    settings: 'site',
    'site-config': 'site',
    navigation: 'site',
    assistant: 'assistant',
    customers: 'customers',
    conversations: 'conversations',
    files: 'files',
  };
  const resource = /^\/api\/([^/]+)(?:\/[^/]+)?$/.exec(path)?.[1];
  if (!resource || !Object.hasOwn(resources, resource))
    return scopes.includes('*');
  return hasScope(scopes, `${resources[resource]}:${read ? 'read' : 'write'}`);
}

export function validateToolArguments(
  schema: Record<string, unknown>,
  value: unknown,
): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return 'arguments должен быть объектом';
  const input = value as Record<string, unknown>;
  const properties = (schema.properties ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  for (const key of (schema.required ?? []) as string[])
    if (input[key] === undefined) return `Обязательное поле: ${key}`;
  for (const [key, item] of Object.entries(input)) {
    if (!Object.hasOwn(properties, key)) return `Неизвестное поле: ${key}`;
    const rule = properties[key];
    if (rule.type === 'string' && typeof item !== 'string')
      return `Ожидается строка: ${key}`;
    if (rule.type === 'boolean' && typeof item !== 'boolean')
      return `Ожидается boolean: ${key}`;
    if (
      rule.type === 'integer' &&
      (typeof item !== 'number' || !Number.isInteger(item))
    )
      return `Ожидается целое число: ${key}`;
    if (rule.type === 'array' && !Array.isArray(item))
      return `Ожидается массив: ${key}`;
    if (
      rule.type === 'object' &&
      (!item || typeof item !== 'object' || Array.isArray(item))
    )
      return `Ожидается объект: ${key}`;
    if (Array.isArray(rule.enum) && !rule.enum.includes(item))
      return `Недопустимое значение: ${key}`;
    if (
      typeof item === 'string' &&
      ((typeof rule.minLength === 'number' && item.length < rule.minLength) ||
        item.length >
          (typeof rule.maxLength === 'number' ? rule.maxLength : 16000))
    )
      return `Недопустимая длина: ${key}`;
    if (
      typeof item === 'number' &&
      ((typeof rule.minimum === 'number' && item < rule.minimum) ||
        (typeof rule.maximum === 'number' && item > rule.maximum))
    )
      return `Недопустимое число: ${key}`;
  }
  return null;
}
