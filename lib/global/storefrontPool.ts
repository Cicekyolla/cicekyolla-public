// ============================================================================
// GLOBAL VİTRİN SEÇİM HAVUZU — saf modül (ağ yok; node --test ile test edilir).
//
// Kaynak: API GET /api/public/global/storefront/products?locale=[&city&district&neighborhood]
//   = APPROVED vitrinde elle seçili ürünler ∩ o dilde canlı ∩ aktif
//     [∩ lokasyon teslimat uygunluğu: Delivery Engine modeli + Coverage Engine kuralları].
// Her satır ürünün GERÇEK Product Center kategori bağını taşır (product_category_slugs,
// o dilin approved kategori slug'ları). Yeni katalog/tablo YOK; tek ürün id'si 13 dilde.
//
// KARAR (poolDecision):
//   • yanıt yok (ağ/HTTP hatası, uç henüz yayında değil) → "fallback": yüzey bugünkü
//     davranışında kalır — ürünler ne topluca gizlenir ne topluca açılır.
//   • selection = "none" (vitrin kaydı yok, taslak, otomatik mod) → "fallback".
//   • lokasyon istendi ve çözülemedi → boş havuz (teslimat gerçeği bilinmiyor → fail closed).
//   • aksi hâlde → "pool": yüzey yalnız havuzdaki ürünleri gösterir (seçim sırasıyla).
// Vitrin seçimi bir İZİN değildir: geçersiz/dilde yayımsız/teslim edilemeyen ürün API'de elenir.
// ============================================================================

export interface PoolProduct {
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
  /** Global üyelik (076) slug'ları — bu zincirde KULLANILMAZ, geriye uyum için durur. */
  category_slugs: string[];
  /** Product Center gerçek kategori bağı (o dilde approved+slug kategoriler). */
  product_category_slugs: string[];
  product_type?: string | null;
  delivery_scope?: string | null;
}

export interface StorefrontPoolResponse {
  selection: "manual" | "none";
  ids: number[];
  location: { city: string; district: string | null; neighborhood: string | null; found: boolean; same_day: boolean } | null;
  products: PoolProduct[];
}

export type PoolDecision = { mode: "fallback" } | { mode: "pool"; products: PoolProduct[] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Yanıt → yüzey kararı (bkz. dosya başı). `wantLocation`: sayfa lokasyon bağlamıyla mı sordu. */
export function poolDecision(resp: unknown, wantLocation: boolean): PoolDecision {
  if (!isObj(resp) || !Array.isArray(resp.products)) return { mode: "fallback" };
  if (resp.selection !== "manual") return { mode: "fallback" };
  if (wantLocation) {
    // Uç lokasyonu değerlendirmediyse (sözleşme dışı yanıt) teslimat kararı yoktur → bugünkü davranış.
    if (!isObj(resp.location)) return { mode: "fallback" };
    if (resp.location.found !== true) return { mode: "pool", products: [] };
  }
  const products = (resp.products as unknown[]).filter(
    (p): p is PoolProduct => isObj(p) && typeof p.id === "number" && typeof p.slug === "string" && Array.isArray(p.product_category_slugs)
  );
  return { mode: "pool", products };
}

/** Kategori yüzeyi: yalnız gerçek kategori bağı eşleşen havuz ürünleri (seçim sırası korunur). */
export function poolForCategory<P extends { product_category_slugs: string[] }>(products: readonly P[], categorySlug: string): P[] {
  return products.filter((p) => p.product_category_slugs.includes(categorySlug));
}

export function effectivePriceMinor(p: { price_minor: number; sale_price_minor: number | null }): number {
  const price = Number(p.price_minor);
  const sale = p.sale_price_minor == null ? null : Number(p.sale_price_minor);
  return sale != null && sale > 0 && sale < price ? sale : price;
}

export interface PoolCategoryStat<P> { slug: string; count: number; minPriceMinor: number | null; first: P }

/** Kategori başına havuz sayısı / en düşük fiyat / ilk ürün (kapak) — çoklu bağ her kategoride sayılır. */
export function poolCategoryStats<P extends { product_category_slugs: string[]; price_minor: number; sale_price_minor: number | null }>(
  products: readonly P[]
): Map<string, PoolCategoryStat<P>> {
  const out = new Map<string, PoolCategoryStat<P>>();
  for (const p of products) {
    const price = effectivePriceMinor(p);
    for (const slug of new Set(p.product_category_slugs)) {
      const s = out.get(slug);
      if (!s) out.set(slug, { slug, count: 1, minPriceMinor: price, first: p });
      else {
        s.count += 1;
        s.minPriceMinor = s.minPriceMinor == null ? price : Math.min(s.minPriceMinor, price);
      }
    }
  }
  return out;
}

/**
 * Lokasyon sayfası vitrin planı (havuz modu). Teslim edilebilir seçili ürünlerin TAMAMI
 * seçim sırasıyla basılır (havuz API'de en çok 96) — "uygun ürün lokasyonda görünür" kuralı
 * sabit 8'lik pencereye takılmaz. Kategori kartları bu lokasyondaki gerçek kategori sayılarıyla;
 * aynı kartları tekrar basan kategori rafları havuz modunda yoktur.
 */
export interface LocationShelfPlan<P> {
  tiles: { slug: string; name: string; count: number; cover: P }[];
  products: P[];
}
export function planLocationSections<P extends { product_category_slugs: string[]; price_minor: number; sale_price_minor: number | null }>(
  categories: readonly { slug: string; name: string }[],
  products: readonly P[]
): LocationShelfPlan<P> {
  const stats = poolCategoryStats(products);
  const tiles = categories
    .map((c) => {
      const s = stats.get(c.slug);
      return s ? { slug: c.slug, name: c.name, count: s.count, cover: s.first } : null;
    })
    .filter((x): x is { slug: string; name: string; count: number; cover: P } => !!x);
  return { tiles, products: [...products] };
}

/**
 * V80 ana sayfa (elle seçim): ürün çip/sekme filtresi gerçek kategori bağına geçer ve kategori
 * kartlarının sayı/en düşük fiyat/kapak değerleri seçili havuzdan hesaplanır — ana sayfada
 * "Roses" sekmesi ile /xx/category/roses aynı ürün kümesini gösterir.
 * API alanı yoksa (eski uç) null → çağıran hiçbir şeyi değiştirmez.
 */
export function applyPoolToStorefront<
  P extends { category_slugs: string[]; product_category_slugs?: string[]; price_minor: number; sale_price_minor: number | null; image: string | null; blurhash?: string | null; derivatives?: unknown },
  C extends { slug: string; live_products: number; min_price_minor: number | null; image: string | null; blurhash?: string | null; derivatives?: unknown },
>(products: readonly P[], categories: readonly C[]): { products: P[]; categories: C[] } | null {
  if (!products.every((p) => Array.isArray(p.product_category_slugs))) return null;
  const real = products.map((p) => ({ ...p, category_slugs: [...(p.product_category_slugs as string[])] }));
  const stats = poolCategoryStats(real.map((p) => ({ ...p, product_category_slugs: p.category_slugs })));
  const cats = categories.map((c) => {
    const s = stats.get(c.slug);
    if (!s) return { ...c, live_products: 0 };
    const cover = s.first;
    return {
      ...c,
      live_products: s.count,
      min_price_minor: s.minPriceMinor,
      image: cover.image ?? c.image,
      blurhash: cover.image ? cover.blurhash ?? null : c.blurhash,
      derivatives: cover.image ? cover.derivatives ?? null : c.derivatives,
    };
  });
  return { products: real, categories: cats };
}
