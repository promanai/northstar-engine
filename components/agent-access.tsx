'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { scopeLabels } from '@/lib/agent-policy';
type Token = {
  id: string;
  name: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};
type View = { tokens: Token[]; allowedScopes: string[]; owner: boolean };
export function AgentAccess() {
  const [view, setView] = useState<View | null>(null);
  const [name, setName] = useState('Мой AI-агент');
  const [days, setDays] = useState('30');
  const [scopes, setScopes] = useState(['catalog:read', 'orders:read']);
  const [full, setFull] = useState(false);
  const [secret, setSecret] = useState('');
  const [endpoint, setEndpoint] = useState('/api/mcp');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revoke, setRevoke] = useState<Token | null>(null);
  async function reload() {
    const response = await fetch('/api/tokens');
    const data = (await response.json()) as View & { error?: string };
    if (!response.ok)
      throw new Error(data.error ?? 'Не удалось загрузить токены');
    setView(data);
  }
  useEffect(() => {
    void Promise.resolve()
      .then(() => {
        setEndpoint(`${window.location.origin}/api/mcp`);
        return reload();
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Ошибка загрузки'),
      );
  }, []);
  async function create() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          expiresInDays: Number(days),
          scopes: full ? ['*'] : scopes,
          confirmFullAccess: full,
        }),
      });
      const data = (await response.json()) as {
        token?: string;
        error?: string;
      };
      if (!response.ok || !data.token)
        throw new Error(data.error ?? 'Не удалось создать токен');
      setSecret(data.token);
      setFull(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка соединения');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!revoke) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/tokens?id=${encodeURIComponent(revoke.id)}`,
        { method: 'DELETE', headers: { 'content-type': 'application/json' } },
      );
      if (!response.ok) throw new Error('Не удалось отозвать токен');
      setSecret('');
      setRevoke(null);
      setMessage('Токен отозван. Следующий запрос агента будет отклонён.');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка соединения');
      setRevoke(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Доступ AI-агентов</h2>
        <p className="mt-2 text-base leading-7 text-site-muted">
          Выберите, что агент сможет делать от вашего имени. Клиентский токен
          работает только с заказами своего аккаунта.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-site-line p-4 text-sm"
        >
          {error}
        </p>
      )}
      {message && <output className="block text-sm">{message}</output>}
      <div className="rounded-2xl border border-site-line bg-site-surface p-5 space-y-3">
        <h3 className="font-semibold">Подключение MCP</h3>
        <p className="break-all text-sm">{endpoint}</p>
        <p className="text-sm leading-6 text-site-muted">
          HTTP POST, заголовок Authorization: Bearer &lt;токен&gt;. Нужен клиент
          с ручной настройкой Bearer-токена; OAuth пока нет. В production
          используйте HTTPS.
        </p>
        <p className="text-sm leading-6 text-site-muted">
          Создание заказа не списывает деньги. Право checkout разрешает получить
          ссылку для оплаты; оплату клиент подтверждает у провайдера.
        </p>
      </div>
      {secret && (
        <section className="rounded-2xl border border-site-accent bg-site-surface p-5 space-y-3">
          <h3 className="font-semibold">Сохраните токен сейчас</h3>
          <p className="text-sm">
            После закрытия он больше не показывается. Не вставляйте его в
            публичные чаты или исходники.
          </p>
          <Textarea
            aria-label="Новый секретный токен"
            readOnly
            value={secret}
            className="min-h-20 break-all text-base"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                void navigator.clipboard
                  .writeText(secret)
                  .then(() => setMessage('Токен скопирован'))
                  .catch(() => setError('Выделите и скопируйте токен вручную'))
              }
            >
              Копировать
            </Button>
            <Button onClick={() => setSecret('')}>Сохранил, скрыть</Button>
          </div>
        </section>
      )}
      {!view ? (
        <Button
          variant="outline"
          onClick={() =>
            void reload().catch(() => setError('Повторите вход в кабинет'))
          }
        >
          Загрузить список токенов
        </Button>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
            className="space-y-5 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6"
          >
            <h3 className="font-semibold">Новый токен</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm" htmlFor="agent-name">
                Название
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  className="mt-2 h-11 text-base"
                />
              </label>
              <label className="text-sm" htmlFor="agent-days">
                Срок действия, дней
                <Input
                  id="agent-days"
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  required
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="mt-2 h-11 text-base"
                />
              </label>
            </div>
            <fieldset
              disabled={busy || full}
              className="grid gap-3 sm:grid-cols-2"
            >
              <legend className="mb-3 text-sm font-medium">Разрешения</legend>
              {view.allowedScopes.map((scope) => (
                <label
                  key={scope}
                  htmlFor={`agent-${scope}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-site-line p-3 text-sm"
                >
                  <span>{scopeLabels[scope]}</span>
                  <Switch
                    id={`agent-${scope}`}
                    checked={scopes.includes(scope)}
                    onCheckedChange={(checked) =>
                      setScopes((current) =>
                        checked
                          ? [...current, scope]
                          : current.filter((s) => s !== scope),
                      )
                    }
                  />
                </label>
              ))}
            </fieldset>
            {view.owner && (
              <label
                htmlFor="agent-full"
                className="flex items-start justify-between gap-4 rounded-xl border border-site-line p-4 text-sm leading-6"
              >
                <span>
                  Я разрешаю полный административный доступ вместо выбранных
                  прав. Агент сможет читать приватные данные и изменять сайт.
                </span>
                <Switch
                  id="agent-full"
                  checked={full}
                  onCheckedChange={setFull}
                  disabled={busy}
                />
              </label>
            )}
            <Button
              type="submit"
              disabled={busy || !!secret || (!full && !scopes.length)}
              className="min-h-11"
            >
              {busy ? 'Сохраняем…' : 'Создать токен'}
            </Button>
          </form>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Выданные токены</h3>
            {!view.tokens.length && (
              <p className="text-sm text-site-muted">Токенов пока нет</p>
            )}
            {view.tokens.map((token) => (
              <article
                key={token.id}
                className="space-y-3 rounded-xl border border-site-line bg-site-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="min-w-0 break-words font-medium">
                    {token.name}
                  </h4>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setRevoke(token)}
                    className="min-h-11"
                  >
                    Отозвать
                  </Button>
                </div>
                <p className="break-words text-sm text-site-muted">
                  {token.scopes
                    .map((s) =>
                      s === '*' ? 'Полный доступ' : (scopeLabels[s] ?? s),
                    )
                    .join(' · ')}
                </p>
                <p className="text-sm">
                  Действует до:{' '}
                  {token.expiresAt
                    ? new Date(token.expiresAt).toLocaleString('ru-RU')
                    : 'без срока — рекомендуется перевыпустить'}
                </p>
                <p className="text-sm text-site-muted">
                  Последний запрос:{' '}
                  {token.lastUsedAt
                    ? new Date(token.lastUsedAt).toLocaleString('ru-RU')
                    : 'ещё не использовался'}
                </p>
              </article>
            ))}
          </section>
        </>
      )}
      <AlertDialog
        open={!!revoke}
        onOpenChange={(open) => {
          if (!open && !busy) setRevoke(null);
        }}
      >
        <AlertDialogContent className="bg-site-surface text-site-ink">
          <AlertDialogTitle>Отозвать доступ агента?</AlertDialogTitle>
          <AlertDialogDescription>
            Токен «{revoke?.name}» перестанет работать. Уже созданные заказы
            сохранятся. Для повторного подключения потребуется новый токен.
          </AlertDialogDescription>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRevoke(null)}
            >
              Оставить
            </Button>
            <Button disabled={busy} onClick={() => void remove()}>
              Отозвать
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
