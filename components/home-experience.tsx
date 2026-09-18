/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { Localize } from '@/components/locale-provider';
import { useEffect, useState } from 'react';
import { CheckCircle2, Globe2, ShieldCheck, Zap } from 'lucide-react';
import { useNavigation } from '@/components/navigation-provider';
import { PublishedPageContent } from '@/components/navigation-link';
import { ChatPanel } from '@/components/chat-panel';
import { useLite } from '@/components/engine-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const benefits = [
  {
    icon: Zap,
    title: 'Быстрый ответ',
    text: 'Ассистент ведёт диалог и помогает перейти к конкретному действию.',
  },
  {
    icon: ShieldCheck,
    title: 'Контекст бизнеса',
    text: 'Ответы опираются на инструкции владельца, каталог и историю обращения.',
  },
  {
    icon: Globe2,
    title: 'Всегда доступен',
    text: 'Получите помощь в удобное время и на вашем языке.',
  },
];
const capabilities = [
  'Подбор услуги в чате',
  'Запись и оформление заказа',
  'История диалога',
  'Личный кабинет',
  'Каталог с ценами',
  'Ответы на языке клиента',
];
export function HomeExperience() {
  const lite = useLite();
  const { tabs: sections } = useNavigation();
  const [activeTab, setActiveTab] = useState('chat');
  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1);
      setActiveTab(sections.some((item) => item.id === id) ? id : 'chat');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [sections]);
  function selectTab(value: unknown) {
    const id = sections.find((item) => item.id === value)?.id;
    if (!id) return;
    setActiveTab(id);
    window.history.replaceState(window.history.state, '', `#${id}`);
  }
  return (
    <Localize>
      {
        <section
          id="chat"
          className="home-workspace relative px-3 py-3 sm:px-8 sm:py-5"
        >
          <h1 className="sr-only">Чат с консультантом</h1>
          <div id="modules" className="mx-auto max-w-4xl">
            <Tabs
              value={activeTab}
              onValueChange={selectTab}
              className="gap-3 sm:gap-4"
            >
              <TabsList
                aria-label="Разделы главной страницы"
                className="home-tabs grid h-auto gap-1 rounded-2xl border border-site-line bg-site-surface p-1"
              >
                {sections.map(({ id, label }) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    data-analytics={
                      ['chat', 'quick', 'modules'].includes(id)
                        ? `tab:${id}`
                        : 'tab:page'
                    }
                    className="rounded-xl px-2 py-2 text-sm"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent
                value="chat"
                keepMounted
                className="data-[hidden]:hidden"
              >
                <ChatPanel />
              </TabsContent>
              <TabsContent
                value="quick"
                keepMounted
                className="home-panel data-[hidden]:hidden"
              >
                <h2 className="text-2xl font-semibold">
                  Как помогает консультант
                </h2>
                <div className="mt-7 grid gap-5 sm:grid-cols-3">
                  {benefits.map(({ icon: Icon, title, text }) => (
                    <article
                      key={title}
                      className="border-t border-site-line pt-5"
                    >
                      <Icon className="size-5 text-site-accent-ink" />
                      <h3 className="mt-4 text-base font-semibold">{title}</h3>
                      <p className="mt-2 text-base leading-7 text-site-muted">
                        {lite && title === 'Контекст бизнеса'
                          ? 'Ответы опираются на описание бизнеса и публичный каталог.'
                          : text}
                      </p>
                    </article>
                  ))}
                </div>
                <button
                  onClick={() => selectTab('chat')}
                  className="mt-7 rounded-xl bg-site-accent px-4 py-3 text-sm font-medium text-site-on-accent hover:bg-site-accent-hover"
                >
                  Задать вопрос
                </button>
              </TabsContent>
              <TabsContent
                value="modules"
                keepMounted
                className="home-panel data-[hidden]:hidden"
              >
                <h2 className="text-2xl font-semibold">Чем можем помочь</h2>
                <div className="my-7 grid gap-3 sm:grid-cols-2">
                  {(lite
                    ? [
                        'Подбор услуги в чате',
                        'Каталог с ценами',
                        'Ответы на языке клиента',
                        'Информация о компании',
                      ]
                    : capabilities
                  ).map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 border-b border-site-line py-4 text-base"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-site-accent-ink" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="/catalog"
                  className="inline-flex min-h-11 items-center gap-3 text-sm font-medium text-site-accent-ink"
                >
                  Смотреть каталог <span aria-hidden="true">→</span>
                </a>
              </TabsContent>
              {sections
                .filter((item) => item.kind === 'page')
                .map((item) => (
                  <TabsContent
                    key={item.id}
                    value={item.id}
                    className="home-panel data-[hidden]:hidden"
                  >
                    {activeTab === item.id && (
                      <PublishedPageContent
                        key={item.target}
                        id={item.target}
                      />
                    )}
                  </TabsContent>
                ))}
            </Tabs>
          </div>
        </section>
      }
    </Localize>
  );
}
