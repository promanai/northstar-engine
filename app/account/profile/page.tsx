/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { ProfileForm } from '@/components/account-dashboard';

export const metadata: Metadata = {
  title: 'Профиль',
  description: 'Настройки профиля клиента.',
};

export default function ProfilePage() {
  return (
    <main className="dashboard-screen min-h-dvh bg-site-page px-4 py-5 text-site-ink sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <a
          href="/account"
          className="flex min-h-11 items-center gap-2 text-sm text-site-muted hover:text-site-ink"
        >
          <ArrowLeft className="size-4" /> Назад в кабинет
        </a>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] sm:mt-10 sm:text-3xl">
          Профиль
        </h1>
        <p className="mt-2 text-sm text-site-muted">
          Измените контактные данные, которые использует ассистент.
        </p>
        <ProfileForm />
      </div>
    </main>
  );
}
