// ============================================================================
// GLOBAL KATALOG — saf modül (ağ yok; node --test ile test edilir).
//
// Kaynak: API GET /api/public/global/catalog?locale=[&city&district&neighborhood]
//   GLOBAL KATALOG = o dilde canlı TÜM aktif ürünler (tek product_id, 13 dil)
//   KATEGORİ       = katalog ∩ Product Center'daki GERÇEK bağ; sıra Global Merkezi'nden,
//                    13 dilde ortak (product_ids zaten sıralı gelir)
//   VİTRİN         = yalnız öne çıkarma (featured_ids); kategoriye girmek için şart DEĞİL
// Lokasyon verilirse API ürünleri, kategori listelerini ve öne çıkanları teslimat
// uygunluğuyla (Delivery Engine + Coverage) süzer; kalanların sırası bozulmaz.
//
// KARAR (catalogDecision):
//   • yanıt yok (ağ/HTTP hatası, uç henüz yayında değil) / bozuk → "fallback":
//     sayfa bugünkü davranışında kalır — ürünler ne topluca gizlenir ne topluca açılır.
//   • lokasyon istendi, yanıtta lokasyon yok → "fallback" (teslimat kararı yok).
//   • lokasyon çözülemedi (found=false) → boş katalog (teslimat gerçeği bilinmiyor → fail closed).
// ============================================================================

export interface CatalogProduct {
  id: number;
  tr_slug: string;
  slug: string;
  name: string;
  short_description?: string | null;
  price_minor: number;
  sale_price_minor: number | null;
  image: string | null;
  blurhash?: string | null;
  derivatives?: { webp?: string; avif?: string; responsive?: Record<string, string> } | null;
  same_day_available: boolean;
  delivery_model_code: string | null;
  is_new: boolean;
  is_bestseller: boolean;
  /** Product Center gerçek kategori bağı (o dilin approved kategori slug'ları). */
  product_category_slugs: string[];
  product_type?: string | null;
  delivery_scope?: string | null;
}
export interface CatalogCategory {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  image_source: "category" | "product" | null;
  product_ids: number[];
}
export interface GlobalCatalogResponse {
  locale: string;
  total: number;
  selection: "manual" | "none";
  featured_ids: number[];
  location: { city: string; district: string | null; neighborhood: string | null; found: boolean; same_day: boolean } | null;
  categories: CatalogCategory[];
  products: CatalogProduct[];
}
export type CatalogDecision = { mode: "fallback" } | { mode: "catalog"; catalog: GlobalCatalogResponse };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isIdList = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === "number");

export function catalogDecision(resp: unknown, wantLocation: boolean): CatalogDecision {
  if (!isObj(resp) || !Array.isArray(resp.products) || !Array.isArray(resp.categories) || !isIdList(resp.featured_ids)) return { mode: "fallback" };
  const r = resp as unknown as GlobalCatalogResponse;
  if (wantLocation) {
    if (!isObj(r.location)) return { mode: "fallback" };
    if (r.location.found !== true) return { mode: "catalog", catalog: { ...r, featured_ids: [], products: [], categories: r.categories.map((c) => ({ ...c, product_ids: [] })) } };
  }
  const products = r.products.filter(
    (p): p is CatalogProduct => isObj(p) && typeof p.id === "number" && typeof p.slug === "string" && Array.isArray(p.product_category_slugs)
  );
  const ids = new Set(products.map((p) => p.id));
  const categories = r.categories
    .filter((c) => isObj(c) && typeof c.slug === "string" && isIdList(c.product_ids))
    .map((c) => ({ ...c, product_ids: c.product_ids.filter((id) => ids.has(id)) }));
  return { mode: "catalog", catalog: { ...r, products, categories, featured_ids: r.featured_ids.filter((id) => ids.has(id)) } };
}

export interface LocationPlan<P> {
  /** Vitrin (öne çıkan) ∩ bu lokasyon, vitrin sırasıyla + hiçbir çevrili kategoriye bağlı olmayan ürünler. */
  featured: P[];
  /** Kategori kartları (API sırası): bu lokasyonda en az 1 ürünü olanlar. */
  tiles: { slug: string; name: string; count: number; image: string | null }[];
  /** Kalan her ürün TAM BİR KEZ, bir kategori rafında; raf içi sıra = kategorinin admin sırası. */
  shelves: { slug: string; name: string; products: P[] }[];
}

/**
 * Lokasyon sayfası planı — teslim edilebilir katalogun TAMAMI görünür, hiçbir ürün iki kez basılmaz.
 * Raf sırası: dar kategoriden geniş kategoriye (ürün sayısı artan, eşitlikte id) → çok kategorili ürün
 * en özgül rafına düşer; her rafın içinde kategorinin merchandising sırası korunur.
 */
export function planLocationPage<P extends { id: number }>(c: { featured_ids: number[]; categories: CatalogCategory[]; products: P[] }): LocationPlan<P> {
  const byId = new Map(c.products.map((p) => [p.id, p]));
  const used = new Set<number>();
  const featured: P[] = [];
  for (const id of c.featured_ids) { const p = byId.get(id); if (p && !used.has(id)) { featured.push(p); used.add(id); } }
  const tiles = c.categories.filter((x) => x.product_ids.length > 0).map((x) => ({ slug: x.slug, name: x.name, count: x.product_ids.length, image: x.image }));
  const shelves: LocationPlan<P>["shelves"] = [];
  const order = [...c.categories].sort((a, b) => a.product_ids.length - b.product_ids.length || a.id - b.id);
  for (const cat of order) {
    const products = cat.product_ids.filter((id) => !used.has(id)).map((id) => byId.get(id)).filter((p): p is P => !!p);
    if (!products.length) continue;
    for (const p of products) used.add(p.id);
    shelves.push({ slug: cat.slug, name: cat.name, products });
  }
  // Çevrili kategorisi olmayan canlı ürün de kaybolmasın: öne çıkanların sonuna.
  for (const p of c.products) if (!used.has(p.id)) { featured.push(p); used.add(p.id); }
  return { featured, tiles, shelves };
}

/** Lokasyon planını tek listeye düzler (kargo şehri ızgarası): öne çıkanlar → raflar. */
export function flattenPlan<P>(plan: LocationPlan<P>): P[] {
  return [...plan.featured, ...plan.shelves.flatMap((s) => s.products)];
}

/**
 * V80 ana sayfa: vitrin ürünlerinin çip/sekme filtresi GERÇEK kategori bağına geçer
 * (kategori kartı sayıları/görselleri API'den zaten katalog ∩ gerçek bağdır).
 * API alanı yoksa (eski uç) null → çağıran hiçbir şeyi değiştirmez.
 */
export function applyRealCategorySlugs<P extends { category_slugs: string[]; product_category_slugs?: string[] }>(products: readonly P[]): P[] | null {
  if (!products.every((p) => Array.isArray(p.product_category_slugs))) return null;
  return products.map((p) => ({ ...p, category_slugs: [...(p.product_category_slugs as string[])] }));
}

/** Kategori yüzeyi satırında kart alanları var mı (yeni API) — yoksa sayfa eski detay yoluna düşer. */
export function hasCardFields(rows: readonly unknown[]): boolean {
  return rows.every((r) => isObj(r) && typeof r.id === "number" && "image" in r && "delivery_model_code" in r);
}
