/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { Localize } from '@/components/locale-provider';
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@/components/navigation-provider';
import { NavigationLink } from '@/components/navigation-link';
import { Command, Menu, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLite, useSiteName } from '@/components/engine-provider';

export function SiteHeader() {
  const lite = useLite();
  const { menu } = useNavigation();
  const name = useSiteName();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[role="dialog"], [data-slot="dialog-overlay"]')
      )
        return;
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [menuOpen]);

  return (
    <Localize>
      {
        <header
          ref={header}
          className="home-header relative z-20 border-b border-site-line bg-site-page/80 backdrop-blur-xl"
        >
          <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-8">
            <a
              href="/"
              className="flex min-w-0 max-w-56 items-center gap-3"
              aria-label={`${name} — на главную`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-site-raised text-site-ink">
                <Command className="size-5" />
              </span>
              <span className="truncate font-semibold tracking-[-0.02em]">
                {name}
              </span>
            </a>
            <nav
              aria-label="Главная навигация"
              className="hidden min-w-0 flex-1 flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-site-muted lg:flex"
            >
              {menu.map((item) => (
                <NavigationLink
                  key={item.id}
                  item={item}
                  className="inline-flex min-h-11 max-w-40 items-center truncate transition-colors hover:text-site-ink"
                />
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-site-muted hover:bg-site-raised hover:text-site-ink lg:hidden"
                aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
                ref={menuToggle}
                aria-controls="mobile-navigation"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                data-analytics="menu-open"
              >
                {menuOpen ? <X /> : <Menu />}
              </Button>
              {!lite && (
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-site-line bg-transparent px-3 text-sm font-medium text-site-ink transition-colors hover:bg-site-raised hover:text-site-ink"
                  href="/account"
                  aria-label="Личный кабинет"
                >
                  <UserRound className="size-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Кабинет</span>
                </a>
              )}
            </div>
          </div>
          {menuOpen && (
            <nav
              id="mobile-navigation"
              className="absolute inset-x-3 top-full mt-2 max-h-[70dvh] overflow-y-auto rounded-2xl border border-site-line bg-site-surface p-3 shadow-xl lg:hidden"
              aria-label="Мобильная навигация"
            >
              <div className="mx-auto grid max-w-7xl gap-1 text-sm">
                {menu.map((item) => (
                  <NavigationLink
                    key={item.id}
                    item={item}
                    onNavigate={closeMenu}
                    className="block break-words rounded-xl px-3 py-3 text-site-ink hover:bg-site-raised"
                  />
                ))}
                {!lite && (
                  <>
                    <a
                      href="/admin"
                      onClick={closeMenu}
                      className="rounded-xl px-3 py-3 text-site-ink hover:bg-site-raised"
                    >
                      Админка
                    </a>
                    <a
                      href="/account"
                      onClick={closeMenu}
                      className="rounded-xl px-3 py-3 text-site-ink hover:bg-site-raised"
                    >
                      Кабинет
                    </a>
                  </>
                )}
              </div>
            </nav>
          )}
        </header>
      }
    </Localize>
  );
}
