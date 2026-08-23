"use client";

/**
 * Dinamik içerik overlay'i (14 dil Faz 2). DİL = SUNUM: yalnız görünen ad/açıklama
 * değişir; product id/slug/fiyat/varyant/sepet/sipariş verisi TR kaynak kaydıdır.
 * Çeviri yoksa (tablo yok / onaysız / hata) → TR (null döner, çağıran kaynak değeri kullanır).
 */

import { useEffect, useState } from "react";
import { useI18n } from "./index";

export interface ProductContentTx { name: string | null; short_description: string | null; long_description: string | null }
export interface CategoryContentTx { byId: Record<string, { name: string | null; description: string | null }>; bySlug: Record<string, string> }

const productCache = new Map<string, ProductContentTx | null>();
const categoryCache = new Map<string, CategoryContentTx>();
const EMPTY_CAT: CategoryContentTx = { byId: {}, bySlug: {} };

/** Ürün adı/açıklaması — yalnız onaylı çeviri; TR'de daima null. */
export function useProductTranslation(slug: string | null | undefined): ProductContentTx | null {
  const { locale } = useI18n();
  const key = slug && locale !== "tr" ? `${locale}:${slug}` : "";
  const [tx, setTx] = useState<ProductContentTx | null>(() => (key ? productCache.get(key) ?? null : null));
  useEffect(() => {
    if (!key) { setTx(null); return; }
    if (productCache.has(key)) { setTx(productCache.get(key) ?? null); return; }
    let alive = true;
    fetch(`/api/i18n/product?slug=${encodeURIComponent(slug!)}&locale=${locale}`, { cache: "force-cache" })
      .then((r) => r.json()).then((j) => { const v = (j?.data as ProductContentTx | null) ?? null; productCache.set(key, v); if (alive) setTx(v); })
      .catch(() => { if (alive) setTx(null); });
    return () => { alive = false; };
  }, [key, slug, locale]);
  return tx;
}

/** Kategori adları (id ve slug ile) — header/nav/breadcrumb overlay'i. */
export function useCategoryTranslations(): CategoryContentTx {
  const { locale } = useI18n();
  const key = locale !== "tr" ? locale : "";
  const [tx, setTx] = useState<CategoryContentTx>(() => (key ? categoryCache.get(key) ?? EMPTY_CAT : EMPTY_CAT));
  useEffect(() => {
    if (!key) { setTx(EMPTY_CAT); return; }
    if (categoryCache.has(key)) { setTx(categoryCache.get(key)!); return; }
    let alive = true;
    fetch(`/api/i18n/categories?locale=${locale}`, { cache: "force-cache" })
      .then((r) => r.json()).then((j) => { const d = j?.data; const v: CategoryContentTx = d && d.bySlug ? d : EMPTY_CAT; categoryCache.set(key, v); if (alive) setTx(v); })
      .catch(() => { if (alive) setTx(EMPTY_CAT); });
    return () => { alive = false; };
  }, [key, locale]);
  return tx;
}

export { slugFromHref } from "./slug";
