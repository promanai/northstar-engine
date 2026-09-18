'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import type { ChatFileView } from '@/lib/chat-file-policy';

export function ChatFilePicker({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (file: ChatFileView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ChatFileView[]>([]);
  const [before, setBefore] = useState<string | null>(null);
  async function load(cursor?: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/files${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as {
        files: (ChatFileView & { status: string })[];
        nextBefore: string | null;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Не удалось загрузить файлы');
      const available = data.files.filter((file) => file.status === 'uploaded');
      setRows((current) => (cursor ? [...current, ...available] : available));
      setBefore(data.nextBefore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Нет связи с сервером');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        disabled={disabled}
        variant="ghost"
        className="min-h-11 text-sm text-site-muted hover:bg-site-raised"
        onClick={() => {
          setOpen(true);
          setRows([]);
          setBefore(null);
          void load();
        }}
      >
        Мои файлы
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[85dvh] overflow-y-auto border border-site-line bg-site-surface text-site-ink sm:max-w-lg"
        >
          <DialogTitle>Файл для консультанта</DialogTitle>
          <DialogDescription className="text-site-muted">
            Выберите свой сохранённый файл. Передачу AI нужно отдельно
            подтвердить перед отправкой сообщения.
          </DialogDescription>
          {error && (
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
          {!busy && !error && !rows.length && (
            <p className="text-sm text-site-muted">
              Доступных файлов пока нет. Загрузите файл скрепкой в чате.
            </p>
          )}
          <div className="space-y-2">
            {rows.map((file) => (
              <Button
                key={file.id}
                disabled={disabled || busy}
                variant="outline"
                className="h-auto min-h-12 w-full justify-start whitespace-normal break-words border-site-line bg-site-raised p-3 text-left text-site-ink"
                onClick={() => {
                  onSelect(file);
                  setOpen(false);
                }}
              >
                {file.filename}
              </Button>
            ))}
          </div>
          {busy && (
            <output className="text-sm text-site-muted">
              Загружаем файлы…
            </output>
          )}
          {before && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => void load(before)}
            >
              Показать ещё
            </Button>
          )}
          {error && (
            <Button disabled={busy} onClick={() => void load()}>
              Повторить
            </Button>
          )}
          <DialogClose
            render={
              <Button
                variant="outline"
                className="min-h-11 border-site-line bg-site-raised text-site-ink"
              />
            }
          >
            Закрыть
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
