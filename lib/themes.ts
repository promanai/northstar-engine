export const themes = [
  {
    id: 'northstar',
    name: 'Northstar',
    description: 'Тёмный графитовый шаблон со спокойными голубыми акцентами.',
    colors: ['#0f141a', '#171e26', '#b6cce5'],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Светлый журнальный шаблон для экспертных услуг и брендов.',
    colors: ['#f4efe6', '#fffaf2', '#d65a45'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Спокойный сине-голубой шаблон для сервисов и SaaS.',
    colors: ['#071525', '#0d2236', '#5ee7ff'],
  },
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export const defaultTheme: ThemeId = 'northstar';
export function isThemeId(value: unknown): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
