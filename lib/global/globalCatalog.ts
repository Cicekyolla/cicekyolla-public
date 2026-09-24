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
  /** YALNIZ Category Center asset'i (ürün görseli kategori kapağı yapılmaz). */
  image_source: "category" | null;
  product_ids: number[];
}
export interface GlobalCatalogResponse {
  locale: string;
  total: number;
  selection: "manual" | "none";
  featured_ids: number[];
  location: {
    city: string; district: string | null; neighborhood: string | null; found: boolean;
    /** true = aynı gün sunulur; false = yalnız kargo; null = belirsiz/sınır (vaat yok, katalog açık). Eski API: boolean. */
    same_day: boolean | null;
    /** ADDITIVE (API 24 Eyl 2026): aynı gün kararının kaynağı — 'city_rule' | 'engine' | 'engine_unresolved'; eski API'de yok. */
    same_day_source?: string;
    /** ADDITIVE: 'in' | 'out' | 'mixed' | 'unknown' — motorun üç durumlu erişim kararı; eski API'de yok. */
    reach?: string;
    /** ADDITIVE: motor bandı adı (İstanbul ilçesi motorla çözüldüyse); yoksa null/yok. */
    band?: string | null;
  } | null;
  categories: CatalogCategory[];
  products: CatalogProduct[];
  /**
   * Additive (Global master faz): onaylı storefront belgesindeki structure.locationSections HAM dizisi
   * (lokasyon sayfası bölüm sırası). Eski API'de yok → public varsayılan sıraya düşer
   * (ayrıştırma lib/global/locationSections.ts parseLocationSections).
   */
  location_sections?: unknown[] | null;
}
export type CatalogDecision = { mode: "fallback" } | { mode: "catalog"; catalog: GlobalCatalogResponse };

/**
 * TESLİMAT GERÇEĞİ (24 Eyl 2026): Delivery Motor bu lokasyon için "aynı gün YOK" dediyse
 * (lokasyon çözüldü, same_day=false) sayfa KARGO sunumuna geçer — İstanbul'un kurye bandı
 * dışındaki ilçeleri (Silivri, Şile, Çatalca …) dahil. Fallback / lokasyon yok / çözülemedi →
 * false (bugünkü davranış: şehir kuralı karar verir).
 */
export function engineSaysCargo(source: CatalogDecision | null | undefined): boolean {
  if (!source || source.mode !== "catalog") return false;
  const loc = source.catalog.location;
  return !!loc && loc.found === true && loc.same_day === false;
}

/**
 * ÜÇ DURUMLU SUNUM (operatör geri bildirimi, 24 Eyl 2026):
 *  "same_day" → bugünkü İstanbul sunumu
 *  "cargo"    → kargo sunumu (şehir kuralı: Antalya/Muğla/İzmir; motor: reach 'out' / same_day=false)
 *  "neutral"  → motor 'mixed' (ilçe merkezi band kenarına yakın) ya da 'unknown' (çözülemedi):
 *               aynı gün VAADİ YOK, katalog KAPANMAZ, "adres için ödemede doğrulanır" dili.
 * Motor sessizse (fallback / eski API alanı yok) şehir kuralı geçerlidir — bugünkü davranış.
 */
export type DeliveryPresentation = "same_day" | "cargo" | "neutral";
export function deliveryPresentation(source: CatalogDecision | null | undefined, cityIsSameDay: boolean): DeliveryPresentation {
  if (!cityIsSameDay) return "cargo";
  if (!source || source.mode !== "catalog") return "same_day";
  const loc = source.catalog.location;
  if (!loc || loc.found !== true) return "same_day";
  if (loc.same_day === false) return "cargo";
  if (loc.same_day === null || loc.reach === "mixed" || loc.reach === "unknown") return "neutral";
  return "same_day";
}

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
  /** Kategori kartları (API sırası): bu lokasyonda en az 1 ürünü olanlar; sayı = kategorinin tam listesi. */
  tiles: { slug: string; name: string; count: number; image: string | null }[];
  /** "Tümü": teslim edilebilir katalogun tamamı, her ürün TAM BİR KEZ — önce vitrin öne çıkanları (vitrin sırası), sonra katalog sırası. */
  allOrder: number[];
  /** Kategori listeleri: GERÇEK bağ, Global Merkezi sırası; çok kategorili ürün bağlı olduğu HER listede. */
  categories: { slug: string; name: string; ids: number[] }[];
  /** id → ürün (yalnız bu lokasyonda teslim edilebilir olanlar). */
  byId: Map<number, P>;
}

/** Lokasyon sayfası planı — kategori kimliği korunur (tekilleştirme yalnız "Tümü" listesinde). */
export function planLocationPage<P extends { id: number }>(c: { featured_ids: number[]; categories: CatalogCategory[]; products: P[] }): LocationPlan<P> {
  const byId = new Map(c.products.map((p) => [p.id, p]));
  const seen = new Set<number>();
  const allOrder: number[] = [];
  for (const id of [...c.featured_ids, ...c.products.map((p) => p.id)]) if (byId.has(id) && !seen.has(id)) { seen.add(id); allOrder.push(id); }
  const categories = c.categories.map((x) => ({ slug: x.slug, name: x.name, ids: x.product_ids.filter((id) => byId.has(id)) }));
  const tiles = c.categories
    .map((x, i) => ({ slug: x.slug, name: x.name, count: categories[i].ids.length, image: x.image }))
    .filter((t) => t.count > 0);
  return { tiles, allOrder, categories, byId };
}

/** "Tümü" listesinin ürünleri (kargo şehri ızgarası vb.). */
export function flattenPlan<P>(plan: LocationPlan<P>): P[] {
  return plan.allOrder.map((id) => plan.byId.get(id)).filter((p): p is P => p !== undefined);
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

/**
 * YEDEK YOL (katalog/vitrin ucu yok ya da hata): kategori kartları API'nin locale kataloğundan.
 * Görsel YALNIZ kategorinin kendi görseli (API: Category Center kapağı); yoksa null —
 * kategorinin ilk ürününün fotoğrafı kapak YAPILMAZ. Ürünsüz kategori kartı yok.
 */
export function fallbackCategoryCards<C extends { slug: string; name: string; image?: string | null; live_products?: number }>(
  categories: readonly C[],
): { slug: string; name: string; count: number; image: string | null }[] {
  return categories
    .filter((c) => (c.live_products ?? 0) > 0)
    .map((c) => ({ slug: c.slug, name: c.name, count: c.live_products ?? 0, image: c.image ?? null }));
}

/** Kategori yüzeyi satırında kart alanları var mı (yeni API) — yoksa sayfa eski detay yoluna düşer. */
export function hasCardFields(rows: readonly unknown[]): boolean {
  return rows.every((r) => isObj(r) && typeof r.id === "number" && "image" in r && "delivery_model_code" in r);
}
