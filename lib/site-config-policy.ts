export type SiteConfig = {
  name: string;
  description: string;
  locale: 'ru' | 'en' | 'es' | 'he';
  theme: 'northstar' | 'editorial' | 'ocean';
  backgroundImage: string;
};
export const defaultSiteConfig: SiteConfig = {
  name: 'Northstar',
  description:
    'AI-консультант отвечает на вопросы, подбирает услуги и помогает оформить заказ.',
  locale: 'ru',
  theme: 'northstar',
  backgroundImage: '',
};
export const managedSettingKeys = [
  'public.siteName',
  'public.description',
  'public.locale',
  'theme.template',
  'public.backgroundImage',
];
function cleanText(
  value: unknown,
  field: string,
  max: number,
  empty = false,
): string {
  if (typeof value !== 'string')
    throw new Error(`Поле ${field} должно быть строкой`);
  const text = value.trim();
  if ((!empty && !text) || text.length > max)
    throw new Error(`Проверьте длину поля ${field}: максимум ${max}`);
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) < 32 || text.charCodeAt(i) === 127)
      throw new Error(`Управляющие символы в поле ${field} недопустимы`);
  }
  return text;
}
export function validateSiteConfig(raw: unknown): SiteConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Требуется объект настроек');
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((k) => !Object.hasOwn(defaultSiteConfig, k)))
    throw new Error('Неизвестное поле настроек');
  const name = cleanText(value.name, 'name', 100);
  const description = cleanText(value.description, 'description', 320, true);
  const backgroundImage = cleanText(
    value.backgroundImage,
    'backgroundImage',
    2048,
    true,
  );
  if (
    value.locale !== 'ru' &&
    value.locale !== 'en' &&
    value.locale !== 'es' &&
    value.locale !== 'he'
  )
    throw new Error('Язык контента: ru, en, es или he');
  if (
    value.theme !== 'northstar' &&
    value.theme !== 'editorial' &&
    value.theme !== 'ocean'
  )
    throw new Error('Неизвестная тема');
  if (backgroundImage) {
    if (backgroundImage.includes('\\'))
      throw new Error('Обратные слеши в URL недопустимы');
    const url = new URL(backgroundImage, 'https://site.invalid');
    const local =
      backgroundImage.startsWith('/') && !backgroundImage.startsWith('//');
    if (
      (!local && !backgroundImage.startsWith('https://')) ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password
    )
      throw new Error(
        'Фон: путь /images/… или HTTPS-ссылка без логина и пароля',
      );
  }
  return {
    name,
    description,
    locale: value.locale,
    theme: value.theme,
    backgroundImage,
  };
}
export function legacySiteSettings(value: SiteConfig) {
  return [
    { key: 'public.siteName', value: { text: value.name } },
    { key: 'public.description', value: { text: value.description } },
    { key: 'public.locale', value: { code: value.locale } },
    { key: 'theme.template', value: { id: value.theme } },
    { key: 'public.backgroundImage', value: { url: value.backgroundImage } },
  ];
}
// Import only known public fields. Never include extension settings or credentials.
export function importLegacySiteConfig(
  rows: { key: string; value: unknown }[],
) {
  let value = { ...defaultSiteConfig };
  const warnings: string[] = [];
  const fields = [
    'name',
    'description',
    'locale',
    'theme',
    'backgroundImage',
  ] as const;
  const properties = ['text', 'text', 'code', 'id', 'url'];
  managedSettingKeys.forEach((key, index) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    try {
      const data = row.value as Record<string, unknown> | null;
      value = validateSiteConfig({
        ...value,
        [fields[index]]: data?.[properties[index]],
      });
    } catch {
      warnings.push(
        `Проверьте старое значение ${key}: используется безопасное значение по умолчанию`,
      );
    }
  });
  return { value, warnings };
}
