// /abonelik — SAYFA 1. Figma FINAL MASTER landing.
//
// Sunum = Figma (SubscriptionLanding). Veri = API (planlar + fiyatlar).
// Site'ın mevcut Header/Footer'ı kök layout'tan gelir; ikinci bir header/footer
// üretilmez (Figma export'undaki jenerik nav/footer, var olmayan sayfalara
// link verdiği ve global bileşenlerle çakıştığı için taşınmamıştır).

import type { Metadata } from 'next';
import { planlariGetir } from '@/lib/subscription';
import { SubscriptionLanding } from '@/components/subscription/SubscriptionLanding';
import { SubscriptionFonts } from '@/components/subscription/SubscriptionUI';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Çiçek Aboneliği — Düzenli Taze Çiçek',
  description:
    'Haftalık, 15 günlük veya aylık çiçek aboneliği. Teslimat gününü siz seçin, '
    + 'özenle hazırlanan taze çiçekler kapınıza gelsin. Dilediğiniz zaman ara verin.',
  alternates: { canonical: '/abonelik' },
  openGraph: {
    title: 'Çiçek Aboneliği — ÇiçekYolla',
    description: 'Düzenli taze çiçek ritüeli. Planınızı seçin, teslimat takviminizi oluşturun.',
    url: '/abonelik',
    type: 'website',
  },
};

export default async function AbonelikPage() {
  const plans = await planlariGetir();
  return (
    <>
      <SubscriptionFonts />
      <SubscriptionLanding plans={plans} />
    </>
  );
}
