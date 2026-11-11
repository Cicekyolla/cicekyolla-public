import { NextResponse } from "next/server";
import { fetchLocaleInventory } from "@/lib/global/api";
import { isProductPathLocale, localeProductHref, PRODUCT_SLUG_RE, trToLocaleSlugMap } from "@/lib/i18n/productPath";

/**
 * 11 Kas 2026 (ADDITIVE): /api/i18n/product-path?slug=<tr-slug>&locale=xx → { data: { path } | null }
 * Sepetteki "teslimat seç" bağı müşteriyi kendi dilindeki ürün sayfasına götürsün (lib/i18n/productPath.ts).
 * Envanter dil başına 10 dk süreç belleğinde (sayfa başına ek yük yok); okuma hatasında null → istemci TR adresine düşer.
 * Yalnız GET, yalnız allowlist alanı (path) döner.
 */
export const dynamic = "force-dynamic";

const TTL_MS = 10 * 60_000;
const memo = new Map<string, { at: number; map: Map<string, string> }>();

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const locale = sp.get("locale") ?? "";
  const slug = (sp.get("slug") ?? "").trim();
  if (!isProductPathLocale(locale) || !PRODUCT_SLUG_RE.test(slug) || slug.length > 200) return NextResponse.json({ data: null });
  let hit = memo.get(locale);
  if (!hit || Date.now() - hit.at > TTL_MS) {
    const inv = await fetchLocaleInventory(locale).catch(() => null);
    const map = trToLocaleSlugMap(inv?.products);
    if (map.size > 0) { hit = { at: Date.now(), map }; memo.set(locale, hit); }
  }
  const path = hit ? localeProductHref(locale, slug, hit.map) : null;
  return NextResponse.json({ data: path ? { path } : null }, { headers: { "Cache-Control": "no-store" } });
}
