"use client";

/**
 * Revenue Optimizer — ödeme sayfasının "Ek Ürünler" adımındaki öneriler.
 *
 * Kaynak: panelde AÇIK öneri/paketler (`/api/checkout-offers` → API migration 118).
 * Panelde kapalıysa veya istek başarısızsa boş liste döner ve ödeme sayfası
 * bugünkü gibi çalışır. Fiyat bilgi amaçlıdır: sipariş anında sunucu fiyatı
 * DB'den yeniden hesaplar (tutar kilidi 409 total_changed korur).
 * Rozet ve kısa notlar YALNIZ gerçek veriden gelir (panel rozeti, gerçek sayılar).
 * Etiketler her çizimde GÜNCEL dille üretilir (sözlük sonradan yüklenebilir).
 */
import { useEffect, useMemo, useState } from "react";
import type { CheckoutAddon, CheckoutBundle } from "@/components/checkout/CheckoutFlow";
import { useI18n } from "@/lib/i18n";

interface OfferItem {
  id: number; product_id: number; variant_id: number | null; name: string; price_minor: number; image_url: string | null;
  category: string; badge: string | null; florist_pick: boolean; adds_24h: number | null; accept_rate: number | null; also_added: boolean;
}
interface OfferBundle { id: number; name: string; description: string | null; items: { product_id: number; name: string; price_minor: number; image_url: string | null }[]; total_minor: number }
interface OfferResponse { enabled: boolean; items: OfferItem[]; bundles: OfferBundle[] }

const WAIT_MS = 1500;
const EMPTY: OfferResponse = { enabled: false, items: [], bundles: [] };

/** `productIds` null iken istek atılmaz (sepet hazır değil / sipariş verildi). */
export function useCheckoutOffers(productIds: number[] | null) {
  const { t } = useI18n();
  const key = productIds ? productIds.join(",") : null;
  const [raw, setRaw] = useState<{ ready: boolean; data: OfferResponse }>({ ready: false, data: EMPTY });

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    const ctrl = new AbortController();
    const giveUp = setTimeout(() => { if (alive) { setRaw({ ready: true, data: EMPTY }); ctrl.abort(); } }, WAIT_MS);
    fetch(`/api/checkout-offers?ids=${encodeURIComponent(key)}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data?: OfferResponse } | null) => {
        if (!alive) return;
        const d = json?.data;
        setRaw({ ready: true, data: d?.enabled ? d : EMPTY });
      })
      .catch(() => { if (alive) setRaw({ ready: true, data: EMPTY }); })
      .finally(() => clearTimeout(giveUp));
    return () => { alive = false; clearTimeout(giveUp); ctrl.abort(); };
  }, [key]);

  const view = useMemo(() => {
    const d = raw.data;
    const catLabel = (c: string) => {
      const k = `co.offerCat.${c}` as Parameters<typeof t>[0];
      const v = t(k);
      return v === k ? t("co.addonProduct") : v;
    };
    const addons: CheckoutAddon[] = d.items.map((i) => ({
      id: 0,
      productId: i.product_id,
      variantId: i.variant_id,
      name: i.name,
      priceMinor: i.price_minor,
      image: i.image_url,
      category: catLabel(i.category),
      badge: i.badge ?? (i.florist_pick ? t("co.offerFloristPick") : null),
      note: i.also_added ? t("co.offerAlsoAdded")
        : i.adds_24h ? t("co.offerAddedToday", { n: i.adds_24h })
        : i.accept_rate ? t("co.offerAcceptRate", { n: i.accept_rate }) : null,
      offer: true,
    }));
    // Paket ürünleri öneri listesinde yoksa ekle (paket düğmesi bu satırların adedini açar).
    for (const b of d.bundles) {
      for (const p of b.items) {
        if (addons.some((a) => a.productId === p.product_id)) continue;
        addons.push({ id: 0, productId: p.product_id, variantId: null, name: p.name, priceMinor: p.price_minor, image: p.image_url, category: b.name, offer: true });
      }
    }
    const bundles: CheckoutBundle[] = d.bundles.map((b) => ({
      id: b.id, name: b.name, description: b.description, productIds: b.items.map((p) => p.product_id),
      totalMinor: b.total_minor, names: b.items.map((p) => p.name),
    }));
    return { addons, bundles };
  }, [raw.data, t]);

  const ready = key === null ? true : raw.ready;
  return useMemo(() => ({ ready, ...view }), [ready, view]);
}
