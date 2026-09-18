/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { Localize } from '@/components/locale-provider';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PageBlocks } from '@/components/page-blocks';
import type { PublicNavigationItem } from '@/lib/navigation-policy';

export function PublishedPageContent({ id }: { id: string }) {
  const [page, setPage] = useState<{
    title: string;
    slug: string;
    blocks: unknown[];
  } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setPage(null);
      setError('');
      try {
        const response = await fetch(
          `/api/navigation/page?id=${encodeURIComponent(id)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const data = (await response.json()) as {
          title: string;
          slug: string;
          blocks: unknown[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error || 'Не удалось загрузить страницу');
        if (!controller.signal.aborted) setPage(data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Ошибка сети');
      }
    });
    return () => controller.abort();
  }, [id, retry]);
  if (error)
    return (
      <Localize>
        {
          <div role="alert">
            <p>{error}</p>
            <Button
              variant="outline"
              className="mt-3 min-h-11"
              onClick={() => setRetry((n) => n + 1)}
            >
              Повторить
            </Button>
          </div>
        }
      </Localize>
    );
  if (!page)
    return (
      <Localize>
        {<output className="text-site-muted">Загрузка страницы…</output>}
      </Localize>
    );
  return (
    <Localize>
      {
        <article className="min-w-0 break-words">
          <h2 className="text-2xl font-semibold">{page.title}</h2>
          <PageBlocks blocks={page.blocks} />
          <a
            href={page.slug}
            className="mt-5 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Открыть отдельной страницей
          </a>
        </article>
      }
    </Localize>
  );
}
export function NavigationLink({
  item,
  className,
  onNavigate,
}: {
  item: PublicNavigationItem;
  className?: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  return (
    <Localize>
      {
        <>
          <a
            ref={link}
            href={item.href}
            className={className}
            title={item.label}
            aria-haspopup={item.presentation === 'modal' ? 'dialog' : undefined}
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              if (item.presentation === 'modal') {
                event.preventDefault();
                setOpen(true);
              } else onNavigate?.();
            }}
          >
            {item.label}
          </a>
          {item.presentation === 'modal' && (
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                if (!value) requestAnimationFrame(() => link.current?.focus());
              }}
            >
              <DialogContent
                showCloseButton={false}
                className="site-theme-scope max-h-[85dvh] overflow-y-auto border border-site-line bg-site-surface p-5 text-site-ink sm:max-w-2xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="text-lg">{item.label}</DialogTitle>
                  <DialogClose
                    render={
                      <Button
                        variant="outline"
                        className="min-h-11 border-site-line"
                      />
                    }
                  >
                    Закрыть
                  </DialogClose>
                </div>
                <DialogDescription className="text-site-muted">
                  Информация со страницы сайта
                </DialogDescription>
                {open && (
                  <PublishedPageContent key={item.target} id={item.target} />
                )}
              </DialogContent>
            </Dialog>
          )}
        </>
      }
    </Localize>
  );
}
