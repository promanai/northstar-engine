import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin-dashboard';

export const metadata: Metadata = { title: 'Админка', description: 'Управление сайтом, ассистентом, моделями и интеграциями.' };

export default function AdminPage() { return <AdminDashboard />; }
