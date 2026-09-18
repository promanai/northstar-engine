export type NavigationItem = {
  id: string;
  label: string;
  kind: 'section' | 'page' | 'catalog';
  target: string;
  visible: boolean;
  presentation: 'navigate' | 'modal';
};
export type NavigationConfig = {
  menu: NavigationItem[];
  tabs: NavigationItem[];
};
function containsControl(value: string) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}
export type PublicNavigationItem = NavigationItem & { href: string };
export type PublicNavigation = {
  menu: PublicNavigationItem[];
  tabs: PublicNavigationItem[];
};
export const defaultNavigation: NavigationConfig = {
  menu: [
    {
      id: 'assistant',
      label: 'Ассистент',
      kind: 'section',
      target: 'chat',
      visible: true,
      presentation: 'navigate',
    },
    {
      id: 'features',
      label: 'Возможности',
      kind: 'section',
      target: 'modules',
      visible: true,
      presentation: 'navigate',
    },
    {
      id: 'catalog',
      label: 'Каталог',
      kind: 'catalog',
      target: 'catalog',
      visible: true,
      presentation: 'navigate',
    },
  ],
  tabs: [
    {
      id: 'chat',
      label: 'Чат',
      kind: 'section',
      target: 'chat',
      visible: true,
      presentation: 'navigate',
    },
    {
      id: 'quick',
      label: 'О сервисе',
      kind: 'section',
      target: 'quick',
      visible: true,
      presentation: 'navigate',
    },
    {
      id: 'modules',
      label: 'Возможности',
      kind: 'section',
      target: 'modules',
      visible: true,
      presentation: 'navigate',
    },
  ],
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Ожидается объект навигации');
  return value as Record<string, unknown>;
}
export function validateNavigation(value: unknown): NavigationConfig {
  const root = object(value);
  if (Object.keys(root).some((k) => !['menu', 'tabs'].includes(k)))
    throw new Error('Неизвестное поле навигации');
  const parse = (key: 'menu' | 'tabs') => {
    const list = root[key];
    if (!Array.isArray(list) || list.length > 12)
      throw new Error('В меню и вкладках допускается до 12 пунктов');
    const ids = new Set<string>(),
      destinations = new Set<string>();
    return list.map((entry) => {
      const item = object(entry);
      if (
        Object.keys(item).some(
          (k) =>
            ![
              'id',
              'label',
              'kind',
              'target',
              'visible',
              'presentation',
            ].includes(k),
        )
      )
        throw new Error('Неизвестное поле пункта');
      if (
        typeof item.id !== 'string' ||
        !/^[a-z][a-z0-9-]{0,39}$/.test(item.id) ||
        ids.has(item.id)
      )
        throw new Error(
          'ID пунктов должны быть уникальными: латинские буквы, цифры, дефис',
        );
      ids.add(item.id);
      if (
        typeof item.label !== 'string' ||
        !item.label.trim() ||
        item.label.length > 48 ||
        containsControl(item.label)
      )
        throw new Error('Название должно содержать от 1 до 48 символов');
      if (
        typeof item.kind !== 'string' ||
        !['section', 'page', 'catalog'].includes(item.kind) ||
        typeof item.target !== 'string' ||
        item.target.length > 100
      )
        throw new Error('Некорректное назначение пункта');
      if (
        item.kind === 'section' &&
        !['chat', 'quick', 'modules'].includes(item.target)
      )
        throw new Error('Неизвестный раздел главной');
      if (item.kind === 'page' && !/^[a-zA-Z0-9_-]{1,100}$/.test(item.target))
        throw new Error('Укажите ID страницы');
      if (
        item.kind === 'catalog' &&
        (item.target !== 'catalog' || key === 'tabs')
      )
        throw new Error('Каталог доступен как пункт меню');
      if (
        typeof item.visible !== 'boolean' ||
        typeof item.presentation !== 'string' ||
        !['navigate', 'modal'].includes(item.presentation)
      )
        throw new Error('Укажите видимость и способ открытия');
      if (
        item.presentation === 'modal' &&
        (item.kind !== 'page' || key === 'tabs')
      )
        throw new Error('Модальное окно доступно только для страницы в меню');
      if (key === 'tabs' && item.kind === 'section' && item.id !== item.target)
        throw new Error('ID встроенной вкладки должен совпадать с разделом');
      if (
        key === 'tabs' &&
        item.kind === 'page' &&
        ['chat', 'quick', 'modules'].includes(item.id)
      )
        throw new Error('ID вкладки зарезервирован');
      const destination = `${item.kind}:${item.target}`;
      if (destinations.has(destination))
        throw new Error('Назначения пунктов не должны повторяться');
      destinations.add(destination);
      return { ...item, label: item.label.trim() } as NavigationItem;
    });
  };
  const menu = parse('menu'),
    tabs = parse('tabs');
  if (
    !tabs.some((t) => t.kind === 'section' && t.target === 'chat' && t.visible)
  )
    throw new Error('Вкладка чата должна оставаться видимой');
  for (const item of menu)
    if (
      item.visible &&
      item.kind === 'section' &&
      !tabs.some(
        (t) => t.visible && t.kind === 'section' && t.target === item.target,
      )
    )
      throw new Error('Пункт меню ссылается на скрытую вкладку');
  return { menu, tabs };
}
export function resolveNavigation(
  config: NavigationConfig,
  published: Array<{ id: string; slug: string }>,
): PublicNavigation {
  const resolve = (items: NavigationItem[]) =>
    items.flatMap((item) => {
      if (!item.visible) return [];
      const slug =
        item.kind === 'page'
          ? published.find((p) => p.id === item.target)?.slug
          : null;
      if (item.kind === 'page' && !slug) return [];
      return [
        {
          ...item,
          href:
            slug ?? (item.kind === 'catalog' ? '/catalog' : `/#${item.target}`),
        },
      ];
    });
  return { menu: resolve(config.menu), tabs: resolve(config.tabs) };
}
