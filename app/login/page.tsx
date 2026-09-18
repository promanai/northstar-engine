import type { Metadata } from 'next';
import StandardLogin from '@/components/standard-login';
import { PatientLogin } from '@/components/patient-login';
import { liteSite } from '@/lib/lite-content';
import { requestLocale } from '@/lib/locale-server';
import { translate } from '@/lib/translations';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale(liteSite.locale);
  return {
    title: translate(
      liteSite.businessType === 'dental' ? 'Sign in · OraVera' : 'Войти',
      locale,
    ),
    robots: { index: false, follow: false },
  };
}
export default function LoginPage() {
  return liteSite.businessType === 'dental' ? (
    <PatientLogin />
  ) : (
    <StandardLogin />
  );
}
