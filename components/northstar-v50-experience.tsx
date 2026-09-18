'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { northstarPages } from '@/lib/northstar-v50-content';

interface AttachmentItem {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string;
  timestamp: Date;
  block?: 'brief' | 'progress' | 'audit' | 'variants' | 'comparison';
}

export function NorthstarV50Experience() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState('ru');
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Call simulation state
  const [isCalling, setIsCalling] = useState(false);
  const [callSec, setCallSec] = useState(0);
  const [callPhrase, setCallPhrase] = useState('Чем могу помочь?');
  const [isMuted, setIsMuted] = useState(false);

  // Composer & Conversation state
  const [inputVal, setInputVal] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [, startTransition] = useTransition();

  const viewportRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Theme sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ns-theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        document.body.classList.toggle('dark', saved === 'dark');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.body.classList.toggle('dark', newTheme === 'dark');
    try {
      localStorage.setItem('ns-theme', newTheme);
    } catch {
      // ignore
    }
  };

  // 2. Language sync
  const handleSetLang = (newLang: string) => {
    setLang(newLang);
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
  };

  // 3. Audio Call Timers
  useEffect(() => {
    if (!isCalling) return;
    document.body.classList.add('calling');
    setCallSec(0);
    const phrases = [
      'Чем могу помочь?',
      'Можно продолжать пользоваться сайтом во время звонка',
      'Я вижу тот же контекст, что и в чате',
      'Готов ответить на вопросы по развёртыванию или стоимости',
    ];
    let idx = 0;
    setCallPhrase(phrases[0]);

    const timer = setInterval(() => {
      setCallSec((prev) => prev + 1);
    }, 1000);

    const phraseTimer = setInterval(() => {
      idx = (idx + 1) % phrases.length;
      setCallPhrase(phrases[idx]);
    }, 2800);

    return () => {
      clearInterval(timer);
      clearInterval(phraseTimer);
      document.body.classList.remove('calling');
    };
  }, [isCalling]);

  const handleStartCall = () => {
    setIsCalling(true);
    setShowSettings(false);
    setShowMobileMenu(false);
  };

  const handleEndCall = () => {
    setIsCalling(false);
    setTurns((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Звонок завершён. Можно продолжить с того же места.',
        timestamp: new Date(),
      },
    ]);
  };

  // 4. Modal page wiring (Pricing calculator & partner logic)
  useEffect(() => {
    if (!activeModal || !modalContentRef.current) return;
    const root = modalContentRef.current;

    if (activeModal === 'plans') {
      let currentPlanPrice = 20;
      let currentPlanName = 'Core';
      let sitePaymentMode = 'full';
      let sitePaymentTotal = 499;

      const updateSummary = () => {
        const titleEl = root.querySelector('#pricingSummaryTitle');
        const siteEl = root.querySelector('#summarySite');
        const aiEl = root.querySelector('#summaryAI');
        const totalEl = root.querySelector('#summaryTotal');

        if (titleEl) {
          titleEl.textContent =
            sitePaymentMode === 'full'
              ? `$499 + ${currentPlanName}`
              : `$550 (3 платежа) + ${currentPlanName}`;
        }
        if (siteEl) {
          siteEl.textContent =
            sitePaymentMode === 'full'
              ? '$499 один раз'
              : '$550 (3 платежа: $150 + $200 + $200)';
        }
        if (aiEl) {
          aiEl.textContent = `${currentPlanName} · $${currentPlanPrice}/мес`;
        }
        if (totalEl) {
          totalEl.textContent = `$${sitePaymentTotal + currentPlanPrice}`;
        }
      };

      // Site payment cards
      root.querySelectorAll('[data-site-payment]').forEach((el) => {
        const card = el as HTMLElement;
        card.onclick = () => {
          root.querySelectorAll('[data-site-payment]').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          sitePaymentMode = card.dataset.sitePayment || 'full';
          sitePaymentTotal = sitePaymentMode === 'full' ? 499 : 550;
          updateSummary();
        };
      });

      // AI tier cards
      root.querySelectorAll('[data-ai-plan]').forEach((el) => {
        const card = el as HTMLElement;
        card.onclick = () => {
          root.querySelectorAll('[data-ai-plan]').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          currentPlanName = card.querySelector('.aiPlanName')?.textContent || 'Core';
          currentPlanPrice = Number(card.dataset.aiPrice || '20');
          updateSummary();
        };
      });

      updateSummary();
    }

    if (activeModal === 'partners') {
      const sitesInput = root.querySelector('#partnerSites') as HTMLInputElement | null;
      const avgCheckInput = root.querySelector('#partnerCheck') as HTMLInputElement | null;
      const earnVal = root.querySelector('#partnerEarnings');

      const calcPartner = () => {
        const count = Number(sitesInput?.value || '5');
        const check = Number(avgCheckInput?.value || '1000');
        const total = Math.round(count * check * 0.3);
        if (earnVal) earnVal.textContent = `$${total.toLocaleString('en-US')}`;
      };

      if (sitesInput) sitesInput.oninput = calcPartner;
      if (avgCheckInput) avgCheckInput.oninput = calcPartner;
      calcPartner();
    }
  }, [activeModal]);

  // 5. Autogrow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // 6. Attachment management
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newItems: AttachmentItem[] = Array.from(e.target.files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
    }));
    setAttachments((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  // 7. Conversational Flows & Audit simulation
  const runAuditFlow = (targetUrl: string) => {
    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'user',
      content: targetUrl,
      timestamp: new Date(),
    };

    const auditAiTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Запускаю аудит для **${targetUrl}**. Проверяем скорость, SEO, доступность и готовность к AI-агентам.`,
      block: 'progress',
      timestamp: new Date(),
    };

    setTurns((prev) => [...prev, userTurn, auditAiTurn]);
    setIsBusy(true);

    setTimeout(() => {
      const scoreTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Аудит сайта **${targetUrl}** завершён. Ниже результаты проверки и готовые варианты модернизации на Northstar Engine:`,
        block: 'audit',
        timestamp: new Date(),
      };
      setTurns((prev) => [...prev, scoreTurn]);
      setIsBusy(false);

      setTimeout(() => {
        viewportRef.current?.scrollTo({
          top: viewportRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }, 1800);
  };

  const handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text && !attachments.length) return;

    setInputVal('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Check if user entered a URL or audit request
    const urlMatch = text.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/i);
    if (urlMatch) {
      runAuditFlow(urlMatch[0]);
      return;
    }

    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setTurns((prev) => [...prev, userTurn]);
    setIsBusy(true);

    startTransition(async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: turns.slice(-6).map((t) => ({
              role: t.role,
              content: t.content,
            })),
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as { message?: string };
          setTurns((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content:
                data.message ||
                'Northstar Engine готов создать или обновить ваш сайт с AI-консультантом и Telegram WebApp. Выберите действие или задайте уточняющий вопрос.',
              timestamp: new Date(),
            },
          ]);
        } else {
          setTurns((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content:
                'Northstar Engine готов создать или обновить ваш сайт с AI-консультантом и Telegram WebApp за $499 с деплоем в Cloudflare. Нажмите «Проверить мой сайт» или вставьте URL для мгновенного аудита.',
              timestamp: new Date(),
            },
          ]);
        }
      } catch {
        setTurns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              'Northstar Engine готов создать или обновить ваш сайт с AI-консультантом и Telegram WebApp за $499 с деплоем в Cloudflare. Нажмите «Проверить мой сайт» или вставьте URL для мгновенного аудита.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsBusy(false);
        setTimeout(() => {
          viewportRef.current?.scrollTo({
            top: viewportRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }, 100);
      }
    });
  };

  const handleIntent = (intent: 'audit' | 'redesign' | 'create') => {
    if (intent === 'audit') {
      setInputVal('https://example.com');
      textareaRef.current?.focus();
    } else if (intent === 'redesign') {
      setInputVal('Хочу обновить существующий сайт и добавить AI-консультанта: https://example.com');
      textareaRef.current?.focus();
    } else {
      setInputVal('Хочу создать новый AI-native сайт для компании с каталогом и Telegram WebApp');
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* 1. Header */}
      <header className="header">
        <button
          type="button"
          className="roundBtn mobileMenuBtn"
          onClick={() => {
            setShowMobileMenu(!showMobileMenu);
            setShowSettings(false);
          }}
          aria-label="Меню"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <button
          type="button"
          className="brand"
          onClick={() => {
            setTurns([]);
            viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Northstar
        </button>

        <nav className="nav" aria-label="Основная навигация">
          <button type="button" onClick={() => setActiveModal('about')}>
            О нас
          </button>
          <button type="button" onClick={() => setActiveModal('how')}>
            Как это работает?
          </button>
          <button type="button" onClick={() => setActiveModal('plans')}>
            AI-тарифы
          </button>
          <button type="button" onClick={() => setActiveModal('partners')}>
            Партнёрам
          </button>
        </nav>

        <div className="spacer" />

        <button
          type="button"
          className="headerAction"
          onClick={handleStartCall}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M8.3 3.7 5.8 5.2c-.8.5-1.1 1.5-.7 2.4 2.4 5.4 6 9 11.4 11.4.9.4 1.9.1 2.4-.7l1.5-2.4c.5-.8.3-1.8-.5-2.4l-2.7-2c-.7-.5-1.6-.4-2.2.2l-1.2 1.2a13.8 13.8 0 0 1-2.7-2.7l1.2-1.2c.6-.6.7-1.5.2-2.2l-2-2.7c-.5-.8-1.5-1-2.2-.4Z"
              stroke="currentColor"
              strokeWidth="1.55"
            />
          </svg>
          <span>Позвонить AI</span>
        </button>

        <button
          type="button"
          className="roundBtn"
          onClick={() => {
            setShowSettings(!showSettings);
            setShowMobileMenu(false);
          }}
          aria-label="Настройки"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 14.7 6L14.4 3H9.6l-.3 3a7 7 0 0 0-1.8 1.1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 9.3 18l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </header>

      {/* 2. Audio Call Bar */}
      <div className={`callBar ${isCalling ? 'flex' : 'hidden'}`} id="callBar">
        <strong style={{ fontSize: '11px' }}>Northstar AI</strong>
        <div className="callLive">{callPhrase}</div>
        <div className="callTime">
          {String(Math.floor(callSec / 60)).padStart(2, '0')}:
          {String(callSec % 60).padStart(2, '0')}
        </div>
        <button
          type="button"
          className="callCtl"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? 'Включить' : 'Микрофон'}
        </button>
        <button
          type="button"
          className="callCtl end"
          onClick={handleEndCall}
        >
          Завершить
        </button>
      </div>

      {/* 3. Mobile Menu Popover */}
      {showMobileMenu && (
        <div className="popover mobileMenu show" id="mobileMenu">
          <button
            type="button"
            className="menuItem"
            onClick={() => {
              setActiveModal('about');
              setShowMobileMenu(false);
            }}
          >
            О нас
          </button>
          <button
            type="button"
            className="menuItem"
            onClick={() => {
              setActiveModal('how');
              setShowMobileMenu(false);
            }}
          >
            Как это работает?
          </button>
          <button
            type="button"
            className="menuItem"
            onClick={() => {
              setActiveModal('plans');
              setShowMobileMenu(false);
            }}
          >
            AI-тарифы
          </button>
          <button
            type="button"
            className="menuItem"
            onClick={() => {
              setActiveModal('partners');
              setShowMobileMenu(false);
            }}
          >
            Партнёрам
          </button>
        </div>
      )}

      {/* 4. Settings Popover */}
      {showSettings && (
        <div className="popover settings show" id="settings">
          <div className="settingsSection">
            <div className="settingsLabel">Тема</div>
            <div className="segment">
              <button
                type="button"
                className={theme === 'light' ? 'active' : ''}
                onClick={() => handleSetTheme('light')}
              >
                Светлая
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => handleSetTheme('dark')}
              >
                Тёмная
              </button>
            </div>
          </div>
          <div className="settingsSection">
            <div className="settingsLabel">Язык</div>
            <div className="langWrap">
              <select
                className="lang"
                value={lang}
                onChange={(e) => handleSetLang(e.target.value)}
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="he">עברית</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 5. Viewport / Feed */}
      <main className="viewport" ref={viewportRef}>
        <div className="feed">
          {/* Always show Welcome hero or conversation turns */}
          {turns.length === 0 ? (
            <section className="welcome" id="welcome">
              <div className="eyebrow">NORTHSTAR / AI-NATIVE WEBSITE + TELEGRAM</div>
              <h1>AI-native сайт для бизнеса за $499</h1>
              <p className="welcomeLead">
                Сайт + Telegram WebApp + AI-консультант. С агентом можно вести обычный
                диалог, отправлять файлы и запускать действия. Разворачивается в вашем
                Cloudflare. <b>AI на сайте - от $20 в месяц.</b>
              </p>

              <div className="heroOutcome">
                <span>Создание сайта · $499</span>
                <span>AI · от $20/мес</span>
                <span>Telegram WebApp включён</span>
                <span>Deploy в ваш Cloudflare</span>
              </div>

              <div className="intentRow">
                <button
                  type="button"
                  className="intentChip"
                  onClick={() => handleIntent('audit')}
                >
                  Проверить мой сайт
                </button>
                <button
                  type="button"
                  className="intentChip"
                  onClick={() => handleIntent('redesign')}
                >
                  Обновить сайт
                </button>
                <button
                  type="button"
                  className="intentChip"
                  onClick={() => handleIntent('create')}
                >
                  Создать новый
                </button>
              </div>

              <div className="valueGrid">
                <article className="valueCard">
                  <small>01 · AUDIT + PROOF</small>
                  <strong>Сначала показываем, что именно улучшится</strong>
                  <p>
                    Если сайт уже есть, Northstar сравнивает текущую версию с двумя
                    новыми вариантами по SEO, скорости, UX, доступности и AI-readiness.
                  </p>
                </article>

                <article className="valueCard">
                  <small>02 · FASTER LAUNCH</small>
                  <strong>$499 за создание, AI - от $20 в месяц</strong>
                  <p>
                    Вместо отдельной разработки сайта, кабинета, AI-чата и
                    Telegram-интерфейса пользователь получает готовую AI-native
                    основу за фиксированную цену.
                  </p>
                </article>

                <article className="valueCard">
                  <small>03 · OWNER CONTROL</small>
                  <strong>Сайт принадлежит владельцу</strong>
                  <p>
                    Код, домен, данные, AI-настройки и интеграции остаются у
                    владельца. Это не SaaS-витрина, а самостоятельная установка,
                    которую можно развивать дальше.
                  </p>
                </article>
              </div>

              <div className="proofLine">
                <span>AI-native сайт</span>
                <span>Telegram WebApp</span>
                <span>Current / A / B comparison</span>
                <span>Без SaaS lock-in</span>
              </div>

              {/* Section: Examples */}
              <section className="homeSection" id="examples">
                <div className="homeSectionHead">
                  <h2>Примеры AI-native сайтов</h2>
                  <p>
                    Здесь можно разместить реальные скриншоты и ссылки на созданные
                    сайты. Карточки подготовлены под desktop / mobile preview и
                    переход на live-версию.
                  </p>
                </div>

                <div className="exampleGrid">
                  <article className="exampleCard">
                    <div className="exampleShot">
                      <div className="exampleShotInner">
                        <div className="exampleShotIcon">▣</div>
                        <strong>Место для скриншота</strong>
                        <span>Desktop + mobile preview</span>
                      </div>
                    </div>
                    <div className="exampleMeta">
                      <small>EXAMPLE 01</small>
                      <h3>AI-first service business</h3>
                      <p>Чат, каталог услуг, booking и AI-агент в одном интерфейсе.</p>
                      <div className="exampleLinkPlaceholder">
                        <span>https://oravera-northstar.oravera.workers.dev</span>
                        <span>↗</span>
                      </div>
                    </div>
                  </article>

                  <article className="exampleCard">
                    <div className="exampleShot">
                      <div className="exampleShotInner">
                        <div className="exampleShotIcon">▣</div>
                        <strong>Место для скриншота</strong>
                        <span>Desktop + mobile preview</span>
                      </div>
                    </div>
                    <div className="exampleMeta">
                      <small>EXAMPLE 02</small>
                      <h3>Catalog + AI</h3>
                      <p>Товары и услуги, страницы, поиск и помощь AI при выборе.</p>
                      <div className="exampleLinkPlaceholder">
                        <span>https://example-catalog.com</span>
                        <span>↗</span>
                      </div>
                    </div>
                  </article>

                  <article className="exampleCard">
                    <div className="exampleShot">
                      <div className="exampleShotInner">
                        <div className="exampleShotIcon">▣</div>
                        <strong>Место для скриншота</strong>
                        <span>Desktop + mobile preview</span>
                      </div>
                    </div>
                    <div className="exampleMeta">
                      <small>EXAMPLE 03</small>
                      <h3>AI-native local business</h3>
                      <p>Запись, обращения, аналитика и управление сайтом через AI.</p>
                      <div className="exampleLinkPlaceholder">
                        <span>https://example-local.com</span>
                        <span>↗</span>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              {/* Section: Capabilities */}
              <section className="homeSection">
                <div className="homeSectionHead">
                  <h2>Не просто сайт. Рабочий AI-интерфейс бизнеса</h2>
                  <p>
                    Northstar объединяет клиентский интерфейс, контент, booking,
                    аналитику, рекламу и внешних AI-агентов в одной самостоятельной
                    системе.
                  </p>
                </div>

                <div className="capabilityGrid">
                  <article className="capabilityCard">
                    <div className="capabilityCardTop">
                      <small>AI FOR CUSTOMERS</small>
                      <span className="capabilityIcon">AI</span>
                    </div>
                    <h3>AI-агент общается с клиентом в реальном времени</h3>
                    <p>
                      К сайту можно подключать модели OpenAI, Google и xAI и
                      использовать их для диалога, консультации и выполнения действий.
                    </p>
                    <div className="capabilityList">
                      <div className="capabilityItem">
                        Свободный текстовый и голосовой диалог с клиентом
                      </div>
                      <div className="capabilityItem">
                        Выбор модели и уровня рассуждения под сценарий
                      </div>
                      <div className="capabilityItem">
                        Ответы на основе каталога, страниц и данных бизнеса
                      </div>
                      <div className="capabilityItem">
                        Файлы и вложения внутри диалога
                      </div>
                      <div className="capabilityItem">
                        Переход к действию через tools / skills / MCP: запись, заказ
                      </div>
                    </div>
                  </article>

                  <article className="capabilityCard">
                    <div className="capabilityCardTop">
                      <small>AGENT-TO-AGENT / MCP</small>
                      <span className="capabilityIcon">MCP</span>
                    </div>
                    <h3>На сайт может прийти не только человек, но и его AI-агент</h3>
                    <p>
                      Через MCP внешний агент клиента может получить информацию и
                      выполнить доступное действие без ручного кликанья по интерфейсу.
                    </p>
                    <div className="capabilityList">
                      <div className="capabilityItem">
                        Получить информацию об услугах, ценах и доступности
                      </div>
                      <div className="capabilityItem">
                        Записаться на услугу через доступный action
                      </div>
                      <div className="capabilityItem">
                        Получить структурированные данные вместо парсинга
                      </div>
                      <div className="capabilityItem">
                        Контролировать права и доступные действия агента
                      </div>
                    </div>
                  </article>

                  <article className="capabilityCard">
                    <div className="capabilityCardTop">
                      <small>MARKETING + ANALYTICS</small>
                      <span className="capabilityIcon">↗</span>
                    </div>
                    <h3>Статистика сайта и рекламные кампании в одном контуре</h3>
                    <p>
                      Northstar может объединять данные сайта с рекламными каналами и
                      помогать создавать, отслеживать и сравнивать кампании.
                    </p>
                    <div className="capabilityList">
                      <div className="capabilityItem">
                        Посещения, источники, действия и конверсии сайта
                      </div>
                      <div className="capabilityItem">
                        Интеграции с Meta, Google, ChatGPT и X.com
                      </div>
                      <div className="capabilityItem">
                        Создание и управление рекламными кампаниями через API
                      </div>
                      <div className="capabilityItem">
                        Отслеживание эффективности, стоимости и результата
                      </div>
                    </div>
                  </article>

                  <article className="capabilityCard">
                    <div className="capabilityCardTop">
                      <small>CONTENT + COMMERCE</small>
                      <span className="capabilityIcon">▦</span>
                    </div>
                    <h3>Каталог, страницы и контент без отдельной CMS</h3>
                    <p>
                      На сайте можно реализовать каталог товаров или услуг и управлять
                      его содержимым без тяжёлой внешней платформы.
                    </p>
                    <div className="capabilityList">
                      <div className="capabilityItem">
                        Товары, услуги, категории, цены и изображения
                      </div>
                      <div className="capabilityItem">
                        Создание и редактирование страниц
                      </div>
                      <div className="capabilityItem">
                        Контент можно менять через интерфейс или AI-агента
                      </div>
                      <div className="capabilityItem">
                        SEO- и GEO-friendly структура контента
                      </div>
                    </div>
                  </article>

                  <article className="capabilityCard">
                    <div className="capabilityCardTop">
                      <small>BOOKING</small>
                      <span className="capabilityIcon">⌁</span>
                    </div>
                    <h3>Встроенный booking без обязательного платного сервиса</h3>
                    <p>
                      Базовую запись можно держать внутри самого сайта, не отправляя
                      клиента во внешний booking SaaS.
                    </p>
                    <div className="capabilityList">
                      <div className="capabilityItem">
                        Услуги, сотрудники, доступные даты и время
                      </div>
                      <div className="capabilityItem">
                        Запись из сайта, AI-чата или Telegram WebApp
                      </div>
                      <div className="capabilityItem">
                        AI-агент клиента может инициировать запись через MCP
                      </div>
                      <div className="capabilityItem">
                        Данные и правила остаются в инфраструктуре владельца
                      </div>
                    </div>
                  </article>

                  <article className="capabilityCard">
                    <div className="capabilityCardTop">
                      <small>AGENT MANAGEMENT</small>
                      <span className="capabilityIcon">&gt;_</span>
                    </div>
                    <h3>Управляйте сайтом через Codex, Claude и Antigravity</h3>
                    <p>
                      Northstar открыт внешним агентам через Owner MCP и API
                      управления, становясь частью общей AI-инфраструктуры бизнеса.
                    </p>
                    <div className="capabilityList">
                      <div className="capabilityItem">
                        Подключение Codex, Claude, Antigravity по Owner MCP
                      </div>
                      <div className="capabilityItem">
                        Получение статистики и данных сайта агентом
                      </div>
                      <div className="capabilityItem">
                        Изменение страниц, контента и настроек через Git Change Sets
                      </div>
                      <div className="capabilityItem">
                        Автоматизация повторяющихся операций бизнеса
                      </div>
                    </div>
                  </article>
                </div>

                {/* Conversational Agent feature section */}
                <div className="agentCapability">
                  <article className="agentCapabilityCopy">
                    <small>CONVERSATIONAL AGENT</small>
                    <h3>
                      Пользователь просто пишет агенту — всё остальное происходит
                      внутри сценария
                    </h3>
                    <p>
                      Агент может поддерживать полноценный диалог, принимать текст и
                      прикреплённые файлы, понимать контекст и двигаться по
                      бизнес-сценарию до результата.
                    </p>

                    <div className="agentCapabilityList">
                      <div className="agentCapabilityItem">
                        Свободный текст — пользователь не обязан выбирать только кнопки
                      </div>
                      <div className="agentCapabilityItem">
                        Файлы и вложения можно прикреплять прямо в диалог
                      </div>
                      <div className="agentCapabilityItem">
                        История разговора сохраняет контекст между сообщениями
                      </div>
                      <div className="agentCapabilityItem">
                        Агент действует по заданному script / workflow бизнеса
                      </div>
                      <div className="agentCapabilityItem">
                        На нужном шаге агент вызывает tools, skills или MCP actions
                      </div>
                      <div className="agentCapabilityItem">
                        Результатом разговора является реальное действие, а не просто
                        ответ
                      </div>
                    </div>
                  </article>

                  <article className="agentCapabilityDemo">
                    <small>AGENT SESSION</small>

                    <div className="agentDemoWindow">
                      <div className="agentDemoMessages">
                        <div className="agentDemoBubble user">
                          Мне нужна услуга на следующей неделе. Вот документ с
                          требованиями.
                        </div>
                        <div className="agentDemoFile">＋ requirements.pdf · 1.8 MB</div>
                        <div className="agentDemoBubble">
                          Я изучил файл и уточню два параметра. После этого проверю
                          доступность и предложу подходящие варианты.
                        </div>
                        <div className="agentDemoBubble user">
                          Во вторник или среду после 14:00
                        </div>
                        <div className="agentDemoBubble">
                          Нашёл подходящее время. Могу сразу оформить запись.
                        </div>
                      </div>

                      <div className="agentDemoComposer">
                        <button type="button">＋</button>
                        <span>Напишите сообщение или прикрепите файл…</span>
                        <button type="button">↑</button>
                      </div>
                    </div>

                    <div className="toolTrace">
                      <div className="toolTraceRow">
                        <small>SKILL</small>
                        <strong>read_attachment</strong>
                        <span className="toolTraceStatus">DONE</span>
                      </div>
                      <div className="toolTraceRow">
                        <small>TOOL</small>
                        <strong>check_availability</strong>
                        <span className="toolTraceStatus">DONE</span>
                      </div>
                      <div className="toolTraceRow">
                        <small>MCP ACTION</small>
                        <strong>create_booking</strong>
                        <span>READY</span>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              {/* System Strip */}
              <section className="homeSection">
                <div className="homeSectionHead">
                  <h2>Одна система вместо набора разрозненных сервисов</h2>
                  <p>
                    Каждый модуль можно подключать по мере необходимости. Основа
                    остаётся самостоятельной и разворачивается в инфраструктуре
                    владельца.
                  </p>
                </div>

                <div className="systemStrip">
                  <article className="systemNode">
                    <small>01 · EXPERIENCE</small>
                    <strong>Website + Telegram</strong>
                    <p>Интерфейс для клиента на сайте и в Telegram WebApp.</p>
                  </article>
                  <article className="systemNode">
                    <small>02 · AI</small>
                    <strong>OpenAI / Google / xAI</strong>
                    <p>Модели для клиентского AI-агента и автоматизации.</p>
                  </article>
                  <article className="systemNode">
                    <small>03 · BUSINESS</small>
                    <strong>Catalog + Booking + Content</strong>
                    <p>Базовые бизнес-функции без обязательной внешней CMS.</p>
                  </article>
                  <article className="systemNode">
                    <small>04 · GROWTH</small>
                    <strong>Analytics + Ads</strong>
                    <p>Статистика, источники трафика и рекламные кампании.</p>
                  </article>
                  <article className="systemNode">
                    <small>05 · AGENTS</small>
                    <strong>MCP + Codex + Claude</strong>
                    <p>Доступ для внешних AI-агентов и систем автоматизации.</p>
                  </article>
                </div>

                <div className="integrationPills">
                  <span className="integrationPill">SEO + GEO friendly</span>
                  <span className="integrationPill">MCP actions</span>
                  <span className="integrationPill">Realtime AI</span>
                  <span className="integrationPill">Built-in booking</span>
                  <span className="integrationPill">Catalog</span>
                  <span className="integrationPill">Site analytics</span>
                  <span className="integrationPill">Ad integrations</span>
                  <span className="integrationPill">Agent management</span>
                </div>
              </section>

              {/* Closing Section */}
              <section className="homeClosing">
                <div>
                  <h2>Сайт становится частью AI-инфраструктуры бизнеса</h2>
                  <p>
                    Клиенты используют его как удобный интерфейс. AI помогает им
                    получить услугу. Внешние агенты работают через MCP. Владелец
                    управляет контентом, booking, аналитикой и интеграциями из своей
                    инфраструктуры.
                  </p>
                </div>
                <div className="homeClosingMeta">
                  $499 создание
                  <br />
                  AI от $20/мес
                  <br />
                  Cloudflare от $5/мес
                </div>
              </section>
            </section>
          ) : (
            <div className="conversationFlow space-y-6">
              <button
                type="button"
                className="btn mb-4"
                onClick={() => setTurns([])}
              >
                ← Вернуться на главную
              </button>

              {turns.map((turn) => (
                <div key={turn.id} className="turn">
                  {turn.role === 'user' ? (
                    <div className="user">
                      <div className="userBubble">{turn.content}</div>
                    </div>
                  ) : (
                    <div className="assistant">
                      <div className="ai">AI</div>
                      <div className="aiText">
                        <p>{turn.content}</p>

                        {/* Progress Block */}
                        {turn.block === 'progress' && (
                          <div className="progress mt-4 rounded-xl border border-site-line overflow-hidden">
                            <div className="progressTop p-3 flex justify-between items-center border-b border-site-line bg-site-surface">
                              <strong>Анализ сайта и подготовка аудита…</strong>
                              <span className="progressPct text-xs text-site-muted">75%</span>
                            </div>
                            <div className="progressBar h-1 bg-site-line">
                              <div className="h-full bg-site-ink w-3/4 transition-all duration-500" />
                            </div>
                            <div className="steps grid grid-cols-2 sm:grid-cols-4 divide-x divide-site-line text-xs">
                              <div className="step p-3 done">
                                <div className="stepIcon mb-2 font-bold">✓</div>
                                <b>1. Контент</b>
                                <span>Структура и тексты</span>
                              </div>
                              <div className="step p-3 done">
                                <div className="stepIcon mb-2 font-bold">✓</div>
                                <b>2. SEO и CWV</b>
                                <span>Скорость и доступность</span>
                              </div>
                              <div className="step p-3 done">
                                <div className="stepIcon mb-2 font-bold">✓</div>
                                <b>3. AI-readiness</b>
                                <span>MCP и интеграции</span>
                              </div>
                              <div className="step p-3">
                                <div className="stepIcon mb-2">4</div>
                                <b>4. Итог</b>
                                <span>Сравнение и план</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Audit Scores & Comparison Block */}
                        {turn.block === 'audit' && (
                          <div className="auditResult mt-4 space-y-4">
                            <div className="scoreGrid rounded-xl overflow-hidden border border-site-line">
                              <div className="score p-4 bg-site-surface">
                                <small>PERFORMANCE</small>
                                <strong>92</strong>
                                <p>LCP 1.1s · CLS 0.01 · Fast Cloudflare edge</p>
                              </div>
                              <div className="score p-4 bg-site-surface">
                                <small>AI READINESS</small>
                                <strong>88</strong>
                                <p>MCP protocol · Markdown structured schema</p>
                              </div>
                              <div className="score p-4 bg-site-surface">
                                <small>MOBILE &amp; UX</small>
                                <strong>94</strong>
                                <p>Responsive touch · Telegram WebApp ready</p>
                              </div>
                              <div className="score p-4 bg-site-surface">
                                <small>SEO &amp; A11Y</small>
                                <strong>96</strong>
                                <p>Semantic HTML · High-contrast typography</p>
                              </div>
                            </div>

                            <div className="variants grid sm:grid-cols-2 gap-4">
                              <div className="variant selected p-4 rounded-xl border border-site-ink bg-site-surface">
                                <div className="flex justify-between items-center mb-2">
                                  <small className="text-xs text-site-muted">ВАРИАНТ A</small>
                                  <span className="text-xs px-2 py-0.5 rounded bg-site-ink text-site-surface">
                                    РЕКОМЕНДУЕМЫЙ
                                  </span>
                                </div>
                                <h4 className="font-semibold text-base mb-1">AI-first Minimal</h4>
                                <p className="text-xs text-site-muted mb-3">
                                  Максимальная скорость, диалог в центре, чистая типографика.
                                </p>
                                <button
                                  type="button"
                                  className="btn primary w-full text-xs"
                                  onClick={() => setActiveModal('plans')}
                                >
                                  Выбрать вариант A · Заказать $499
                                </button>
                              </div>

                              <div className="variant p-4 rounded-xl border border-site-line bg-site-surface">
                                <div className="flex justify-between items-center mb-2">
                                  <small className="text-xs text-site-muted">ВАРИАНТ B</small>
                                </div>
                                <h4 className="font-semibold text-base mb-1">Brand + Content</h4>
                                <p className="text-xs text-site-muted mb-3">
                                  Больше визуального контента, каталог и медиа-акценты.
                                </p>
                                <button
                                  type="button"
                                  className="btn w-full text-xs"
                                  onClick={() => setActiveModal('plans')}
                                >
                                  Выбрать вариант B · Заказать $499
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isBusy && (
                <div className="turn assistant">
                  <div className="ai">AI</div>
                  <div className="aiText">
                    <p className="animate-pulse">Думаю над ответом…</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 6. Modal Layer */}
      {activeModal && northstarPages[activeModal] && (
        <section
          className="modalLayer show"
          id="modalLayer"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal">
            <div className="modalHead">
              <h2>{northstarPages[activeModal].title}</h2>
              <button
                type="button"
                className="roundBtn"
                onClick={() => setActiveModal(null)}
                aria-label="Закрыть"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div
              className="modalBody"
              ref={modalContentRef}
              dangerouslySetInnerHTML={{ __html: northstarPages[activeModal].html }}
            />
          </div>
        </section>
      )}

      {/* 7. Composer */}
      <div className="composerWrap">
        <div className="composerShell">
          {attachments.length > 0 && (
            <div className="attachmentChips" id="attachmentChips">
              {attachments.map((item) => (
                <span key={item.id} className="attachmentChip">
                  <span title={item.name}>{item.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(item.id)}
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <form className="composer" onSubmit={handleSubmit}>
            <button
              type="button"
              className="circle"
              onClick={handleAttachClick}
              aria-label="Добавить файл"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="m8.5 12.5 6.3-6.3a3.2 3.2 0 0 1 4.5 4.5l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Вставьте ссылку на сайт или опишите задачу…"
            />

            <button
              type="button"
              className="circle"
              onClick={handleStartCall}
              aria-label="Позвонить AI"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8.3 3.7 5.8 5.2c-.8.5-1.1 1.5-.7 2.4 2.4 5.4 6 9 11.4 11.4.9.4 1.9.1 2.4-.7l1.5-2.4c.5-.8.3-1.8-.5-2.4l-2.7-2c-.7-.5-1.6-.4-2.2.2l-1.2 1.2a13.8 13.8 0 0 1-2.7-2.7l1.2-1.2c.6-.6.7-1.5.2-2.2l-2-2.7c-.5-.8-1.5-1-2.2-.4Z"
                  stroke="currentColor"
                  strokeWidth="1.55"
                />
              </svg>
            </button>

            <button
              type="submit"
              className="circle send"
              disabled={isBusy || (!inputVal.trim() && !attachments.length)}
              aria-label="Отправить"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 19V5M6.5 10.5 12 5l5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,.pdf,.txt,.md,.doc,.docx,.xlsx"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
}
