/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  compareVersions,
  repositoryName,
  type UpdateState,
} from '@/lib/update-policy';
type View = {
  state: UpdateState;
  revision: number;
  installed: { version: string; repository: string; sha: string };
  runnerConfigured: boolean;
  runnerRepository: string | null;
};
const statuses: Record<string, string> = {
  queued: 'В очереди',
  running: 'Сборка и развёртывание',
  succeeded: 'Установлено',
  failed: 'Ошибка — проверьте журнал',
  cancelled: 'Отменено',
};
export function EngineUpdates() {
  const [view, setView] = useState<View | null>(null);
  const [repository, setRepository] = useState('');
  const [automatic, setAutomatic] = useState(false);
  const [trusted, setTrusted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function load() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/updates');
      const body = (await r.json()) as View & { error?: string };
      if (!r.ok)
        throw new Error(body.error ?? 'Не удалось загрузить настройки');
      setView(body);
      setRepository(body.state.repository);
      setAutomatic(body.state.automatic);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка соединения');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  async function action(command: string) {
    if (busy || !view) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: command,
          repository,
          automatic,
          revision: view.revision,
          sha: view.state.candidate?.sha,
          trustRepository: trusted ? repositoryName(repository) : undefined,
        }),
      });
      const body = (await r.json()) as View & { error?: string };
      if (!r.ok) throw new Error(body.error ?? 'Не удалось выполнить действие');
      setView(body);
      setRepository(body.state.repository);
      setAutomatic(body.state.automatic);
      setTrusted(false);
      setMessage(
        command === 'install'
          ? 'Задание в очереди. GitHub Actions заберёт его по расписанию; для немедленного запуска используйте Run workflow.'
          : command === 'configure'
            ? 'Настройки сохранены. При смене репозитория автоматический режим отключён.'
            : command === 'check'
              ? 'Проверка завершена'
              : 'Задание отменено',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка соединения');
    } finally {
      setBusy(false);
    }
  }
  const dirty =
    view &&
    (repositoryName(repository) !== view.state.repository ||
      automatic !== view.state.automatic);
  const release = view?.state.candidate;
  return (
    <section className="mt-6 max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Обновления движка</h2>
          <p className="mt-2 text-sm text-site-muted">
            Установленная версия: {view?.installed.version ?? '…'}
            {view?.installed.sha
              ? ` · ${view.installed.sha.slice(0, 7)}`
              : ' · локальная сборка'}
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void load()}
        >
          Обновить статус
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-site-line p-4 text-sm"
        >
          {error}
        </p>
      )}
      {message && (
        <output className="block text-sm text-site-success">{message}</output>
      )}
      {!view ? (
        <p className="text-site-muted">
          {busy ? 'Загружаем настройки…' : 'Повторите загрузку настроек'}
        </p>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action('configure');
            }}
            className="space-y-5 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6"
          >
            <label htmlFor="engine-repository" className="block text-sm">
              Репозиторий релизов
              <Input
                id="engine-repository"
                className="mt-2 h-11 text-base"
                placeholder="owner/repository или https://github.com/owner/repository"
                value={repository}
                maxLength={240}
                required
                disabled={busy || !!view.state.active}
                onChange={(e) => {
                  setRepository(e.target.value);
                  setTrusted(false);
                  setAutomatic(false);
                }}
              />
            </label>
            <p className="text-sm leading-6 text-site-muted">
              Выберите совместимый репозиторий движка или свой fork. Обновление
              заменяет код, а не объединяет его с локальными доработками.
              Пользовательские данные остаются в D1/R2.
            </p>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="engine-automatic" className="text-sm">
                Автоматически устанавливать стабильные обновления текущего major
              </label>
              <Switch
                id="engine-automatic"
                checked={automatic}
                disabled={busy || !!view.state.active || !view.runnerConfigured}
                onCheckedChange={setAutomatic}
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-site-line bg-site-raised p-4">
              <label htmlFor="engine-trusted" className="text-sm leading-6">
                Я доверяю коду этого репозитория и понимаю, что он получит
                доступ к данным и секретам сайта. Резервное копирование
                настроено.
              </label>
              <Switch
                id="engine-trusted"
                checked={trusted}
                disabled={busy}
                onCheckedChange={setTrusted}
              />
            </div>
            <Button
              type="submit"
              className="min-h-11"
              disabled={
                busy ||
                !!view.state.active ||
                !repositoryName(repository) ||
                ((repositoryName(repository) !== view.state.repository ||
                  automatic) &&
                  !trusted)
              }
            >
              Сохранить настройки
            </Button>
          </form>
          <section className="space-y-4 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
            <h3 className="font-semibold">Последний стабильный релиз</h3>
            {view.state.error && <p className="text-sm">{view.state.error}</p>}
            {release ? (
              <>
                <a
                  className="break-words text-lg font-medium text-site-accent-ink underline"
                  href={release.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {release.tag} — {release.name}
                </a>
                <p className="break-all text-sm text-site-muted">
                  {release.repository} · {release.sha.slice(0, 12)}
                </p>
                <p className="text-sm">
                  {compareVersions(release.version, view.installed.version) > 0
                    ? 'Доступна новая версия'
                    : 'Версия не новее установленной; другой fork можно установить вручную без понижения версии'}
                </p>
              </>
            ) : (
              <p className="text-sm text-site-muted">
                Сохраните репозиторий и проверьте наличие релизов
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="min-h-11"
                disabled={
                  busy ||
                  !!dirty ||
                  !view.state.repository ||
                  !!view.state.active
                }
                onClick={() => void action('check')}
              >
                Проверить GitHub
              </Button>
              <Button
                className="min-h-11"
                disabled={
                  busy ||
                  !!dirty ||
                  !release ||
                  !trusted ||
                  !view.runnerConfigured ||
                  !!view.state.active
                }
                onClick={() => void action('install')}
              >
                Поставить обновление в очередь
              </Button>
            </div>
            {view.state.checkedAt && (
              <p className="text-sm text-site-muted">
                Последняя проверка:{' '}
                {new Date(view.state.checkedAt).toLocaleString('ru-RU')}
              </p>
            )}
          </section>
          <section className="space-y-3 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
            <h3 className="font-semibold">Исполнитель GitHub Actions</h3>
            <p className="text-sm leading-6">
              {view.runnerConfigured
                ? 'Секрет и репозиторий исполнителя заданы'
                : 'Нужна первоначальная настройка workflow и секретов — см. docs/UPDATES.md в проекте'}
              . Проверка релизов выполняется каждый час независимо от открытой
              админки.
            </p>
            <p className="text-sm text-site-muted">
              Последний контакт:{' '}
              {view.state.runnerSeenAt
                ? new Date(view.state.runnerSeenAt).toLocaleString('ru-RU')
                : 'ещё не было — подключение не подтверждено'}
            </p>
            {view.runnerRepository && (
              <a
                className="inline-flex min-h-11 items-center text-sm text-site-accent-ink underline"
                href={`https://github.com/${view.runnerRepository}/actions/workflows/engine-update.yml`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть workflow и журнал ↗
              </a>
            )}
            {view.state.active && (
              <div className="space-y-3 border-t border-site-line pt-4">
                <p>
                  {statuses[view.state.active.status]} · {view.state.active.tag}
                </p>
                <p className="text-sm text-site-muted">
                  До завершения задания смена репозитория заблокирована. Ошибка
                  деплоя может потребовать ручного восстановления;
                  автоматического отката базы нет.
                </p>
                {view.state.active.status === 'queued' && (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => void action('cancel')}
                  >
                    Отменить задание
                  </Button>
                )}
              </div>
            )}
          </section>
          <section>
            <h3 className="text-lg font-semibold">История обновлений</h3>
            {!view.state.history.length ? (
              <p className="mt-3 text-sm text-site-muted">
                Обновлений пока не было
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {view.state.history.map((run) => (
                  <li
                    key={run.id}
                    className="space-y-2 rounded-xl border border-site-line bg-site-surface p-4"
                  >
                    <p className="break-words">
                      {run.repository} · {run.tag}
                    </p>
                    <p className="text-sm">{statuses[run.status]}</p>
                    {run.reason && (
                      <p className="text-sm text-site-muted">{run.reason}</p>
                    )}
                    {run.githubRunId && view.runnerRepository && (
                      <a
                        className="text-sm text-site-accent-ink underline"
                        href={`https://github.com/${view.runnerRepository}/actions/runs/${run.githubRunId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Журнал запуска
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
