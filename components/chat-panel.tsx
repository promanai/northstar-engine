'use client';

import { fileAccept } from '@/lib/file-policy';
import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Headset, Paperclip, Plus, Send, UserRound, X } from 'lucide-react';
import { VoiceCall } from '@/components/voice-call';
import { LiteLeadForm } from '@/components/lite-lead-form';
import {
  attachmentAccept,
  attachmentLimit,
  validateAttachment,
  type ChatAttachment,
} from '@/lib/attachment-policy';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLite, useSiteName } from '@/components/engine-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { ChatFilePicker } from '@/components/chat-file-picker';
import type { ChatFileView } from '@/lib/chat-file-policy';
import {
  rememberChatRequest,
  recalledChatRequest,
  forgetChatRequest,
} from '@/lib/chat-recovery-policy';

type Message = {
  role: 'assistant' | 'user';
  text: string;
  time: string;
  attachment?: ChatFileView | null;
};
type Product = { title: string };
type ChatResponse = { message?: string; conversationId?: string };
const welcome: Message = {
  role: 'assistant',
  text: 'Здравствуйте! Расскажите о вашей задаче — помогу с выбором услуги и отвечу на вопросы.',
  time: 'сейчас',
};
const defaultSuggestions = [
  'Какие услуги доступны?',
  'Сколько это стоит?',
  'Хочу оформить заказ',
];

