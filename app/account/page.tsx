import type { Metadata } from 'next';
import { AccountDashboard } from '@/components/account-dashboard';
import { PatientAccount } from '@/components/patient-account';
import { liteSite } from '@/lib/lite-content';
import { requestLocale } from '@/lib/locale-server';
import { translate } from '@/lib/translations';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale(liteSite.locale);
  return {
    title: translate(
      liteSite.businessType === 'dental'
        ? 'Patient account · OraVera'
        : 'Личный кабинет',
      locale,
    ),
    robots: { index: false, follow: false },
  };
}

export default function AccountPage() {
  return liteSite.businessType === 'dental' ? (
    <PatientAccount />
  ) : (
    <AccountDashboard />
  );
}
