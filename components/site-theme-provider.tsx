/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { useEffect, useState } from 'react';
import { defaultTheme, isThemeId, themes, type ThemeId } from '@/lib/themes';
import { useLite, useSiteConfig } from '@/components/engine-provider';

function applyTheme(value: unknown) {
  document.documentElement.dataset.siteTheme = isThemeId(value)
    ? value
    : defaultTheme;
}
function applyBackgroundImage(value: unknown) {
  const valid =
    typeof value === 'string' &&
    (/^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value));
  document.documentElement.style.setProperty(
    '--site-background-image',
    valid ? `url(${JSON.stringify(value)})` : 'none',
  );
}

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const lite = useLite();
  const [preview, setPreview] = useState<ThemeId | null>(null);
  const config = useSiteConfig();
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      'theme-preview',
    );
    const previewId = isThemeId(requested) ? requested : null;
    applyTheme(previewId ?? config.theme);
    applyBackgroundImage(config.backgroundImage);
    void Promise.resolve().then(() => setPreview(previewId));
  }, [config]);
  return (
    <>
      {preview && (
        <aside
          aria-label="Предпросмотр темы"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-b border-site-line bg-site-raised px-4 py-3 text-sm text-site-ink"
        >
          <span>
            Предпросмотр · {themes.find((theme) => theme.id === preview)?.name}
          </span>
          <span className="text-xs text-site-muted">
            Тема сайта не изменена
          </span>
          <a
            href={`/catalog?theme-preview=${preview}`}
            className="underline underline-offset-4"
          >
            Каталог
          </a>
          {!lite && (
            <a
              href={`/login?theme-preview=${preview}`}
              className="underline underline-offset-4"
            >
              Вход
            </a>
          )}
          <a href="/" className="underline underline-offset-4">
            Закрыть
          </a>
        </aside>
      )}
      {children}
    </>
  );
}
