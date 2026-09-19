import CartPage from '@/app/cart/page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CheckoutPage() {
  return <CartPage />;
}
