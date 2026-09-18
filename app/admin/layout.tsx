import { AdminTheme } from '@/components/admin-theme';
import './admin.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminTheme>{children}</AdminTheme>;
}
