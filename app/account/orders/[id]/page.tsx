import { OrderDetail } from '@/components/order-detail';
export const metadata = {
  title: 'Заказ',
  robots: { index: false, follow: false },
};
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderDetail id={(await params).id} />;
}