export function ChatPanel() {
  const lite = useLite();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [sendError, setSendError] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string>();
  const [recoveryText, setRecoveryText] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(lite);
  const [storageWarning, setStorageWarning] = useState('');
  const recoveryEpoch = useRef(0);
  const [mode, setMode] = useState<'live' | 'demo' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment>();
  const [storedFile, setStoredFile] = useState<ChatFileView>();
  const [fileConsent, setFileConsent] = useState(false);
  const [fileProvider, setFileProvider] = useState<'openai' | 'xai'>();
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [inputLimit, setInputLimit] = useState<number>();
  const fileCheckId = useRef(0);
  const [conversationId, setConversationId] = useState<string>();
  const assistantName = `AI-консультант ${useSiteName()}`;
  const [suggestions, setSuggestions] = useState(
    lite
      ? [
          'Какие услуги доступны?',
          'Сколько это стоит?',
          'Расскажите об условиях работы',
        ]
      : defaultSuggestions,
  );
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const fileInput = useRef<HTMLInputElement>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const hasInteracted = useRef(false);
  const sending = useRef(false);
  const attempt = useRef<{ key: string; payload: string } | undefined>(
    undefined,
  );
  const [handoffState, setHandoffState] = useState<'idle' | 'calling' | 'done'>('idle');

  async function requestHumanOperator() {
    if (handoffState === 'calling') return;
    setHandoffState('calling');
    const recentMessages = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Посетитель' : 'AI'}: ${m.text}`)
      .join('\n\n');

    if (!signedIn) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Чтобы передать диалог оператору и сохранить ответ, пожалуйста, войдите в профиль или оставьте ваши контактные данные.',
          time: 'сейчас',
        },
      ]);
      setHandoffState('idle');
      return;
    }

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          subject: 'Вопрос из AI-чата (вызов оператора)',
          body: recentMessages || 'Посетитель запросил связь с оператором.',
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось создать обращение');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Ваш вопрос передан оператору! Обращение зарегистрировано в разделе поддержки. Мы ответим вам в ближайшее время.',
          time: 'сейчас',
        },
      ]);
      setHandoffState('done');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Не удалось автоматически передать вопрос оператору. Вы можете создать обращение в разделе «Кабинет → Обращения».',
          time: 'сейчас',
        },
      ]);
      setHandoffState('idle');
    }
  }

  function clearRecovery() {
    recoveryEpoch.current++;
    try {
      forgetChatRequest(window.sessionStorage);
    } catch {
      /* Storage unavailable. */
    }
    setRecoveryKey(undefined);
    setRecovering(false);
    setRecoveryText('');
  }
  async function recoverRequest(key: string) {
    const epoch = ++recoveryEpoch.current;
    hasInteracted.current = true;
    setRecoveryKey(key);
    setRecovering(true);
    setRecoveryText('Проверяем ранее отправленный запрос…');
    try {
      const response = await fetch('/api/chat/request', {
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
        headers: { 'Idempotency-Key': key },
      });
      const data = (await response.json()) as {
        state?: string;
        error?: string;
        conversationId?: string;
        result?: { mode: 'live' | 'demo'; message: string };
        messages?: Array<{
          role: string;
          content: string;
          createdAt: string;
          attachment?: ChatFileView | null;
        }>;
      };
      if (epoch !== recoveryEpoch.current) return;
      if (!response.ok) {
        setRecoveryText(
          response.status === 401 || response.status === 404
            ? 'Запрос недоступен в текущей сессии. Войдите в прежний аккаунт и проверьте снова. Мы не отправляем его повторно.'
            : 'Не удалось проверить ответ. Повторите проверку позже — новый AI-запрос не создаётся.',
        );
        return;
      }
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.state === 'completed' && data.result && data.messages?.length) {
        setMessages(
          data.messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            text: m.content,
            attachment: m.attachment,
            time: new Date(m.createdAt).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          })),
        );
        setMode(data.result.mode);
        setInput('');
        setStoredFile(undefined);
        setFileConsent(false);
        fileCheckId.current++;
        attempt.current = undefined;
        clearRecovery();
        setSendError('Ответ восстановлен. Повторного обращения к AI не было.');
      } else if (data.state === 'failed') {
        attempt.current = undefined;
        clearRecovery();
        setSendError(
          `${data.error ?? 'Предыдущая попытка завершилась ошибкой'}. Если отправить вопрос заново, это будет новая попытка с возможным расходом AI-квоты.`,
        );
      } else
        setRecoveryText(
          data.state === 'pending'
            ? 'Ответ ещё готовится. Проверьте его через несколько секунд — повторной отправки вопроса не будет.'
            : 'Исход попытки неизвестен. Автоматического повтора не будет. Проверьте историю перед новой отправкой.',
        );
    } catch {
      if (epoch === recoveryEpoch.current)
        setRecoveryText(
          'Нет связи с сайтом. Идентификатор попытки сохранён: проверьте ответ после восстановления соединения.',
        );
    } finally {
      if (epoch === recoveryEpoch.current) setRecovering(false);
    }
  }

  function cancelRecoveryRead() {
    recoveryEpoch.current++;
  }
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setRecoveryReady(true);
      if (lite) return;
      let key: string | undefined;
      try {
        key = recalledChatRequest(window.sessionStorage);
      } catch {
        /* Storage unavailable. */
      }
      if (key) void recoverRequest(key);
    });
    return () => {
      active = false;
      cancelRecoveryRead();
    };
  }, [lite]);

  useEffect(() => {
    void Promise.all([
      fetch('/api/products'),
      lite
        ? Promise.resolve(new Response(null, { status: 404 }))
        : fetch('/api/conversations?scope=mine'),
    ])
      .then(async ([productsResponse, conversationsResponse]) => {
        if (productsResponse.ok) {
          const data = (await productsResponse.json()) as {
            products?: Product[];
          };
          const productSuggestions = (data.products ?? [])
            .slice(0, 2)
            .map((product) => `Расскажите про «${product.title}»`);
          if (productSuggestions.length)
            setSuggestions([
              ...productSuggestions,
              lite ? 'Расскажите об условиях работы' : 'Хочу оформить заказ',
            ]);
        }
        if (conversationsResponse.ok) {
          setSignedIn(true);
          const data = (await conversationsResponse.json()) as {
            conversations?: Array<{
              id: string;
              messages?: Array<{
                role: string;
                content: string;
                createdAt: string;
                attachment?: ChatFileView | null;
              }>;
            }>;
          };
          const latest = data.conversations?.[0];
          if (latest?.messages?.length && !hasInteracted.current) {
            setConversationId(latest.id);
            setMessages(
              latest.messages.map((message) => ({
                role: message.role === 'user' ? 'user' : 'assistant',
                text: message.content,
                attachment: message.attachment,
                time: new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })),
            );
          }
        }
      })
      .catch(() => undefined);
  }, [lite]);

  useEffect(() => {
    const list = messageList.current;
    if (list) list.scrollTop = hasInteracted.current ? list.scrollHeight : 0;
  }, [messages, isSending]);

  useEffect(() => {
    const field = composer.current;
    if (field) {
      field.style.height = 'auto';
      field.style.height = `${Math.min(field.scrollHeight, 112)}px`;
    }
  }, [input]);

  function newConversation() {
    if (isSending || isUploading) return;
    hasInteracted.current = true;
    clearRecovery();
    attempt.current = undefined;
    setInput('');
    setConversationId(undefined);
    setMessages([welcome]);
    setUploadStatus('');
    setAttachment(undefined);
    setStoredFile(undefined);
    fileCheckId.current++;
    setFileConsent(false);
    setSendError('');
    composer.current?.focus();
  }
  async function sendMessage(value = input) {
    const text =
      value.trim() ||
      (attachment || storedFile
        ? 'Помогите разобраться с вложенным файлом'
        : '');
    if (
      !text ||
      sending.current ||
      isSending ||
      isUploading ||
      recoveryKey ||
      !recoveryReady
    )
      return;
    if (storedFile && (!fileConsent || !fileProvider || !analysisEnabled)) {
      setSendError('Подтвердите передачу файла подключённому AI-провайдеру');
      return;
    }
    hasInteracted.current = true;
    sending.current = true;
    setSendError('');
    setInput('');
    setMessages((current) => [
      ...current,
      {
        role: 'user',
        text: attachment ? `${text}\n📎 ${attachment.name}` : text,
        time: 'сейчас',
        attachment: storedFile,
      },
    ]);
    setIsSending(true);
    try {
      const history = messages
        .slice(1)
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.text.slice(0, 1500),
        }));
      // Keep UTF-8 history within the stateless endpoint's byte limit.
      while (
        history.length &&
        new TextEncoder().encode(JSON.stringify({ message: text, history }))
          .length > 23000
      )
        history.shift();
      const payload = JSON.stringify(
        lite
          ? { message: text, history, ...(attachment ? { attachment } : {}) }
          : {
              message: text,
              conversationId,
              ...(storedFile
                ? {
                    fileId: storedFile.id,
                    confirmFile: fileConsent,
                    fileProvider,
                  }
                : {}),
            },
      );
      if (!lite && attempt.current?.payload !== payload)
        attempt.current = { key: crypto.randomUUID(), payload };
      if (!lite) {
        let remembered = false;
        try {
          remembered = rememberChatRequest(
            window.sessionStorage,
            attempt.current!.key,
          );
        } catch {
          /* Storage unavailable. */
        }
        setStorageWarning(
          remembered
            ? ''
            : 'Браузер не разрешил сохранить идентификатор запроса. До получения ответа не перезагружайте страницу.',
        );
      }
      const dispatch = () =>
        fetch(lite && attachment ? '/api/chat/attachment' : '/api/chat', {
          method: 'POST',
          signal: AbortSignal.timeout(150000),
          headers: {
            'content-type': 'application/json',
            ...(!lite ? { 'Idempotency-Key': attempt.current!.key } : {}),
          },
          body: payload,
        });
      let response = await dispatch();
      // Only this explicit preflight status is automatically retried. It did no AI work.
      if (
        !lite &&
        response.status === 428 &&
        response.headers.get('x-chat-request-state') === 'unclaimed'
      )
        response = await dispatch();
      const data = (await response.json()) as ChatResponse & {
        error?: string;
        mode?: 'live' | 'demo';
      };
      if (!response.ok) {
        const state = response.headers.get('x-chat-request-state');
        if (!lite && state === 'failed') {
          attempt.current = undefined;
          clearRecovery();
          throw new Error(
            `${data.error ?? 'Ошибка запроса'} Повторная отправка будет новой попыткой и может расходовать AI-квоту.`,
          );
        }
        // Unclaimed validation/rate errors can be corrected; uncertain/pending outcomes retain the key.
        if (!lite && !state && response.status < 500) {
          attempt.current = undefined;
          clearRecovery();
        }
        if (!lite && state === 'busy') clearRecovery();
        throw new Error(data.error ?? 'Ошибка запроса');
      }
      attempt.current = undefined;
      if (!lite) clearRecovery();
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.mode) setMode(data.mode);
      setAttachment(undefined);
      setStoredFile(undefined);
      setFileConsent(false);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text:
            data.message ??
            'Расскажите немного подробнее — я помогу сориентироваться.',
          time: 'сейчас',
        },
      ]);
    } catch (error) {
      if (!lite && attempt.current) {
        // Keep the pointer after uncertain outcomes. Status checks are GET-only.
        let remembered: string | undefined;
        try {
          remembered = recalledChatRequest(window.sessionStorage);
        } catch {
          /* Storage unavailable. */
        }
        if (remembered) {
          setRecoveryKey(remembered);
          setRecoveryText(
            'Ответ не получен. Проверьте состояние прежней попытки без повторного AI-запроса.',
          );
        }
      }
      if (storedFile) void refreshFileProvider();
      setMessages((current) => current.slice(0, -1));
      setSendError(
        error instanceof Error &&
          error.name !== 'TimeoutError' &&
          error.name !== 'TypeError'
          ? error.message
          : lite
            ? 'Ответ не получен. Попробуйте отправить вопрос ещё раз.'
            : 'Соединение прервалось. Проверьте ответ прежней попытки. Если восстановление недоступно, повторите тот же вопрос без перезагрузки страницы.',
      );
      setInput((current) => current || text);
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }
  async function refreshFileProvider() {
    const requestId = ++fileCheckId.current;
    setFileConsent(false);
    setFileProvider(undefined);
    setAnalysisEnabled(false);
    try {
      const response = await fetch('/api/chat', { cache: 'no-store' });
      const data = (await response.json()) as {
        provider?: 'openai' | 'xai';
        fileAnalysisEnabled?: boolean;
        maxInputBytes?: number;
        error?: string;
      };
      if (requestId !== fileCheckId.current) return;
      if (!response.ok)
        throw new Error(data.error || 'Не удалось проверить подключение AI');
      setFileProvider(data.provider);
      setAnalysisEnabled(data.fileAnalysisEnabled === true);
      setInputLimit(data.maxInputBytes);
      if (!data.fileAnalysisEnabled)
        setUploadStatus(
          'Файл сохранён, но AI-анализ пока отключён владельцем сайта',
        );
    } catch (error) {
      if (requestId === fileCheckId.current)
        setUploadStatus(
          error instanceof Error
            ? error.message
            : 'Не удалось проверить подключение AI',
        );
    }
  }
  function chooseStoredFile(file: ChatFileView) {
    if (isSending || isUploading || recoveryKey || !recoveryReady) return;
    hasInteracted.current = true;
    setStoredFile(file);
    setSendError('');
    setUploadStatus('');
    void refreshFileProvider();
  }
  async function uploadFile(file?: File) {
    if (!file || isUploading || isSending || recoveryKey || !recoveryReady)
      return;
    hasInteracted.current = true;
    if (lite) {
      setUploadStatus('');
      if (file.size > attachmentLimit) {
        setUploadStatus('Файл должен быть не больше 2 МБ');
        return;
      }
      setIsUploading(true);
      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === 'string'
              ? resolve(reader.result.split(',')[1])
              : reject(new Error('Не удалось прочитать файл'));
          reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
          reader.readAsDataURL(file);
        });
        const extension = file.name.split('.').pop()?.toLowerCase();
        const types: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
          pdf: 'application/pdf',
          txt: 'text/plain',
          md: 'text/plain',
        };
        setAttachment(
          validateAttachment({
            name: file.name,
            mime: types[extension ?? ''] ?? file.type,
            data,
          }),
        );
        composer.current?.focus();
      } catch (error) {
        setUploadStatus(
          error instanceof Error ? error.message : 'Файл не поддерживается',
        );
      } finally {
        setIsUploading(false);
      }
      return;
    }
    setIsUploading(true);
    setUploadStatus('Загружаем…');
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: form,
      });
      const data = (await response.json()) as {
        file?: ChatFileView;
        error?: string;
      };
      if (!response.ok || !data.file)
        throw new Error(data.error || 'Не удалось загрузить файл');
      setStoredFile(data.file);
      setUploadStatus('Файл сохранён в кабинете и выбран для сообщения');
      await refreshFileProvider();
    } catch (error) {
      setUploadStatus(
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить файл. Проверьте раздел «Файлы» перед повтором.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="chat-shell mx-auto flex w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-site-line bg-site-surface">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-site-line px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-site-raised text-site-ink">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <p
              title={assistantName}
              className="truncate font-medium text-site-ink"
            >
              {assistantName}
            </p>
            <p className="mt-0.5 text-sm text-site-muted">
              {mode === 'demo'
                ? 'Демонстрация · AI не подключён'
                : 'Услуги и цены'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            disabled={isSending || isUploading || handoffState === 'calling'}
            onClick={requestHumanOperator}
            data-analytics="chat-human-handoff"
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 text-site-muted hover:bg-site-raised hover:text-site-accent-ink sm:w-auto sm:px-3"
            aria-label="Позвать человека"
            title="Передать вопрос оператору"
          >
            <Headset className="size-4" />
            <span className="hidden sm:inline">Оператор</span>
          </Button>
          <Button
            disabled={isSending || isUploading}
            onClick={newConversation}
            data-analytics="chat-new"
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 text-site-muted hover:bg-site-raised hover:text-site-accent-ink sm:w-auto sm:px-3"
            aria-label="Новый диалог"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Новый диалог</span>
          </Button>
        </div>
      </div>
      <div
        role="log"
        ref={messageList}
        aria-label="История диалога"
        aria-live="polite"
        className="site-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              aria-hidden="true"
              className="hidden size-8 shrink-0 place-items-center rounded-xl bg-site-raised text-site-muted sm:grid"
            >
              {message.role === 'user' ? (
                <UserRound className="size-4" />
              ) : (
                <Bot className="size-4" />
              )}
            </div>
            <div className="min-w-0 max-w-[95%] sm:max-w-[85%]">
              <div
                className={`inline-block whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-3 text-base leading-7 ${message.role === 'user' ? 'rounded-tr-sm bg-site-raised text-site-ink' : 'text-site-ink'}`}
              >
                {message.text}
                {message.attachment && (
                  <div className="mt-2 text-sm">
                    {message.attachment.downloadUrl ? (
                      <a
                        href={message.attachment.downloadUrl}
                        className="underline underline-offset-4"
                      >
                        📎 {message.attachment.filename}
                      </a>
                    ) : (
                      '📎 Файл недоступен'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!messages.some((message) => message.role === 'user') && (
          <div
            aria-label="Примеры вопросов"
            className="flex flex-wrap gap-2 sm:pl-11"
          >
            {suggestions.map((suggestion) => (
              <button
                disabled={isSending || !!recoveryKey || !recoveryReady}
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                  composer.current?.focus();
                }}
                className="min-h-11 max-w-full rounded-xl border border-site-line px-3 py-2 text-left text-sm text-site-muted transition-colors hover:bg-site-raised hover:text-site-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {isSending && (
          <output className="flex items-center gap-2 text-sm text-site-muted">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-site-accent" />
              <span className="size-1.5 animate-bounce rounded-full bg-site-accent [animation-delay:120ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-site-accent [animation-delay:240ms]" />
            </span>{' '}
            Ассистент готовит ответ
          </output>
        )}
      </div>
      <div className="chat-compose shrink-0 border-t border-site-line p-3 sm:p-4">
        {(attachment || storedFile) && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-site-line px-3 text-sm text-site-ink">
            <Paperclip className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {attachment?.name ?? storedFile?.filename}
            </span>
            <Button
              variant="ghost"
              disabled={isSending || !!recoveryKey || !recoveryReady}
              aria-label="Убрать вложение"
              className="size-11 shrink-0 text-site-muted hover:bg-site-raised"
              onClick={() => {
                fileCheckId.current++;
                setAttachment(undefined);
                setStoredFile(undefined);
                setFileConsent(false);
                setUploadStatus('');
              }}
            >
              <X />
            </Button>
          </div>
        )}
        {lite && attachment && (
          <p className="mb-3 text-xs leading-5 text-site-muted">
            При отправке файл получит настроенный AI-провайдер. Сайт не
            сохраняет файл. Для повторного анализа прикрепите его снова.
          </p>
        )}
        {!lite && storedFile && (
          <div className="mb-3 space-y-2 text-sm text-site-muted">
            <div className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="chat-file-consent"
                checked={fileConsent}
                disabled={
                  isSending ||
                  !!recoveryKey ||
                  !fileProvider ||
                  !analysisEnabled
                }
                onCheckedChange={(checked) => setFileConsent(checked === true)}
              />
              <label htmlFor="chat-file-consent">
                Передать этот файл{' '}
                {fileProvider === 'openai'
                  ? 'OpenAI'
                  : fileProvider === 'xai'
                    ? 'xAI'
                    : 'AI-провайдеру'}{' '}
                для анализа
              </label>
            </div>
            <p>
              Только для этого сообщения. Повторный анализ требует выбора файла
              заново. Убрать вложение здесь — не удалить файл из кабинета.
            </p>
            {inputLimit && (
              <p>
                Общий лимит контекста: {Math.floor(inputLimit / 1024)} КБ,
                включая файл в кодировке передачи и историю. Большой файл может
                не поместиться.
              </p>
            )}
            {fileProvider === 'xai' && (
              <p>
                В этом подключении поддерживаются только TXT/MD; изображения и
                PDF требуют OpenAI.
              </p>
            )}
            {!analysisEnabled && (
              <Button
                disabled={isSending || !!recoveryKey}
                variant="ghost"
                onClick={() => void refreshFileProvider()}
              >
                Проверить подключение
              </Button>
            )}
          </div>
        )}
        {sendError && (
          <p role="alert" className="mb-3 text-sm text-site-ink">
            {sendError}
          </p>
        )}
        {!lite && recoveryKey && (
          <section
            aria-label="Восстановление ответа"
            className="mb-3 rounded-xl border border-site-line bg-site-raised p-3 text-sm text-site-ink"
          >
            <output className="block" aria-live="polite">
              {recoveryText}
            </output>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                disabled={recovering}
                onClick={() => void recoverRequest(recoveryKey)}
              >
                {recovering ? 'Проверяем…' : 'Проверить ответ'}
              </Button>
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  clearRecovery();
                  attempt.current = undefined;
                  setSendError(
                    'Проверка закрыта, но отправленный запрос не отменён. Новый вопрос может расходовать AI-квоту.',
                  );
                }}
              >
                Закрыть восстановление
              </Button>
            </div>
            <p className="mt-2 text-site-muted">
              Закрытие не отменяет уже отправленный запрос и не удаляет диалог.
            </p>
          </section>
        )}
        {!lite && storageWarning && (
          <output className="mb-3 block text-sm text-site-muted">
            {storageWarning}
          </output>
        )}
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          accept={lite ? attachmentAccept : fileAccept}
          onChange={(event) => {
            void uploadFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <div className="flex items-end gap-2 rounded-2xl border border-site-line bg-site-page p-2 focus-within:border-site-accent">
          <Textarea
            ref={composer}
            aria-label="Ваше сообщение"
            value={input}
            disabled={isSending || !!recoveryKey || !recoveryReady}
            maxLength={2000}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Опишите вашу задачу…"
            className="min-h-11 max-h-28 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-base leading-6 text-site-ink shadow-none focus-visible:ring-0"
            rows={1}
          />
          <div className="flex shrink-0 items-center gap-1">
            {!lite && (
              <Button
                disabled={
                  isUploading || isSending || !!recoveryKey || !recoveryReady
                }
                variant="ghost"
                className="min-h-11 rounded-xl px-2 text-site-muted hover:bg-site-raised hover:text-site-accent-ink"
                aria-label="Прикрепить файл"
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip />
                <span className="hidden text-sm sm:inline">
                  {isUploading ? 'Загрузка…' : 'Файл'}
                </span>
              </Button>
            )}
            <Button
              disabled={
                isSending ||
                !!recoveryKey ||
                !recoveryReady ||
                isUploading ||
                (!input.trim() && !attachment && !storedFile) ||
                (!!storedFile && (!fileConsent || !analysisEnabled))
              }
              onClick={() => void sendMessage()}
              data-analytics="chat-send"
              className="chat-send min-h-11 min-w-11 shrink-0 rounded-xl bg-site-accent px-3 text-site-on-accent hover:bg-site-accent-hover"
              aria-label="Отправить"
            >
              <span className="hidden sm:inline">
                {isSending ? 'Отправляем…' : 'Отправить'}
              </span>
              <Send />
            </Button>
          </div>
        </div>
        {!lite && (
          <ChatFilePicker
            disabled={
              isUploading || isSending || !!recoveryKey || !recoveryReady
            }
            onSelect={chooseStoredFile}
          />
        )}
        {lite && (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <Button
              disabled={
                isUploading || isSending || !!recoveryKey || !recoveryReady
              }
              variant="ghost"
              onClick={() => fileInput.current?.click()}
              data-analytics="file-picker"
              className="min-h-11 gap-2 px-3 text-site-muted hover:bg-site-raised hover:text-site-ink"
              aria-label="Прикрепить файл"
            >
              <Paperclip className="size-4" />
              {isUploading ? 'Читаем…' : 'Файл'}
            </Button>
            <VoiceCall />
            <LiteLeadForm />
          </div>
        )}
        <div className="mt-3 min-h-4 text-center text-xs text-site-subtle">
          {uploadStatus ? (
            <output className="block break-words">{uploadStatus}</output>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3 text-site-accent-ink" />
              {lite
                ? 'Диалог хранится только в открытой вкладке'
                : signedIn
                  ? 'История доступна в вашем аккаунте'
                  : 'Для сохранения истории войдите в кабинет'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
