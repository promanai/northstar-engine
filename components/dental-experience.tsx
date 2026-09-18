'use client';
import { Localize } from '@/components/locale-provider';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LiteLeadForm } from '@/components/lite-lead-form';
import {
  attachmentLimit,
  validateAttachment,
  type ChatAttachment,
} from '@/lib/attachment-policy';
import { dentalInformation } from '@/lib/dental-policy';

const information = {
  visit: {
    title: 'Plan an examination',
    text: 'An in-person dentist can assess your oral health and discuss next steps. Fees, opening hours, insurance and available dentists have not yet been published. When requests are enabled, send only your contact details and preferred times. The clinic must confirm your appointment; the AI cannot book it.',
    href: '/dental-exam',
  },
  photo: {
    title: 'About oral photos',
    text: 'A photo is optional supporting context, not a diagnosis or a substitute for an examination. Once enabled, a selected photo goes to the AI provider, not directly to a dentist. Avoid faces and identifying details. Never insert sharp objects or manipulate a painful area to get a picture.',
    href: '/photo-guidance',
  },
  privacy: {
    title: 'Before sharing information',
    text: 'This site is being prepared for patient use. Do not submit health information until the clinic enables the service and publishes its approved privacy information. Consent alone does not establish compliance. Chat and photos are not automatically included in appointment requests.',
    href: '/privacy',
  },
};
type Message = { role: 'user' | 'assistant'; content: string };
export function DentalExperience({
  chatEnabled,
  provider,
  accountEnabled = false,
}: {
  chatEnabled: boolean;
  provider: 'OpenAI' | 'xAI';
  accountEnabled?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [consent, setConsent] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment>();
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [panel, setPanel] = useState<keyof typeof information>('visit');
  const [informationOpen, setInformationOpen] = useState(false);
  function showInformation(key: keyof typeof information) {
    setPanel(key);
    setInformationOpen(true);
  }
  const sending = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  async function choose(file?: File) {
    if (!file || !chatEnabled || !consent || sending.current) return;
    setReading(true);
    setError('');
    try {
      if (
        file.size > attachmentLimit ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      )
        throw new Error();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error());
        reader.onload = () => {
          if (typeof reader.result !== 'string') return reject(new Error());
          resolve(reader.result.split(',')[1] ?? '');
        };
        reader.readAsDataURL(file);
      });
      setAttachment(
        validateAttachment({ name: file.name, mime: file.type, data }),
      );
    } catch {
      setError('Choose a JPG, PNG or WebP image up to 2 MB.');
    } finally {
      setReading(false);
    }
  }
  async function send() {
    if (
      sending.current ||
      !chatEnabled ||
      !consent ||
      !input.trim() ||
      reading ||
      uncertain
    )
      return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        attachment ? '/api/chat/attachment' : '/api/chat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            message: input.trim(),
            history: messages.slice(-12),
            clinicalConsent: true,
            ...(attachment ? { attachment } : {}),
          }),
        },
      );
      const data = (await response.json()) as {
        message?: string;
        mode?: string;
      };
      if (
        !response.ok ||
        data.mode !== 'live' ||
        typeof data.message !== 'string' ||
        !data.message.trim()
      )
        throw new Error();
      setMessages((old) => [
        ...old.slice(-10),
        { role: 'user', content: input.trim() },
        { role: 'assistant', content: data.message! },
      ]);
      setInput('');
      setAttachment(undefined);
      setConsent(false);
    } catch {
      setUncertain(true);
      setError(
        'No reply was confirmed. Your message or photo may have reached the AI provider. We will not resend it automatically. Do not wait here if you need urgent care.',
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const selected = information[panel];
  return (
    <Localize>
      {
        <main className="site-theme-scope min-h-dvh bg-site-page text-site-ink [overflow-wrap:anywhere]">
          <header className="border-b border-site-line px-4 py-4 sm:px-8">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <Link
                href="/"
                aria-label="OraVera home"
                className="text-2xl font-semibold tracking-tight"
              >
                OraVera
                <span className="ml-3 text-sm font-normal text-site-muted">
                  Dental clinic · Miami
                </span>
              </Link>
              <nav
                aria-label="Main navigation"
                className="flex flex-wrap gap-2"
              >
                {accountEnabled && (
                  <Link
                    href="/account"
                    className="inline-flex min-h-11 items-center rounded-xl border border-site-line px-4 text-sm font-medium hover:bg-site-raised"
                  >
                    Patient account
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="min-h-11 text-site-ink hover:bg-site-raised hover:text-site-ink"
                  onClick={() => showInformation('visit')}
                >
                  Your visit
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-11 text-site-ink hover:bg-site-raised hover:text-site-ink"
                  onClick={() => showInformation('privacy')}
                >
                  Privacy
                </Button>
              </nav>
            </div>
          </header>
          <section
            aria-labelledby="dental-chat-title"
            className="mx-auto grid max-w-5xl gap-4 px-4 py-5 sm:px-8 sm:py-8"
          >
            <div className="overflow-hidden rounded-3xl border border-site-line bg-site-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-site-line px-5 py-4 sm:px-7">
                <div>
                  <h1 id="dental-chat-title" className="text-xl font-semibold">
                    OraVera assistant
                  </h1>
                  <p className="mt-1 text-sm text-site-muted">
                    Information and your next step toward an examination
                  </p>
                </div>
                <span className="rounded-full border border-site-line px-3 py-1.5 text-sm text-site-muted">
                  {chatEnabled
                    ? 'AI · not a dentist'
                    : 'Patient services not yet enabled'}
                </span>
              </div>
              <div
                role="log"
                aria-label="Conversation"
                aria-live="polite"
                className="max-h-[45dvh] min-h-52 space-y-5 overflow-y-auto px-5 py-6 sm:px-7"
              >
                <p className="max-w-2xl text-base leading-7">
                  {dentalInformation.welcome}
                </p>
                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={
                      message.role === 'user'
                        ? 'ml-auto max-w-xl rounded-2xl bg-site-raised p-4'
                        : 'max-w-2xl'
                    }
                  >
                    <p className="mb-1 text-sm font-medium text-site-muted">
                      {message.role === 'user' ? 'You' : 'AI assistant'}
                    </p>
                    <p
                      translate="no"
                      dir="auto"
                      className="whitespace-pre-wrap text-base leading-7"
                    >
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 sm:px-7">
                <div className="mb-4 flex flex-wrap gap-2">
                  {(['visit', 'photo'] as const).map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      onClick={() => showInformation(key)}
                      className="min-h-11 max-w-full whitespace-normal border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
                    >
                      {information[key].title}
                    </Button>
                  ))}
                  {accountEnabled ? (
                    <Link
                      href="/account"
                      className="inline-flex min-h-11 items-center rounded-xl border border-site-line px-4 text-sm hover:bg-site-raised"
                    >
                      My appointments
                    </Link>
                  ) : (
                    <LiteLeadForm locale="en" />
                  )}
                </div>
                {!chatEnabled ? (
                  <p className="rounded-2xl border border-site-line bg-site-page p-4 text-base leading-7">
                    {dentalInformation.preview}
                  </p>
                ) : (
                  <div className="mb-3 flex items-start gap-3">
                    <Checkbox
                      id="dental-consent"
                      checked={consent}
                      disabled={busy || reading}
                      onCheckedChange={(checked) => {
                        setConsent(checked === true);
                        if (!checked) setAttachment(undefined);
                      }}
                      className="mt-1"
                    />
                    <label
                      htmlFor="dental-consent"
                      className="text-sm leading-6"
                    >
                      I am 18 or older and agree to send this message, recent
                      chat context and any selected oral photo to {provider} for
                      AI information, not a diagnosis or dentist review.{' '}
                      <Link href="/privacy" className="underline">
                        Read the privacy information
                      </Link>
                    </label>
                  </div>
                )}
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send();
                  }}
                >
                  <label htmlFor="dental-message" className="sr-only">
                    Your message
                  </label>
                  <Textarea
                    id="dental-message"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={!chatEnabled || !consent || busy || uncertain}
                    maxLength={3000}
                    placeholder={
                      chatEnabled
                        ? 'What would you like to ask about your visit?'
                        : 'Chat opens after clinic approval'
                    }
                    className="min-h-24 border-site-line bg-site-page text-base disabled:bg-site-page disabled:opacity-70"
                  />
                  {attachment && (
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 break-all">
                        Selected photo: {attachment.name}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        aria-label="Remove photo"
                        onClick={() => setAttachment(undefined)}
                      >
                        <X />
                      </Button>
                    </div>
                  )}
                  <input
                    ref={picker}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    aria-label="Select an oral photo"
                    className="sr-only"
                    disabled={
                      !chatEnabled || !consent || busy || reading || uncertain
                    }
                    onChange={(event) => {
                      void choose(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !chatEnabled || !consent || busy || reading || uncertain
                      }
                      onClick={() => picker.current?.click()}
                      className="min-h-11 border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
                    >
                      <Paperclip className="size-4" />
                      {reading ? 'Reading photo…' : 'Attach oral photo'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !chatEnabled ||
                        !consent ||
                        !input.trim() ||
                        busy ||
                        reading ||
                        uncertain
                      }
                      className="min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
                    >
                      {busy ? 'Waiting for a reply…' : 'Send message'}
                      <ArrowUp className="size-4" />
                    </Button>
                  </div>
                  {error && (
                    <p role="alert" className="text-base leading-7">
                      {error}
                    </p>
                  )}
                  {uncertain && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 whitespace-normal border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
                      onClick={() => {
                        setUncertain(false);
                        setError('');
                        setConsent(false);
                      }}
                    >
                      Keep draft and review before a new attempt
                    </Button>
                  )}
                </form>
              </div>
            </div>
            <p className="text-sm leading-6 text-site-muted">
              {dentalInformation.emergency}
            </p>
            <p className="text-sm leading-6 text-site-muted">
              Photos are optional. Requests are not confirmed appointments. Your
              local chat history clears on reload; this is not a clinical
              record.
            </p>
          </section>
          <footer className="border-t border-site-line px-4 py-5 text-sm text-site-muted">
            <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4">
              <span>OraVera · Miami</span>
              <Link href="/privacy" className="underline">
                Before sharing information
              </Link>
            </div>
          </footer>
          <Dialog open={informationOpen} onOpenChange={setInformationOpen}>
            <DialogContent className="site-theme-scope max-h-[85dvh] overflow-y-auto border-site-line bg-site-surface text-base text-site-ink [overflow-wrap:anywhere]">
              <DialogTitle className="pr-7 text-xl">
                {selected?.title}
              </DialogTitle>
              <DialogDescription className="text-base leading-7 text-site-muted">
                {selected?.text}
              </DialogDescription>
              <Link href={selected.href} className="text-base underline">
                Read the full information
              </Link>
              <Button
                variant="outline"
                className="min-h-11 border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
                onClick={() => setInformationOpen(false)}
              >
                Close
              </Button>
            </DialogContent>
          </Dialog>
        </main>
      }
    </Localize>
  );
}
