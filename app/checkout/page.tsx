"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShoppingBag } from "lucide-react";
import CheckoutFlow, { type CheckoutAddon } from "@/components/checkout/CheckoutFlow";
import { useCart } from "@/lib/cart";
import { savePendingDelivery, type PendingDelivery } from "@/lib/pendingDelivery";

function deliveryFingerprint(delivery?: PendingDelivery) {
  if (!delivery) return null;
  return JSON.stringify({
    date: delivery.date ?? null,
    mode: delivery.mode ?? null,
    slot: delivery.slotId ?? delivery.slotLabel ?? delivery.slotStart ?? null,
    place: delivery.placeId ?? delivery.address ?? null,
  });
}

export default function CartCheckoutPage() {
  const { items, hydrated, subtotalMinor, clearCart } = useCart();
  const first = items[0];
  const firstDelivery = first?.delivery;
  const fingerprint = deliveryFingerprint(firstDelivery);
  const deliveryIsComplete = Boolean(firstDelivery?.date && firstDelivery?.address && (firstDelivery.mode === "cargo" || firstDelivery.slotId || firstDelivery.slotLabel || firstDelivery.slotStart));
  const sameDelivery = items.every((item) => deliveryFingerprint(item.delivery) === fingerprint);

  useEffect(() => {
    if (first && firstDelivery) savePendingDelivery({ ...firstDelivery, productSlug: first.productSlug, productName: first.name });
  }, [first, firstDelivery]);

  const { addons, initialAddonQty } = useMemo(() => {
    const mapped: CheckoutAddon[] = [];
    const quantities: Record<number, number> = {};
    items.slice(1).forEach((item, index) => {
      const key = index + 1;
      mapped.push({ id: key, productId: item.productId, variantId: item.variantId, name: item.variantTitle ? `${item.name} · ${item.variantTitle}` : item.name, priceMinor: item.unitPriceMinor, image: item.image, category: "Sepet ürünü" });
      quantities[key] = item.quantity;
    });
    return { addons: mapped, initialAddonQty: quantities };
  }, [items]);

  if (!hydrated) return <main className="min-h-[60vh] bg-background px-6 py-16 text-center text-muted-foreground">Sepetiniz hazırlanıyor…</main>;
  if (!first) return <main className="min-h-[60vh] bg-background px-6 py-16 text-center"><ShoppingBag className="mx-auto h-12 w-12 text-primary" /><h1 className="mt-5 font-display text-3xl font-semibold">Sepetiniz boş</h1><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"><ArrowLeft className="h-4 w-4" /> Alışverişe dön</Link></main>;

  if (!deliveryIsComplete || !sameDelivery) return <main className="min-h-[60vh] bg-background px-6 py-16"><section className="mx-auto max-w-2xl rounded-[24px] border border-border bg-card p-8 text-center shadow-[0_18px_55px_rgba(45,22,72,.05)]"><AlertTriangle className="mx-auto h-11 w-11 text-primary" /><h1 className="mt-5 font-display text-3xl font-semibold">Teslimat seçimini doğrulayın</h1><p className="mt-3 leading-7 text-muted-foreground">Siparişteki bütün ürünler için aynı teslimat adresi, tarihi ve saat aralığı seçilmelidir. Eski veya farklı teslimatlı ürünü sepetten çıkarıp ürün sayfasından geçerli slotla yeniden ekleyin.</p><Link href="/sepet" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"><ArrowLeft className="h-4 w-4" /> Sepete dön</Link></section></main>;

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-12"><CheckoutFlow productName={first.variantTitle ? `${first.name} · ${first.variantTitle}` : first.name} productId={first.productId} variantId={first.variantId} priceMinor={first.unitPriceMinor} productSlug={first.productSlug} coverUrl={first.image} addons={addons} quantity={first.quantity} initialAddonQty={initialAddonQty} totalMinor={subtotalMinor} returnPath="/checkout" onComplete={clearCart} /></div></main>;
}
