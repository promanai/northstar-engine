'use client';
import { Localize } from '@/components/locale-provider';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// UI only: authentication, password hashing, session revocation and bootstrap
// protection remain in the existing Standard auth API, not a second auth stack.
export function PatientLogin() {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  async function submit(event: {
    preventDefault(): void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch(
        `/api/auth/${register ? 'register' : 'login'}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Email or password is incorrect.'
            : response.status === 409
              ? 'An account with this email already exists. Try signing in.'
              : response.status === 429
                ? 'Too many attempts. Please wait before trying again.'
                : response.status === 403 && register
                  ? 'The clinic owner must complete initial setup before patient registration opens.'
                  : response.status === 503
                    ? 'Account setup or the service is unavailable. Please contact the clinic owner.'
                    : 'Check your details and try again.',
        );
        return;
      }
      const result = (await response.json()) as { user?: { role: string } };
      if (!result.user) throw new Error();
      const destination = new URLSearchParams(window.location.search).get(
        'next',
      );
      window.location.assign(
        destination === '/admin' &&
          ['admin', 'owner'].includes(result.user.role)
          ? '/admin'
          : '/account',
      );
    } catch {
      setError(
        register
          ? 'Registration was not confirmed. If your account was created, try signing in; no retry is automatic.'
          : 'Sign in was not confirmed. Please try again.',
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const field =
    'mt-2 min-h-11 border-site-line bg-site-page text-base text-site-ink';
  return (
    <Localize>
      {
        <main className="site-theme-scope grid min-h-dvh place-items-center bg-site-page px-4 py-8 text-site-ink [overflow-wrap:anywhere]">
          <div className="w-full max-w-lg">
            <Link
              href="/"
              className="mb-6 inline-flex min-h-11 items-center text-xl font-semibold"
            >
              OraVera · Miami
            </Link>
            <section className="rounded-3xl border border-site-line bg-site-surface p-5 sm:p-8">
              <h1 className="text-3xl font-semibold">
                {register ? 'Create your account' : 'Patient sign in'}
              </h1>
              <p className="mt-3 text-base leading-7 text-site-muted">
                {register
                  ? 'Use your own details. The clinic links appointments to your account; signing up does not book a visit.'
                  : 'View your appointments and their confirmation status.'}
              </p>
              <form
                onSubmit={(event) => void submit(event)}
                className="mt-6 grid gap-5"
              >
                <fieldset disabled={busy} className="grid min-w-0 gap-5">
                  {register && (
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                      <label htmlFor="patient-first-name" className="text-base">
                        First name
                        <Input
                          id="patient-first-name"
                          name="firstName"
                          autoComplete="given-name"
                          maxLength={120}
                          className={field}
                        />
                      </label>
                      <label htmlFor="patient-last-name" className="text-base">
                        Last name
                        <Input
                          id="patient-last-name"
                          name="lastName"
                          autoComplete="family-name"
                          maxLength={120}
                          className={field}
                        />
                      </label>
                    </div>
                  )}
                  <label htmlFor="patient-email" className="text-base">
                    Email
                    <Input
                      id="patient-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={254}
                      className={field}
                    />
                  </label>
                  <label htmlFor="patient-password" className="text-base">
                    Password
                    <Input
                      id="patient-password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      maxLength={256}
                      autoComplete={
                        register ? 'new-password' : 'current-password'
                      }
                      aria-describedby="patient-password-help"
                      className={field}
                    />
                  </label>
                  <p
                    id="patient-password-help"
                    className="-mt-3 text-sm text-site-muted"
                  >
                    8–256 characters
                  </p>
                  {register && (
                    <details className="text-sm">
                      <summary className="cursor-pointer py-2">
                        Clinic owner setup
                      </summary>
                      <label
                        htmlFor="patient-setup-code"
                        className="mt-2 block"
                      >
                        Owner setup code
                        <Input
                          id="patient-setup-code"
                          name="setupToken"
                          type="password"
                          autoComplete="off"
                          maxLength={256}
                          className={field}
                        />
                      </label>
                      <p className="mt-2 leading-6 text-site-muted">
                        Only for the first administrator. Patients do not need
                        this code.
                      </p>
                    </details>
                  )}
                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-site-line p-3 text-base leading-7"
                    >
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="min-h-11 w-full bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
                  >
                    {busy
                      ? 'Please wait…'
                      : register
                        ? 'Create account'
                        : 'Sign in'}
                  </Button>
                </fieldset>
              </form>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setRegister(!register);
                  setError('');
                }}
                className="mt-4 min-h-11 w-full whitespace-normal text-site-ink hover:bg-site-raised"
              >
                {register
                  ? 'Already registered? Sign in'
                  : 'Create a patient account'}
              </Button>
              <p className="mt-5 text-sm leading-6 text-site-muted">
                This installation is being prepared for patient use. Do not
                submit medical information.{' '}
                <Link href="/privacy" className="underline">
                  Privacy information
                </Link>
              </p>
            </section>
          </div>
        </main>
      }
    </Localize>
  );
}
