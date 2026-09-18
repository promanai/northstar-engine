'use client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
export function AdminConfirm({
  open,
  title,
  description,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onCancel();
      }}
    >
      <AlertDialogContent className="border border-site-line bg-site-surface text-site-ink">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="break-words text-site-muted">
          {description}
        </AlertDialogDescription>
        <AlertDialogFooter className="bg-site-raised">
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={onConfirm}>
            {busy ? 'Выполняем…' : 'Подтвердить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
