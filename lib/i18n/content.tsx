"use client";

/**
 * Dinamik içerik overlay'i (14 dil Faz 2). DİL = SUNUM: yalnız görünen ad/açıklama
 * değişir; product id/slug/fiyat/varyant/sepet/sipariş verisi TR kaynak kaydıdır.
 * Çeviri yoksa (tablo yok / onaysız / hata) → TR (null döner, çağıran kaynak değeri kullanır).
 */

import { useEffect, useState } from "react";
import { useI18n } from "./index";

export interface ProductContentTx { name: string | null; short_description: string | null; long_description: string | null }
export interface CategoryContentTx { byId: Record<string, { name: string | null; description: string | null }>; bySlug: Record<string, { name: string; description: string | null }> }

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

// ---------------------------------------------------------------------------
// Ürün adı (kart / sepet satırı / checkout görünümü) — toplu (batch) overlay.
// Aynı render turunda istenen id'ler tek istekte alınır (/api/i18n/products?ids=).
// Yalnız GÖRÜNEN ad değişir; sepet kaydı, sipariş payload'ı ve product_id TR kaynak kalır.
// ---------------------------------------------------------------------------
const nameCache = new Map<string, Record<string, string>>(); // locale → {id: name}
const pending = new Map<string, Set<number>>();               // locale → ids
const listeners = new Map<string, Set<() => void>>();          // locale → notify
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushPending() {
  flushTimer = null;
  for (const [locale, ids] of pending) {
    pending.delete(locale);
    const list = [...ids].slice(0, 200);
    if (!list.length) continue;
    fetch(`/api/i18n/products?ids=${list.join(",")}&locale=${locale}`, { cache: "force-cache" })
      .then((r) => r.json())
      .then((j) => {
        const got = (j?.data ?? {}) as Record<string, string>;
        const cur = nameCache.get(locale) ?? {};
        for (const id of list) cur[String(id)] = got[String(id)] ?? cur[String(id)] ?? ""; // "" = çeviri yok (tekrar istenmez)
        nameCache.set(locale, cur);
      })
      .catch(() => { const cur = nameCache.get(locale) ?? {}; for (const id of list) cur[String(id)] = cur[String(id)] ?? ""; nameCache.set(locale, cur); })
      .finally(() => { listeners.get(locale)?.forEach((fn) => fn()); });
  }
}

export function useProductName(productId: number | string | null | undefined, fallback: string): string {
  const { locale } = useI18n();
  const id = Number(productId);
  const active = locale !== "tr" && Number.isInteger(id) && id > 0;
  const [, bump] = useState(0);
  useEffect(() => {
    if (!active) return;
    const cached = nameCache.get(locale)?.[String(id)];
    if (cached !== undefined) return;
    if (!pending.has(locale)) pending.set(locale, new Set());
    pending.get(locale)!.add(id);
    if (!listeners.has(locale)) listeners.set(locale, new Set());
    const fn = () => bump((n) => n + 1);
    listeners.get(locale)!.add(fn);
    if (!flushTimer) flushTimer = setTimeout(flushPending, 30);
    return () => { listeners.get(locale)?.delete(fn); };
  }, [active, locale, id]);
  if (!active) return fallback;
  const v = nameCache.get(locale)?.[String(id)];
  return v ? v : fallback;
}

/** Kategori sayfası başlığı/açıklaması overlay'i (sunucu bileşeninden kullanılır; SEO metadata DEĞİŞMEZ). */
export function CategoryHeadingText({ slug, fallback, field = "name" }: { slug: string; fallback: string; field?: "name" | "description" }) {
  const tx = useCategoryTranslations();
  const e = tx.bySlug[slug.toLowerCase()];
  if (!e) return <>{fallback}</>;
  return <>{field === "name" ? e.name || fallback : e.description || fallback}</>;
}

/** Satır içi görünen ürün adı (sepet/checkout/kart listeleri — döngü içinde güvenle kullanılır). */
export function ProductDisplayName({ id, fallback, suffix }: { id: number | string | null | undefined; fallback: string; suffix?: string | null }) {
  const name = useProductName(id, fallback);
  return <>{suffix ? `${name} · ${suffix}` : name}</>;
}
