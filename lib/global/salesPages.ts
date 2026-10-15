// ============================================================================
// GLOBAL SATIŞ SAYFALARI (15 Eki 2026, ADDITIVE) — saf modül (node --test).
//
// Satış sayfası = global_pages satırı; page_key tek segmentli, 13 dilde ORTAK ASCII niyet anahtarıdır
// (yerleşikler: INTENT_PAGE_KEYS). Admin → Global Merkezi → Satış Sayfaları dilin SEO adresini (url_slug),
// hedef anahtar kelimeyi ve SIRALI ürün seçimini (product_ids) aynı satıra yazar. Kurallar API
// backend/src/globalSalesPages.ts ile BİREBİR aynıdır.
//   • adres  : /{dil}/{url_slug}; url_slug yoksa /{dil}/{page_key} (bugünkü niyet sayfaları aynen)
//   • tekillik: url_slug varken /{dil}/{page_key} → 301 url_slug (tek indexlenebilir adres)
//   • ürünler: product_ids doluysa sayfa YALNIZ bu ürünleri bu sırayla gösterir (o dilde canlı ∩ İstanbul teslimatı);
//              boşsa bugünkü katalog + niyet kategorisi
// ============================================================================
import type { GlobalCatalogResponse } from "./globalCatalog.ts";

export const SALES_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** /{dil}/ altında başka yüzeye ait tek segmentler (API SALES_RESERVED ile aynı). */
export const SALES_RESERVED: ReadonlySet<string> = new Set([
  "home", "storefront", "blog", "sitemaps", "sitemap", "api", "search", "cart", "checkout", "sepet", "odeme",
  "istanbul", "antalya", "mugla", "izmir",
  "product", "category", "produkt", "kategorie", "produit", "categorie", "prodotto", "categoria",
  "producto", "produto", "mehsul", "kateqoriya",
]);

/** Ticari lokasyon kalıpları (commercialUrl.ts COMMERCIAL_URL_PATTERNS, RU dahil) — satış adresi olamaz. */
const COMMERCIAL_PREFIX_CITY: readonly [string, string][] = [
  ["flower-delivery", "istanbul"], ["blumen-verschicken", "istanbul"], ["livraison-fleurs", "istanbul"],
  ["consegna-fiori", "istanbul"], ["bloemen-bezorgen", "istanbul"], ["envio-de-flores", "estambul"],
  ["entrega-de-flores", "istambul"], ["dostavka-tsvetov", "stambul"],
];

/** Tek segment bir satış sayfası adresi/anahtarı OLABİLİR mi (biçim + ayrılmış + ticari lokasyon kalıbı değil). */
export function isSalesSegment(seg: string): boolean {
  if (seg.length < 3 || seg.length > 80 || !SALES_SLUG_RE.test(seg) || SALES_RESERVED.has(seg)) return false;
  return !COMMERCIAL_PREFIX_CITY.some(([p, c]) => seg === `${p}-${c}` || (seg.startsWith(`${p}-`) && seg.endsWith(`-${c}`)));
}

/** Satış sayfası satırı: tek segment, ana sayfa/vitrin değil. */
export function isSalesPageRow(row: { page_key: string }): boolean {
  return !row.page_key.includes("/") && isSalesSegment(row.page_key);
}

/** Satırın public yolu (url_slug varsa o; yoksa anahtar). */
export function salesPagePath(locale: string, pageKey: string, urlSlug?: string | null): string {
  return `/${locale}/${urlSlug || pageKey}`;
}

/** İstenen segment satırın kanonik adresi değilse (anahtar ile gelinip adres tanımlıysa) 301 hedefi; yoksa null. */
export function salesRedirectTarget(locale: string, requested: string, row: { page_key: string; url_slug?: string | null }): string | null {
  const slug = row.url_slug || null;
  return slug && requested !== slug ? salesPagePath(locale, row.page_key, slug) : null;
}

/** Admin'in sıraladığı ürün seçimi (geçersiz/tekrarlı öğeler atılır). */
export function salesProductIds(row: { product_ids?: unknown }): number[] {
  if (!Array.isArray(row.product_ids)) return [];
  const out: number[] = [];
  for (const v of row.product_ids) {
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && Number.isSafeInteger(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * Katalog yanıtını sayfanın ürün seçimine indirger: yalnız seçili ürünler, seçim sırasıyla (featured_ids = sıra);
 * kategoriler aynı kümeye süzülür. Seçim boşsa ya da yanıt beklenen biçimde değilse yanıt AYNEN döner.
 * Katalogda olmayan (o dilde canlı değil / teslimata uygun değil) seçili ürün sessizce düşer — uydurma kart yok.
 */
export function curateCatalog<T>(resp: T, ids: readonly number[]): T {
  if (!ids.length || !resp || typeof resp !== "object") return resp;
  const r = resp as unknown as GlobalCatalogResponse;
  if (!Array.isArray(r.products) || !Array.isArray(r.categories) || !Array.isArray(r.featured_ids)) return resp;
  const byId = new Map(r.products.map((p) => [p.id, p]));
  const order = ids.filter((id) => byId.has(id));
  const keep = new Set(order);
  const curated: GlobalCatalogResponse = {
    ...r,
    total: order.length,
    selection: "manual",
    featured_ids: order,
    products: order.map((id) => byId.get(id)!),
    categories: r.categories.map((c) => ({ ...c, product_ids: c.product_ids.filter((id) => keep.has(id)) })),
  };
  return curated as unknown as T;
}
