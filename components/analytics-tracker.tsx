'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLite } from '@/components/engine-provider';
import { Button } from '@/components/ui/button';
import { analyticsPath, analyticsPreference } from '@/lib/analytics-policy';

export function AnalyticsTracker() {
  const lite = useLite(),
    pathname = usePathname();
  const [enabled, setEnabled] = useState(false),
    [consent, setConsent] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(false);
  const path = analyticsPath(pathname);
  useEffect(() => {
    if (lite || !path) return;
    let active = true;
    const syncConsent = (event: StorageEvent) => {
      if (event.key === analyticsPreference || event.key === null)
        setConsent(event.newValue);
    };
    window.addEventListener('storage', syncConsent);
    void Promise.resolve().then(async () => {
      const blocked =
        navigator.doNotTrack === '1' ||
        (navigator as Navigator & { globalPrivacyControl?: boolean })
          .globalPrivacyControl === true;
      if (!active) return;
      setRestricted(blocked);
      if (blocked)
        void fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ consent: false }),
        }).catch(() => {});
      try {
        setConsent(localStorage.getItem(analyticsPreference));
      } catch {
        setConsent(null);
      }
      try {
        const response = await fetch('/api/analytics/events', {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (active && response.ok)
          setEnabled(((await response.json()) as { enabled: boolean }).enabled);
      } catch {
        if (active) setEnabled(false);
      }
    });
    return () => {
      active = false;
      window.removeEventListener('storage', syncConsent);
    };
  }, [lite, path]);
  useEffect(() => {
    if (lite || !path || !enabled || consent !== 'yes' || restricted) return;
    let active = true,
      queue = Promise.resolve(),
      pending = 0;
    const device =
      window.innerWidth < 768
        ? 'mobile'
        : window.innerWidth < 1024
          ? 'tablet'
          : 'desktop';
    const send = (kind: string, target = '', value?: number) => {
      if (!active || pending >= 20) return;
      let referrer = '';
      try {
        referrer = document.referrer ? new URL(document.referrer).origin : '';
      } catch {
        /* No referrer. */
      }
      const event = {
        id: crypto.randomUUID(),
        kind,
        path,
        target,
        device,
        ...(kind === 'page_view' ? { referrer } : {}),
        ...(value === undefined ? {} : { value }),
      };
      pending++;
      queue = queue
        .then(async () => {
          if (!active) return;
          const run = () =>
            fetch('/api/analytics/events', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ consent: true, event }),
              keepalive: true,
              signal: AbortSignal.timeout(5000),
            });
          let response = await run();
          if (response.status === 428 && active) response = await run();
          if (response.status === 429) active = false;
          if (response.ok) {
            const data = (await response.json()) as {
              enabled?: boolean;
              excluded?: boolean;
            };
            if (data.enabled === false || data.excluded) active = false;
          }
        })
        .catch(() => {
          /* Best effort; never interfere with navigation or chat. */
        })
        .finally(() => {
          pending--;
        });
    };
    send('page_view');
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>(
        '[data-analytics],a[href]',
      );
      if (!element || element.closest('[data-analytics-ignore]')) return;
      let target = element.dataset.analytics ?? '';
      if (!target && element instanceof HTMLAnchorElement) {
        const url = new URL(element.href, location.href);
        if (url.origin !== location.origin) target = 'other-link';
        else if (url.pathname === '/account') target = 'account';
        else if (url.pathname === '/login') target = 'login';
        else if (['#chat', '#quick', '#modules'].includes(url.hash))
          target = `tab:${url.hash.slice(1)}`;
        else target = url.pathname;
      }
      if (target) send('click', target);
    };
    let maxScroll = 0;
    const scroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      const percent = Math.floor((window.scrollY / height) * 4) * 25;
      if (percent >= 25 && percent > maxScroll) {
        maxScroll = Math.min(percent, 100);
        send('scroll', '', maxScroll);
      }
    };
    const timer = window.setInterval(() => {
      if (!document.hidden) send('engagement', '', 15);
    }, 15000);
    document.addEventListener('click', click, true);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('click', click, true);
      window.removeEventListener('scroll', scroll);
    };
  }, [lite, path, enabled, consent, restricted]);
  function choose(value: string) {
    setConsent(value);
    try {
      localStorage.setItem(analyticsPreference, value);
    } catch {
      /* Choice is still respected for this mount. */
    }
    if (value !== 'yes')
      void fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ consent: false }),
        keepalive: true,
      }).catch(() => {});
  }
  if (lite || !path || !enabled || restricted) return null;
  return consent === 'yes' || consent === 'no' ? (
    <div data-analytics-ignore className="px-4 py-2 text-center">
      <Button
        variant="ghost"
        className="min-h-11 text-sm"
        onClick={() => choose(consent === 'yes' ? 'no' : '')}
      >
        {consent === 'yes'
          ? 'Отключить аналитику посещений'
          : 'Настроить аналитику посещений'}
      </Button>
    </div>
  ) : (
    <section
      data-analytics-ignore
      aria-label="Настройки аналитики"
      className="mx-auto my-4 max-w-3xl rounded-2xl border border-site-line bg-site-surface p-4 text-site-ink sm:p-5"
    >
      <p className="text-base leading-6">
        Разрешить внутреннюю аналитику посещений? Владелец увидит источник
        перехода, страницы, клики и связь визита с диалогом. Без записи
        клавиатуры и полей форм. Сам чат сохраняет переписку независимо от этого
        выбора.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => choose('no')}
        >
          Не разрешать
        </Button>
        <Button className="min-h-11" onClick={() => choose('yes')}>
          Разрешить
        </Button>
      </div>
    </section>
  );
}
