/**
 * Uzak bölge (fiyat eşiği) kurtarma linki — 15 Kas 2026.
 * ---------------------------------------------------------------------------
 * Ürün, adresin bandındaki fiyat eşiğinin altındaysa müşteri "o adrese gidebilen
 * ürünler"e yönlendirilir. Bu liste zaten VAR: İstanbul ilçe sayfaları uzak/sınır
 * ilçelerde yalnız taban fiyat ve üzeri ürünleri listeler (TR: app/[...slug],
 * Global: lib/global/page.tsx — listing_min_price_minor). Burada yeni liste
 * ÜRETİLMEZ; yalnız o sayfanın müşterinin dilindeki yolu kurulur.
 *
 * Yol "anahtar" biçimindedir (/istanbul/<ilce>, /<dil>/istanbul/<ilce>); site bunu
 * kanonik ilçe adresine kendisi taşır (mevcut 301). Eşik yalnız İstanbul'da
 * uygulandığı için başka il → null (çağıran mevcut kargo linkine düşer).
 */
import { localeLocationPath } from "./global/commercialUrl.ts";

const TR_MAP: Record<string, string> = { "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u", "Ç": "c", "Ğ": "g", "Ö": "o", "Ş": "s", "Ü": "u", "I": "i" };

export function foldTrSlug(value: string): string {
  return value.split("").map((c) => TR_MAP[c] ?? c).join("").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** İstanbul ilçe sayfasının müşteri dilindeki yolu; il İstanbul değilse ya da ilçe yoksa null. */
export function farZoneListingHref(locale: string, city: string | null | undefined, district: string | null | undefined): string | null {
  if (!city || !district) return null;
  if (foldTrSlug(city) !== "istanbul") return null;
  const slug = foldTrSlug(district);
  if (!slug) return null;
  const key = `istanbul/${slug}`;
  return locale === "tr" ? `/${key}` : localeLocationPath(locale, key);
}
