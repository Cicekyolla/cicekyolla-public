// /abonelik/olustur — SAYFA 2. Premium teslimat takvimi + sipariş özeti.
//
// Plan `?plan=<publicId>` ile gelir ve SUNUCUDA doğrulanır: geçersiz/satışa
// kapalı plan ile devam edilemez (istemciye güvenilmez). Plan yoksa
// /abonelik'e yönlendirilir.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { planGetir } from '@/lib/subscription';
import { SubscriptionCreate } from '@/components/subscription/SubscriptionCreate';
import { SubscriptionFonts } from '@/components/subscription/SubscriptionUI';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Abonelik Oluştur — Teslimat Takvimi',
  description: 'İlk teslimat tarihinizi seçin, teslimat programınızı oluşturun.',
  robots: { index: false, follow: true },
};

export default async function AbonelikOlusturPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  if (!planId) redirect('/abonelik');

  const plan = await planGetir(planId);
  // Satın alınamaz plan (pasif, arşivli ya da fiyatı girilmemiş) ile devam edilmez.
  if (!plan || !plan.purchasable) redirect('/abonelik');

  return (
    <>
      <SubscriptionFonts />
      <SubscriptionCreate plan={plan} />
    </>
  );
}
