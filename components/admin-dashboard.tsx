/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  BookOpen,
  CalendarDays,
  ArrowUpRight,
  BarChart3,
  ShoppingBag,
  Package,
  PanelLeft,
  UserRound,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Palette,
  PlugZap,
  SlidersHorizontal,
  Users,
  Workflow,
  Menu,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { DesignTemplates } from '@/components/design-templates';
import { OrderList } from '@/components/order-list';
import { CatalogAdmin } from '@/components/catalog-admin';
import { EngineUpdates } from '@/components/engine-updates';
import { AssistantEditor } from '@/components/assistant-editor';
import { CustomerEditor } from '@/components/customer-editor';
import { FileManager } from '@/components/file-manager';
import { AgentAccess } from '@/components/agent-access';
import { AiModels } from '@/components/ai-models';
import { KnowledgeEditor } from '@/components/knowledge-editor';
import { IntegrationsEditor } from '@/components/integrations-editor';
import { BookingPanel } from '@/components/booking-panel';
import { TicketPanel } from '@/components/ticket-panel';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { AdminOverview } from '@/components/admin-overview';
import { BillingConsole } from '@/components/billing-console';
import { NavigationEditor } from '@/components/navigation-editor';
import { isAdministrator } from '@/lib/access-policy';
import { PageEditor } from '@/components/page-editor';
import { useSiteName } from '@/components/engine-provider';
import { Button } from '@/components/ui/button';

