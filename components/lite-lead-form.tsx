'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Capability = {
  enabled: true;
  recipient: string;
  privacyPath: string;
  configurationId: string;
};
type Attempt = {
  id: string;
  name: string;
  contact: string;
  message: string;
  consent: true;
  configurationId: string;
};
export function LiteLeadForm({ locale = 'ru' }: { locale?: 'ru' | 'en' }) {
  const t = (ru: string, en: string) => (locale === 'en' ? en : ru);
  const [config, setConfig] = useState<Capability>();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [receipt, setReceipt] = useState('');
  const [attemptId, setAttemptId] = useState('');
  const [error, setError] = useState('');
  const sending = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/leads', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) return;
        const value = (await r.json()) as Capability;
        if (
          value.enabled === true &&
          typeof value.recipient === 'string' &&
          value.recipient.length <= 120 &&
          /^\/[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(value.privacyPath) &&
          /^[a-f0-9]{64}$/.test(value.configurationId)
        )
          setConfig(value);
      })
      .catch(() => {
        /* Disabled or unavailable: no working-form claim. */
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!name && !contact && !message && !unknown) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [name, contact, message, unknown]);
  if (!config) return null;
  async function submit() {
    if (sending.current || !config || !consent) return;
    sending.current = true;
    setBusy(true);
    setError('');
    const wasUnknown = unknown;
    try {
      if (!attempt.current)
        attempt.current = {
          id: crypto.randomUUID(),
          name,
          contact,
          message,
          consent: true,
          configurationId: config.configurationId,
        };
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(attempt.current),
        signal: AbortSignal.timeout(30000),
      });
      const result = (await response.json()) as {
        accepted?: boolean;
        id?: string;
        delivery?: string;
      };
      if (
        response.status === 202 &&
        result.accepted === true &&
        result.id === attempt.current.id &&
        result.delivery === 'accepted'
      ) {
        setReceipt(result.id);
        setUnknown(false);
        attempt.current = null;
        setName('');
        setContact('');
        setMessage('');
        setConsent(false);
      } else if (result.delivery === 'not_sent' && !wasUnknown) {
        attempt.current = null;
        setError(
          response.status === 409
            ? t(
                'Настройки получателя изменились. Скопируйте черновик, обновите страницу и подтвердите передачу заново.',
                'The recipient settings changed. Copy your draft, reload and review your consent again.',
              )
            : response.status === 429
              ? t(
                  'Слишком много попыток. Подождите минуту; заявка не отправлена.',
                  'Too many attempts. Wait a minute; the request was not sent.',
                )
              : t(
                  'Заявка не отправлена. Проверьте поля и подключение сервиса. Черновик сохранён в этой вкладке.',
                  'Request not sent. Check the fields and service availability. Your draft remains in this tab.',
                ),
        );
      } else {
        throw new Error('UNKNOWN');
      }
    } catch {
      // A client timeout or malformed response cannot prove that delivery failed.
      if (attempt.current) {
        setAttemptId(attempt.current.id);
        setUnknown(true);
        setError(
          t(
            'Приём не подтверждён — заявка могла дойти. Проверьте номер у получателя. Повтор отправит тот же текст и номер; получатель должен защищать от дублей.',
            'Receipt is unconfirmed; the request may have arrived. Check its ID with the recipient. Retrying sends the same text and ID; the recipient must prevent duplicates.',
          ),
        );
      } else
        setError(
          t(
            'Не удалось подготовить заявку. Черновик сохранён.',
            'Could not prepare the request. Your draft remains in this tab.',
          ),
        );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function reset() {
    setReceipt('');
    setError('');
  }
  return (
    <>
      <Button
        variant="outline"
        className="min-h-11 shrink-0 border-site-line bg-site-surface text-site-ink hover:bg-site-raised hover:text-site-ink"
        onClick={() => setOpen(true)}
      >
        {t('Оставить заявку', 'Request an examination')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!sending.current) setOpen(value);
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="site-theme-scope max-h-[85dvh] min-w-0 max-w-[calc(100%-24px)] overflow-y-auto border border-site-line bg-site-surface p-[16px] text-base text-site-ink [overflow-wrap:anywhere] sm:max-w-lg"
        >
          <DialogTitle className="pr-7 text-xl">
            {t('Заявка владельцу сайта', 'Request an examination')}
          </DialogTitle>
          <DialogDescription className="break-words text-base text-site-muted">
            {t('Получатель: ', 'Recipient: ')}
            {config.recipient}.
            {t(
              ' Передадим только заполненные ниже поля, без переписки и файлов.',
              ' Only the fields below will be sent, without chat history or files.',
            )}
          </DialogDescription>
          {receipt ? (
            <output className="grid min-w-0 gap-4">
              <p>
                {t(
                  'Сервис получателя подтвердил приём заявки. Это не подтверждение заказа, оплаты или времени записи.',
                  'The recipient service confirmed receipt of your request. This is not a confirmed appointment, order or payment. The clinic must confirm your visit separately.',
                )}
              </p>
              <p className="break-all text-sm">
                {t('Номер: ', 'Request ID: ')}
                {receipt}
              </p>
              <Button
                className="min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
                onClick={reset}
              >
                {t('Новая заявка', 'New request')}
              </Button>
            </output>
          ) : (
            <form
              className="grid min-w-0 gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label htmlFor="lead-name" className="grid min-w-0 gap-1">
                {t('Ваше имя', 'Your name')}
                <Input
                  id="lead-name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  disabled={busy || unknown}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-11 min-w-0 bg-site-page text-base"
                />
              </label>
              <label htmlFor="lead-contact" className="grid min-w-0 gap-1">
                {t('Email или телефон', 'Email or phone')}
                <Input
                  id="lead-contact"
                  required
                  maxLength={200}
                  autoComplete="email"
                  value={contact}
                  disabled={busy || unknown}
                  onChange={(e) => setContact(e.target.value)}
                  className="min-h-11 min-w-0 bg-site-page text-base"
                />
              </label>
              <label htmlFor="lead-message" className="grid min-w-0 gap-1">
                {t('Что вам нужно', 'Preferred visit / callback times')}
                <Textarea
                  id="lead-message"
                  required
                  maxLength={4000}
                  value={message}
                  disabled={busy || unknown}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-28 min-w-0 bg-site-page text-base"
                />
              </label>
              <div className="flex min-w-0 items-start gap-3">
                <Checkbox
                  id="lead-consent"
                  checked={consent}
                  disabled={busy || unknown}
                  onCheckedChange={(v) => setConsent(v === true)}
                  aria-label={t(
                    'Согласие на передачу заявки',
                    'Consent to send this request',
                  )}
                  className="mt-1"
                />
                <label
                  htmlFor="lead-consent"
                  className="min-w-0 text-sm leading-6"
                >
                  {t(
                    'Согласен передать указанные данные получателю ',
                    'I agree to send these details to ',
                  )}
                  {config.recipient}
                  {t(
                    ' через его сервис обработки заявок. ',
                    ' through its request processing service. ',
                  )}
                  <a
                    href={config.privacyPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {t('Условия обработки данных', 'Privacy information')}
                  </a>
                </label>
              </div>
              <p className="text-sm text-site-muted">
                {t(
                  'Не указывайте пароли и платёжные данные. Черновик хранится только в этой вкладке; после передачи данные хранит получатель.',
                  'Do not include symptoms, photos, medical history, passwords or payment details. Your draft stays in this tab; after submission the recipient holds the data.',
                )}
              </p>
              {error && (
                <p role="alert" className="break-words text-base text-site-ink">
                  {error}
                </p>
              )}
              {unknown && (
                <p className="break-all text-sm">
                  {t('Номер заявки: ', 'Request ID: ')}
                  {attemptId}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !consent ||
                    !name.trim() ||
                    !contact.trim() ||
                    !message.trim()
                  }
                  className="min-h-11 max-w-full whitespace-normal bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
                >
                  {busy
                    ? t('Передаём заявку…', 'Sending request…')
                    : unknown
                      ? t(
                          'Повторить с тем же номером',
                          'Retry with the same ID',
                        )
                      : t('Подтвердить и отправить', 'Confirm and send')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="min-h-11 border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
                  onClick={() => setOpen(false)}
                >
                  {t('Закрыть', 'Close')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
