/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fileAccept, fileLimit } from '@/lib/file-policy';

type StoredFile = {
  id: string;
  userId: string;
  filename: string;
  size: number;
  status: string;
  recoverable: boolean;
  downloadUrl: string | null;
};
type FileList = {
  files: StoredFile[];
  nextBefore: string | null;
  usage: { count: number; bytes: number };
  limits: { userCount: number; userBytes: number };
};
const sizeText = (bytes: number) =>
  `${(bytes / 1024).toLocaleString('ru', { maximumFractionDigits: 1 })} КБ`;
const statuses: Record<string, string> = {
  uploaded: 'Сохранён',
  uploading: 'Незавершённая загрузка',
  deleting: 'Требуется повторить удаление',
};
export function FileManager({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<FileList | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ file: File; key: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<StoredFile | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/files?all=${admin}${before ? `&before=${encodeURIComponent(before)}` : ''}`,
          { cache: 'no-store' },
        );
        const result = (await response.json()) as FileList & { error?: string };
        if (!response.ok)
          throw new Error(result.error ?? 'Не удалось загрузить список');
        setData((previous) =>
          before && previous
            ? { ...result, files: [...previous.files, ...result.files] }
            : result,
        );
      } catch (problem) {
        setError(
          problem instanceof Error ? problem.message : 'Нет связи с сервером',
        );
      } finally {
        setLoading(false);
      }
    },
    [admin],
  );
  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);
  async function mutate(action: 'upload' | 'delete') {
    if (
      lock.current ||
      (action === 'upload' && !selected) ||
      (action === 'delete' && !deleting)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let response: Response;
      if (action === 'upload' && selected) {
        const form = new FormData();
        form.append('file', selected.file);
        response = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Idempotency-Key': selected.key },
          body: form,
        });
      } else {
        response = await fetch(
          `/api/files/${encodeURIComponent(deleting!.id)}`,
          {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ confirm: true }),
          },
        );
      }
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? 'Операция не выполнена');
      setNotice(
        action === 'upload'
          ? 'Файл сохранён'
          : 'Содержимое удалено без возможности восстановления',
      );
      if (action === 'upload') {
        setSelected(null);
        if (input.current) input.current.value = '';
      } else setDeleting(null);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'Связь прервана. Проверьте список и повторите ту же операцию.',
      );
    } finally {
      await load();
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <section
      className="mt-6 min-w-0 space-y-4 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6"
      aria-label="Файлы"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {admin ? 'Файлы всех клиентов' : 'Мои файлы'}
        </h2>
        <Button
          variant="outline"
          disabled={busy || loading}
          onClick={() => {
            setError('');
            void load();
          }}
        >
          Обновить
        </Button>
      </div>
      <p className="text-sm leading-6 text-site-muted">
        Доступны владельцу файла и администратору. PNG, JPEG, WebP, PDF — до 2
        МБ; TXT/MD в UTF-8 — до 64 КБ. Анализ сохранённых файлов ассистентом
        пока не подключён.
      </p>
      {data && (
        <p className="text-sm text-site-muted">
          Ваша квота: {data.usage.count} / {data.limits.userCount} файлов ·{' '}
          {sizeText(data.usage.bytes)} / {sizeText(data.limits.userBytes)}.
          Незавершённые операции тоже занимают квоту.
        </p>
      )}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm">
          Выбрать файл
          <input
            ref={input}
            type="file"
            accept={fileAccept}
            disabled={busy}
            className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-site-line p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-site-raised file:px-2 file:py-1 file:text-site-ink"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setError('');
              setNotice('');
              if (file && (file.size === 0 || file.size > fileLimit)) {
                setError('Файл должен быть от 1 байта до 2 МБ');
                setSelected(null);
                return;
              }
              setSelected(file ? { file, key: crypto.randomUUID() } : null);
            }}
          />
        </label>
        <Button
          disabled={busy || !selected}
          className="min-h-11 shrink-0"
          onClick={() => void mutate('upload')}
        >
          {busy ? 'Выполняем…' : 'Загрузить'}
        </Button>
      </div>
      <p className="text-xs leading-5 text-site-muted">
        После сбоя нажмите «Загрузить» повторно: ключ операции сохранён. Выбор
        файла заново начинает новую операцию. Зависшую загрузку можно удалить
        через 15 минут.
      </p>
      {error && (
        <p
          role="alert"
          className="break-words rounded-lg border border-site-line p-3 text-sm"
        >
          {error}
        </p>
      )}
      {notice && (
        <output className="block text-sm text-site-success">{notice}</output>
      )}
      {deleting && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-site-line bg-site-raised p-4"
        >
          <p className="break-words text-sm">
            Удалить «{deleting.filename}»? Содержимое невозможно восстановить.
            Служебная запись операции останется.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void mutate('delete')}>
              Подтвердить удаление
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
      {loading && (
        <output className="block text-sm text-site-muted">
          Загружаем список…
        </output>
      )}
      {data?.files.length === 0 && !loading && (
        <p className="py-6 text-sm text-site-muted">Файлов пока нет</p>
      )}
      <ul className="space-y-2">
        {data?.files.map((file) => (
          <li
            key={file.id}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-site-line p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium">{file.filename}</p>
              <p className="mt-1 text-xs text-site-muted">
                {sizeText(file.size)} · {statuses[file.status] ?? file.status}
              </p>
              {admin && (
                <p className="mt-1 break-all text-xs text-site-muted">
                  Владелец: {file.userId ?? 'не указан'}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {file.downloadUrl && (
                <a
                  href={file.downloadUrl}
                  className="inline-flex min-h-11 items-center rounded-lg border border-site-line px-3 text-sm hover:bg-site-raised"
                >
                  Скачать
                </a>
              )}
              <Button
                variant="outline"
                disabled={busy || !file.recoverable}
                onClick={() => setDeleting(file)}
              >
                {file.status === 'deleting' ? 'Повторить удаление' : 'Удалить'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {data?.nextBefore && (
        <Button
          variant="outline"
          disabled={busy || loading}
          onClick={() => void load(data.nextBefore!)}
        >
          Показать ещё
        </Button>
      )}
    </section>
  );
}
