// lib/i18n/productPath.ts — 11 Kas 2026 (ADDITIVE): TR ürün slug'ı → müşterinin dilindeki ürün sayfası.
//
// SORUN (kanıt, yerel birleşik test 11 Kas): /sepet'te teslimatı seçilmemiş satırın "teslimat seç" bağı
// `/urun/<tr-slug>` idi (app/sepet/page.tsx). /de'den gelen müşteri bu bağla TÜRKÇE ürün sayfasına düşüyordu.
// Sepet kaydı TR kaynak slug'ını taşır (fiyat/sipariş verisi TR kaynaktır) → dil adresi ayrıca çözülür.
// KAYNAK: o dilin yayın envanteri (/api/public/translations/surface/inventory — locale sitemap'iyle aynı uç;
// yalnız yayındaki + indexlenebilir ürünler). Bulunamazsa null → çağıran bugünkü TR adresine düşer (ölü bağ yok).
// Saf modül (ağ yok) → node --test ile sınanır.
import { GLOBAL_LOCALES, localeProductPath, type GlobalLocale } from "../global/config.ts";

export const PRODUCT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isProductPathLocale(v: unknown): v is GlobalLocale {
  return typeof v === "string" && (GLOBAL_LOCALES as readonly string[]).includes(v);
}

/** Envanter satırlarından TR slug → dil slug haritası (geçersiz satırlar atlanır). */
export function trToLocaleSlugMap(rows: ReadonlyArray<{ slug?: unknown; tr_slug?: unknown }> | null | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows ?? []) {
    const tr = typeof r?.tr_slug === "string" ? r.tr_slug : "";
    const ls = typeof r?.slug === "string" ? r.slug : "";
    if (PRODUCT_SLUG_RE.test(tr) && PRODUCT_SLUG_RE.test(ls) && !m.has(tr)) m.set(tr, ls);
  }
  return m;
}

/** Dil ürün adresi; çözülemezse null (çağıran `/urun/<tr>`'ye düşer). */
export function localeProductHref(locale: unknown, trSlug: unknown, map: ReadonlyMap<string, string>): string | null {
  if (!isProductPathLocale(locale) || typeof trSlug !== "string" || !PRODUCT_SLUG_RE.test(trSlug)) return null;
  const ls = map.get(trSlug);
  return ls ? localeProductPath(locale, ls) : null;
}
