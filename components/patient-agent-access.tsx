'use client';
import { Localize, useLocale } from '@/components/locale-provider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

type Token = {
  id: string;
  name: string;
  scopes: string[];
  expiresAt: string;
  lastUsedAt: string | null;
};
const actionStyle =
  'min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover hover:text-site-on-accent';
const secondaryStyle =
  'min-h-11 border-site-line bg-site-surface text-site-ink hover:bg-site-raised hover:text-site-ink';
function AgentPanel() {
  const { intl, t } = useLocale();
  const date = (value: string) =>
    new Date(value).toLocaleDateString(intl, { dateStyle: 'medium' });
  const [tokens, setTokens] = useState<Token[]>([]),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [truncated, setTruncated] = useState(false);
  const [name, setName] = useState('My assistant'),
    [access, setAccess] = useState('read'),
    [days, setDays] = useState('7');
  const [secret, setSecret] = useState(''),
    [expires, setExpires] = useState(''),
    [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'create' | Token | null>(null);
  const locked = useRef(false),
    mounted = useRef(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/patient-agent', {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? 'Please sign in again to manage agent access.'
            : 'Could not load agent access. Please retry.',
        );
      const result = (await response.json()) as {
        tokens: Token[];
        truncated: boolean;
      };
      if (mounted.current) {
        setTokens(result.tokens);
        setTruncated(result.truncated);
        setError('');
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  async function submit() {
    if (!confirm || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setSecret('');
    try {
      const create = confirm === 'create';
      const response = await fetch(
        create
          ? '/api/patient-agent'
          : `/api/patient-agent?id=${encodeURIComponent(confirm.id)}`,
        {
          method: create ? 'POST' : 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            create
              ? { name, access, expiresInDays: Number(days), confirm: true }
              : {},
          ),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        token: string;
        expiresAt: string;
      };
      if (!response.ok)
        throw new Error(result.error || 'The request was not completed.');
      if (!mounted.current) return;
      if (create) {
        setSecret(result.token);
        setExpires(result.expiresAt);
      } else
        setNotice(
          'Access revoked for future requests. An operation already in progress may finish.',
        );
      setConfirm(null);
      await load();
    } catch (e) {
      if (mounted.current) {
        setConfirm(null);
        setError(
          `${t((e as Error).message)} ${t('If the connection was interrupted, refresh the list before retrying. Revoke an access entry if its token was not received.')}`,
        );
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${t(label)} · ${t('Copied. Keep your token private.')}`);
    } catch {
      setError(
        'Clipboard access was blocked. Select and copy the value manually.',
      );
    }
  }
  const endpoint =
    typeof window === 'undefined'
      ? '/api/mcp'
      : `${window.location.origin}/api/mcp`;
  return (
    <Localize>
      {
        <div id="patient-agent-panel" className="mt-5 space-y-5">
          <p className="text-base leading-7 text-site-muted">
            Connect an AI agent you trust to your own appointments. This does
            not grant clinic administration, medical photos or access to other
            patients—even for a clinic owner.
          </p>
          <div className="rounded-xl bg-site-raised p-4 text-sm leading-6">
            <p className="font-medium">
              MCP connection · manual Bearer authentication
            </p>
            <code className="mt-2 block break-all text-site-ink">
              {endpoint}
            </code>
            <Button
              type="button"
              variant="outline"
              className={`mt-3 ${secondaryStyle}`}
              onClick={() => void copy(endpoint, 'Endpoint')}
            >
              Copy endpoint
            </Button>
            <p className="mt-3">
              Use a client that supports custom Authorization headers:{' '}
              <code>Bearer &lt;your token&gt;</code>. Never put the token in a
              URL. Automatic OAuth sign-in is not available.
            </p>
            <a
              href="/llms.txt"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline"
            >
              Read the public agent guide
            </a>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-site-line p-4 leading-7"
            >
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm leading-6">
              {notice}
            </p>
          )}
          {secret && (
            <div
              className="space-y-3 rounded-xl border border-site-line bg-site-raised p-4"
              aria-label="New agent token"
            >
              <h3 className="font-semibold">Save your token now</h3>
              <p className="text-sm leading-6">
                Shown only once. Expires {date(expires)}. Store it in your
                agent’s secret settings, not in a public prompt. Closing this
                section hides it.
              </p>
              <Input
                aria-label="New agent token"
                readOnly
                value={secret}
                autoComplete="off"
                spellCheck={false}
                className="min-h-11 min-w-0 font-mono text-base"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  className={actionStyle}
                  onClick={() => void copy(secret, 'Token')}
                >
                  Copy token
                </Button>
                <Button
                  variant="outline"
                  className={secondaryStyle}
                  onClick={() => setSecret('')}
                >
                  Hide token
                </Button>
              </div>
            </div>
          )}
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setConfirm('create');
            }}
          >
            <h3 className="font-semibold">Create limited access</h3>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>Agent name</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  disabled={busy}
                  className="min-h-11 min-w-0 border-site-line text-base"
                />
              </label>
              <div className="space-y-2 text-sm">
                <label id="agent-expiry-label">Expires after</label>
                <Select
                  value={days}
                  onValueChange={(v) => v && setDays(v)}
                  disabled={busy}
                  items={[
                    { value: '1', label: '1 day' },
                    { value: '7', label: '7 days' },
                    { value: '30', label: '30 days' },
                  ]}
                >
                  <SelectTrigger
                    aria-labelledby="agent-expiry-label"
                    className="min-h-11 w-full border-site-line text-base"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-site-surface text-site-ink">
                    {['1', '7', '30'].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v} {v === '1' ? 'day' : 'days'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <label id="agent-access-label">Permissions</label>
              <Select
                value={access}
                onValueChange={(v) => v && setAccess(v)}
                disabled={busy}
                items={[
                  { value: 'read', label: 'View only' },
                  { value: 'book', label: 'Manage my appointments' },
                ]}
              >
                <SelectTrigger
                  aria-labelledby="agent-access-label"
                  className="min-h-11 w-full border-site-line text-base"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-site-surface text-site-ink">
                  <SelectItem value="read">View only</SelectItem>
                  <SelectItem value="book">Manage my appointments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm leading-6 text-site-muted">
              {access === 'read'
                ? 'Read published pages, the catalog and your own appointment records. No changes.'
                : 'Also create, reschedule and cancel your appointments and request payment links. No automatic charges. Your agent should ask you to confirm changes; this is not an additional server-side approval step.'}
            </p>
            <Button
              type="submit"
              className={actionStyle}
              disabled={busy || loading || Boolean(secret) || !name.trim()}
            >
              Review access
            </Button>
          </form>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Your agent connections</h3>
              <Button
                variant="outline"
                className={secondaryStyle}
                disabled={busy || loading}
                onClick={() => void load()}
              >
                Refresh connections
              </Button>
            </div>
            {loading ? (
              <p role="status">Loading connections…</p>
            ) : tokens.length === 0 && !error ? (
              <p className="text-sm text-site-muted">
                No agent connections yet.
              </p>
            ) : null}
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-site-line p-4"
              >
                <div className="min-w-0 flex-1">
                  <p
                    translate="no"
                    dir="auto"
                    className="break-words font-medium"
                  >
                    {token.name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-site-muted">
                    {token.scopes.includes('bookings:write')
                      ? 'Manage appointments'
                      : 'View only'}{' '}
                    ·{' '}
                    {new Date(token.expiresAt).getTime() <= Date.now()
                      ? 'Expired'
                      : 'Expires'}{' '}
                    {date(token.expiresAt)}
                  </p>
                  <p className="text-sm leading-6 text-site-muted">
                    {token.lastUsedAt
                      ? `${t('Last used')} ${date(token.lastUsedAt)}`
                      : 'Not used yet'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className={secondaryStyle}
                  disabled={busy}
                  onClick={() => setConfirm(token)}
                  aria-label={`${t('Revoke')} ${token.name}`}
                >
                  Revoke
                </Button>
              </div>
            ))}
            {truncated && (
              <p className="text-sm">Showing the latest 100 connections.</p>
            )}
          </div>
          <AlertDialog
            open={Boolean(confirm)}
            onOpenChange={(open) => {
              if (!open && !busy) setConfirm(null);
            }}
          >
            <AlertDialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto border-site-line bg-site-surface text-site-ink [overflow-wrap:anywhere]">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirm === 'create'
                    ? 'Allow this agent access?'
                    : 'Revoke agent access?'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base leading-7 text-site-muted">
                  {confirm === 'create'
                    ? `${name} · ${t(access === 'read' ? 'Read-only access to public content and your appointments.' : 'Permission to read, create, reschedule and cancel your appointments and request payment links.')} ${t('Expires after')}: ${days} ${t('days')}. ${t('Only share the token with an agent you trust.')}`
                    : 'This token will stop working for future requests. Already running operations may finish. You can create a new token later.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="border-site-line bg-site-surface">
                <Button
                  variant="outline"
                  className={secondaryStyle}
                  disabled={busy}
                  onClick={() => setConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  className={actionStyle}
                  disabled={busy}
                  onClick={() => void submit()}
                >
                  {busy
                    ? 'Saving…'
                    : confirm === 'create'
                      ? 'Confirm and create token'
                      : 'Confirm revocation'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    </Localize>
  );
}
export function PatientAgentAccess() {
  const [open, setOpen] = useState(false);
  return (
    <Localize>
      {
        <section
          className="min-w-0 rounded-2xl border border-site-line p-5"
          aria-labelledby="patient-agent-title"
        >
          <h2 id="patient-agent-title">
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 text-left text-lg font-semibold"
              aria-expanded={open}
              aria-controls={open ? 'patient-agent-panel' : undefined}
              onClick={() => setOpen(!open)}
            >
              <Bot className="size-5 shrink-0" aria-hidden="true" />
              <span className="flex-1">Your AI agent</span>
              <ChevronDown
                className={`size-5 shrink-0 ${open ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          </h2>
          {!open && (
            <p className="mt-1 text-sm leading-6 text-site-muted">
              Give your personal assistant limited, revocable access to your
              appointments.
            </p>
          )}
          {open && <AgentPanel />}
        </section>
      }
    </Localize>
  );
}