const groups = [
  {
    title: 'Работа',
    items: [
      { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
      { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
      { id: 'customers', label: 'Клиенты', icon: Users },
      { id: 'bookings', label: 'Бронирования', icon: CalendarDays },
      { id: 'orders', label: 'Заказы', icon: ShoppingBag },
      { id: 'tickets', label: 'Обращения', icon: MessageSquareText },
    ],
  },
  {
    title: 'AI и знания',
    items: [
      { id: 'assistant', label: 'Ассистент', icon: Bot },
      { id: 'models', label: 'Модели', icon: SlidersHorizontal },
      { id: 'knowledge', label: 'База знаний', icon: BookOpen },
      { id: 'agents', label: 'AI-агенты', icon: Workflow },
    ],
  },
  {
    title: 'Сайт',
    items: [
      { id: 'pages', label: 'Страницы', icon: FileText },
      { id: 'navigation', label: 'Навигация', icon: Menu },
      { id: 'catalog', label: 'Каталог', icon: Package },
      { id: 'design', label: 'Дизайн', icon: Palette },
      { id: 'files', label: 'Файлы', icon: FileText },
    ],
  },
  {
    title: 'Система',
    items: [
      { id: 'billing', label: 'Подписки и расходы', icon: CalendarDays },
      { id: 'integrations', label: 'Интеграции', icon: PlugZap },
      { id: 'updates', label: 'Обновления', icon: Workflow },
    ],
  },
];
const nav = groups.flatMap((group) => group.items);

export function AdminDashboard() {
  const siteName = useSiteName();
  const [active, setActive] = useState('Обзор');
  const [menuOpen, setMenuOpen] = useState(false);
  function navigate(section: string) {
    const item = nav.find((item) => item.label === section);
    if (!item) return;
    if (window.location.hash !== '#' + item.id)
      window.history.pushState(null, '', '#' + item.id);
    setActive(section);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  useEffect(() => {
    const sync = () => {
      setActive(
        nav.find((item) => '#' + item.id === window.location.hash)?.label ??
          'Обзор',
      );
      setMenuOpen(false);
    };
    void Promise.resolve().then(sync);
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    const desktop = window.matchMedia('(min-width: 1024px)');
    const close = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', close);
    return () => {
      desktop.removeEventListener('change', close);
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    void fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) {
          window.location.href = '/login?next=%2Fadmin';
          return;
        }
        const data = (await response.json()) as { user: { role: string } };
        if (!isAdministrator(data.user.role)) {
          window.location.replace('/account');
          return;
        }
        setCheckingAccess(false);
      })
      .catch(() => {
        window.location.href = '/login?next=%2Fadmin';
      });
  }, []);

  const navigation = (mobile = false) => (
    <nav
      aria-label={
        mobile ? 'Мобильные разделы управления' : 'Разделы управления'
      }
      className="admin-navigation"
    >
      {groups.map((group) => (
        <div key={group.title} className="admin-nav-group">
          <p className="admin-nav-label">{group.title}</p>
          {group.items.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={'#' + id}
              aria-current={active === label ? 'page' : undefined}
              onClick={(event) => {
                if (
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                navigate(label);
              }}
              className="admin-nav-item"
            >
              <Icon
                className="size-[18px] shrink-0"
                aria-hidden="true"
                strokeWidth={1.6}
              />
              <span>{label}</span>
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
  if (checkingAccess)
    return (
      <output className="grid min-h-dvh place-items-center bg-site-page text-sm text-site-muted">
        Проверка доступа…
      </output>
    );
  return (
    <div className="admin-console dashboard-screen min-h-dvh bg-site-page text-site-ink">
      <a
        className="admin-skip"
        href="#admin-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('admin-main')?.focus();
        }}
      >
        К содержимому
      </a>
      <header className="admin-header dashboard-header">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" className="size-11 shrink-0 lg:hidden" />
            }
            aria-label="Открыть разделы админки"
          >
            <PanelLeft className="size-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="admin-theme admin-drawer dashboard-menu data-[side=left]:w-[min(20rem,calc(100%_-_1rem))] border-site-line bg-site-surface text-site-ink"
          >
            <div className="flex items-start justify-between gap-2 border-b border-site-line p-4">
              <div>
                <SheetTitle className="text-site-ink">{siteName}</SheetTitle>
                <SheetDescription className="mt-1 text-site-muted">
                  Управление сайтом
                </SheetDescription>
              </div>
              <SheetClose
                render={<Button variant="ghost" className="size-11 shrink-0" />}
                aria-label="Закрыть разделы"
              >
                <X />
              </SheetClose>
            </div>
            <div className="min-h-0 overflow-y-auto px-3 pb-6">
              {navigation(true)}
            </div>
          </SheetContent>
        </Sheet>
        <a
          href="/admin"
          className="admin-brand"
          aria-label={siteName + ' — обзор админки'}
        >
          <span className="admin-brand-mark" aria-hidden="true">
            {siteName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate">{siteName}</span>
        </a>
        <span className="admin-header-label">Управление</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <a
            href="/account"
            className="admin-header-link hidden sm:inline-flex"
          >
            <UserRound className="size-4" />
            Кабинет
          </a>
          <a href="/" className="admin-header-link">
            <span className="hidden sm:inline">Открыть сайт</span>
            <span className="sm:hidden">На сайт</span>
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </header>
      <div className="admin-workspace">
        <aside className="admin-sidebar">
          {navigation()}
          <a className="admin-sidebar-account" href="/account">
            <UserRound className="size-4" />
            Личный кабинет
            <ArrowUpRight className="ml-auto size-4" />
          </a>
        </aside>
        <main id="admin-main" tabIndex={-1} className="admin-main">
          <div className="admin-content">
            <div className="admin-page-heading">
              <p className="admin-eyebrow">
                {
                  groups.find((group) =>
                    group.items.some((item) => item.label === active),
                  )?.title
                }
              </p>
              <h1>{active === 'Обзор' ? 'Обзор сайта' : active}</h1>
              {active === 'Обзор' && (
                <p className="admin-description">
                  Состояние сайта и задачи, которые требуют внимания
                </p>
              )}
            </div>
            {active === 'Обзор' && <AdminOverview onNavigate={navigate} />}
            {active === 'Подписки и расходы' && <BillingConsole />}
            {active === 'Дизайн' && <DesignTemplates />}
            {active === 'Ассистент' && <AssistantEditor />}
            {active === 'Модели' && <AiModels />}
            {active === 'Клиенты' && <CustomerEditor />}
            {active === 'Страницы' && <PageEditor />}
            {active === 'Навигация' && <NavigationEditor />}
            {active === 'Файлы' && <FileManager admin />}
            {active === 'Обращения' && <TicketPanel admin />}
            {active === 'Аналитика' && <AnalyticsDashboard />}
            {active === 'Каталог' && <CatalogAdmin />}
            {active === 'Заказы' && <OrderList admin />}
            {active === 'Бронирования' && <BookingPanel admin />}
            {active === 'Обновления' && <EngineUpdates />}
            {active === 'AI-агенты' && <AgentAccess />}
            {active === 'База знаний' && <KnowledgeEditor />}
            {active === 'Интеграции' && <IntegrationsEditor />}
          </div>
        </main>
      </div>
    </div>
  );
}
