// ---------------------------------------------------------------------------
// CICEKYOLLA PUBLIC — API katmanı
// Mevcut backend public endpoint'ini tüketir. Backend DEĞİŞMEZ.
// Şema, canlı endpoint çıktısına birebir uyumludur:
// GET /api/public/seo/page?path=/istanbul/besiktas/akat-mah
// { data: { url_path, page_type, lang, index_state, canonical_url,
//   title_tag, meta_description, h1, intro_html, body_blocks[], faq[], schema_jsonld } }
// ---------------------------------------------------------------------------

import { mediaUrl, mediaUrlOrNull, mediaDerivatives } from "./media";
import { formatMoney } from "./currency/format";
import { categoryTreeAttempts, fetchTreeViaAttempts, fetchCategoryRowById } from "./categoryTreeFetch";

// Backend origin (Render). Env ile override edilebilir.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

// Sunucu-tarafı okuma auth'u. Backend production'da authenticate + requireRole('viewer')
// istiyor → token'sız 401 → kategori/ürün ağacı boş kalır. Token SUNUCU-ONLY env'de
// tutulur (NEXT_PUBLIC değil → tarayıcıya sızmaz; tüm fetch'ler Server Component'te).
// API_READ_TOKEN set edilmezse header gönderilmez (auth kapalıysa yine çalışır).
function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = process.env.API_READ_TOKEN;
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
    h["x-user-role"] = "viewer";
  }
  return h;
}

// Body bloğu — şu an yalnız "paragraph" tipi geliyor; ileride additive genişler.
export interface BodyBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

// FAQ öğesi — şu an boş dizi ([]); M9.6'da dolacak. Şimdiden hazır.
export interface FaqItem {
  q?: string;
  a?: string;
  [key: string]: unknown;
}

// Public SEO sayfası DTO — endpoint'in döndürdüğü "data" objesi.
export interface SeoPublicPage {
  url_path: string;
  page_type: string;
  lang: string;
  index_state: string; // "index" | "noindex"
  canonical_url: string; // path döner (ör. "/istanbul/kadikoy") — domain YOK
  title_tag: string;
  meta_description: string;
  h1: string;
  intro_html: string | null;
  body_blocks: BodyBlock[];
  faq: FaqItem[];
  schema_jsonld: Record<string, unknown>;
  // ADDITIVE (Lokasyon SEO Merkezi): güncel içerik versiyonunun köken kaynağı.
  // Operatör-onaylı içeriği (bkz. lib/managedSeoContent.ts) konum şablonunun
  // önüne almak için kullanılır. Eski API alanı göndermezse undefined kalır
  // ve davranış öncekiyle birebir aynıdır.
  content_source?: string | null;
}

// Tek sayfa çeker. published değilse backend not_found döndürür → null.
export async function fetchSeoPage(
  path: string
): Promise<SeoPublicPage | null> {
  const url = `${API_ORIGIN}/api/public/seo/page?path=${encodeURIComponent(
    path
  )}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: apiHeaders(),
      // ISR: sayfayı belirli aralıkla yeniden üret (public site tazeliği).
      next: { revalidate: 300 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  // Zarf: { data: {...} } — not_found ise { error: "not_found" }.
  const data = (json as { data?: SeoPublicPage } | null)?.data;
  if (!data || typeof data.url_path !== "string") return null;

  return data;
}

// ---------------------------------------------------------------------------
// PUBLIC HTML SITE MAP — yalnız yayındaki gerçek SEO envanteri.
// ---------------------------------------------------------------------------
export type SeoInventoryPageType =
  | "city" | "district" | "neighborhood" | "category" | "product"
  | "category_location" | "product_location" | "special_day" | "brand" | "delivery_info";

export interface SeoInventoryItem {
  page_type: SeoInventoryPageType;
  url_path: string;
  index_state: "index" | "noindex";
  updated_at: string;
  title: string | null;
}

// ADDITIVE — lokasyon şablonu çapraz bağlantı bloğu (HATA 3): sabit 5 linkli
// blok yerine, bir ilin GERÇEK ilçe envanterinden türetilen isim/slug listesi.
// Yeni bir uç İCAT EDİLMEDİ — mevcut fetchSeoInventory()'nin filtrelenmiş hali.
export interface CityDistrictSummary { slug: string; name: string }

/** SEO envanterindeki başlık kalıplarından ("{Ad} Çiçek Gönder",
 * "{Ad} Çiçekçi ve Çiçek Siparişi", "{Ad} Çiçekçi — {Ad} Çiçek Siparişi | ÇiçekYolla")
 * gerçek (Türkçe karakterli) yer adını çıkarır. Slug'lar diyakritik taşımadığı
 * için ad KESİNLİKLE başlıktan türetilmeli — slug'tan tahmin edilmez. */
function placeNameFromTitle(title: string | null, fallbackSlug: string): string {
  if (!title) return fallbackSlug;
  const cleaned = title
    .split(" | ")[0]
    .split(" — ")[0]
    .replace(/\s+Mahallesi\s+Çiçek\s+Gönder\s*$/i, "")
    .replace(/\s+Çiçek\s+Gönder\s*$/i, "")
    .replace(/\s+Çiçekçi\s+ve\s+Çiçek\s+Siparişi\s*$/i, "")
    .replace(/\s+Çiçek\s+Siparişi\s*$/i, "")
    .replace(/\s+Çiçekçi\s*$/i, "")
    .trim();
  return cleaned || fallbackSlug;
}

/** Bir ilin (citySlug) TÜM ilçelerini gerçek SEO envanterinden döner —
 * hardcoded liste YOK, veri büyüdükçe/değiştikçe otomatik güncel kalır. */
export async function fetchCityDistricts(citySlug: string): Promise<CityDistrictSummary[]> {
  const inventory = await fetchSeoInventory();
  const prefix = `/${citySlug}/`;
  const seen = new Set<string>();
  const out: CityDistrictSummary[] = [];
  for (const item of inventory) {
    if (item.page_type !== "district" || item.index_state !== "index") continue;
    if (!item.url_path.startsWith(prefix)) continue;
    const rest = item.url_path.slice(prefix.length);
    if (rest.includes("/") || rest.length === 0) continue; // yalnız il/ilçe derinliği
    if (seen.has(rest)) continue;
    seen.add(rest);
    out.push({ slug: rest, name: placeNameFromTitle(item.title, rest) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

// ADDITIVE (SITEMAP): mahalle sitemap shard kaynağı.
// /api/public/seo/inventory, 70 bin mahalle yayına açıldıktan sonra ~10,8 MB'a
// çıktı. Sitemap'in ihtiyacı olan veri bunun küçük bir dilimi; bu uç yalnız
// published+index mahalle URL'lerini sayfalı ve kompakt ([url, lastmod]) döner.
// fetchSeoInventory() DEĞİŞMEDİ — diğer sitemap tipleri aynı yolu kullanır.
export interface NeighborhoodUrlPage {
  total: number;
  items: Array<[string, string]>;
}

export async function fetchNeighborhoodUrlPage(
  limit: number,
  offset: number,
): Promise<NeighborhoodUrlPage> {
  const url = `${API_ORIGIN}/api/public/seo/neighborhood-urls?limit=${limit}&offset=${offset}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return { total: 0, items: [] };
    const json = (await res.json()) as { data?: NeighborhoodUrlPage };
    const data = json?.data;
    return {
      total: Number(data?.total) || 0,
      items: Array.isArray(data?.items) ? data.items : [],
    };
  } catch {
    return { total: 0, items: [] };
  }
}

export async function fetchSeoInventory(): Promise<SeoInventoryItem[]> {
  const url = `${API_ORIGIN}/api/public/seo/inventory`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json() as { data?: SeoInventoryItem[] };
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// DELIVERY ZONES — canlı teslimat bölgeleri (ADDITIVE).
// Admin Delivery Motor'daki aktif bölgeler; anasayfa "Teslimat Bölgeleri"
// bölümü ve /{il}/{ilçe} SEO landing'leri tüketir. Auth GEREKMEZ (public uç).
// ---------------------------------------------------------------------------
export interface DeliveryZoneDistrict {
  name: string;
  slug: string;
  same_day: boolean;
}
export interface DeliveryZoneCity {
  city: string;
  city_slug: string;
  same_day: boolean;
  districts: DeliveryZoneDistrict[];
}

export async function fetchDeliveryZones(): Promise<DeliveryZoneCity[]> {
  const url = `${API_ORIGIN}/api/public/delivery/zones`;
  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 300 } });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }
  const data = (json as { data?: DeliveryZoneCity[] } | null)?.data;
  return Array.isArray(data) ? data : [];
}

// ---------------------------------------------------------------------------
// CATEGORY TREE — canlı Category Center okuması
// ---------------------------------------------------------------------------
// MEVCUT okuma mekanizmasının BİREBİR aynısını kullanır (aynı API_ORIGIN, aynı
// { data } zarfı, aynı revalidate). YENİ endpoint ÜRETİLMEZ; admin panelin
// okuduğu canlı yol tüketilir. Okuma yolu env ile verilir (tıpkı API_ORIGIN
// gibi) → kod değişmeden canlıya bağlanır, kategori verisi frontend'de TUTULMAZ.
//
// Kurulum: Vercel env → NEXT_PUBLIC_CATEGORIES_PATH = <admin'in kategori okuma path'i>
//   (ör. admin Network sekmesinde 266 kategoriyi döndüren istek yolu).
// Env set edilmezse fetchCategoryTree() null döner → çağıranlar mevcut
// davranışa güvenle geri düşer (production bozulmaz).

// Kategori ağacı TEK KAYNAK: backend public REST → GET /api/categories (nested tree).
// Env-gate KALDIRILDI — bu uç kesin mevcut (server.ts: app.use('/api/categories',
// publicCategoriesRouter)). Env yalnız override için; varsayılan gerçek uçtur.
// Böylece public ağaç HER ZAMAN admin Category Center ile aynı kaynaktan beslenir.
const CATEGORIES_PATH = process.env.NEXT_PUBLIC_CATEGORIES_PATH ?? "/api/categories";

// Category Center düğümü — ekranda DOĞRULANMIŞ alanlar (name, slug) zorunlu;
// hiyerarşi/SEO/görsel/durum alanları opsiyonel ve şemaya göre esnektir.
// Backend kategori ağacını DEĞİŞTİRMEZ; yalnızca olduğu gibi okur.
export interface CategoryNode {
  name: string;
  slug: string;
  parent_slug?: string | null;
  children?: CategoryNode[];
  status?: string;
  [key: string]: unknown;
}

// TEK KAYNAK kategori görünürlük kuralı. Status enum: draft|active|passive|archived.
// İş kararı: müşteriye 'passive' ve 'archived' GİZLENİR; 'draft' (Taslak) ve 'active'
// GÖRÜNÜR. Sebep: mevcut katalogun tamamı Taslak durumunda ve yayında olması isteniyor.
// (Kesin active-only istenirse tek satır: `s === "active"`.)
export function isCategoryVisible(node: { status?: unknown }): boolean {
  const s = typeof node?.status === "string" ? node.status.toLowerCase() : "";
  return s !== "passive" && s !== "archived";
}

// Canlı kategori ağacını çeker. Env path yoksa veya backend not_found/hata
// dönerse null → çağıran taraf mevcut kaynağa güvenle geri düşer.
// MALİYET KAÇAĞI #1 (2 Eyl 2026): tam ağaç ~3,46 MB (telde ~855 KB). Vercel Data
// Cache 2 MB üstünü SAKLAMAZ → `revalidate: 300` etkisizdi; her sayfa üretimi
// Render'dan tam ağacı çekiyordu (12 saatte 62 bin çağrı, önbellek 0). Çözüm
// ADDITIVE: önce HAFİF uç (/api/categories/public-tree — aynı ağaç, aynı sıra,
// yalnız vitrinin okuduğu alanlar; ~66 KB → Data Cache'e girer). API eski
// sürümdeyse (404) ya da kesintide mevcut tam ağaca düşülür → deploy sırasından
// bağımsız, bugünkü davranış korunur. Kategori sayfasının SEO fallback'i
// (description/faq_json/seo_*) tek kayıt için fetchCategoryById ile okunur.
export async function fetchCategoryTree(): Promise<CategoryNode[] | null> {
  // Deneme sırası ve dayanıklılık kuralı lib/categoryTreeFetch.ts'te (saf, testli):
  // hafif uç (revalidate 300) → tam ağaç (revalidate 300) → tam ağaç no-store.
  return fetchTreeViaAttempts<CategoryNode>(categoryTreeAttempts(API_ORIGIN, CATEGORIES_PATH, apiHeaders()));
}

/**
 * Tek kategori kaydı (GET /api/categories/:id — mevcut sözleşme, ENRICHED alanlar:
 * description, faq_json, seo_title, seo_description, h1_title, is_indexable …).
 * Yalnız kategori sayfasının SEO fallback'i için, gerektiğinde çağrılır.
 * Zarf esnek ({ data } ya da düz nesne); 404/hata → null, fırlatmaz.
 */
export async function fetchCategoryById(id: number): Promise<Record<string, unknown> | null> {
  return fetchCategoryRowById(API_ORIGIN, CATEGORIES_PATH, apiHeaders(), id);
}

// ---------------------------------------------------------------------------
// ÜRÜN (Product) — ADDITIVE. Admin Ürün Merkezi → API → DB → BURASI → müşteri.
// Backend: GET /api/products/slug/:slug → düz nesne {product, seo, categories,
// images, variants} (envelope YOK, 404 → not found). Sözleşme DEĞİŞMEZ.
// Yalnız 'active' ürün public'te gösterilir (çağıran tarafta gate edilir).
// ---------------------------------------------------------------------------

export interface PublicProductCore {
  id: number; name: string; slug: string;
  short_description: string | null; long_description: string | null;
  sku: string | null; barcode: string | null;
  price_minor: string | number; sale_price_minor: string | number | null; currency: string;
  stock_quantity: number; status: string; product_type: string;
  same_day_available: boolean; delivery_scope: string;
  /** Teslimat profili kodu (backend delivery_model_code); profil yoksa null = kargoya KAPALI. */
  delivery_model_code?: string | null;
  height_cm: number | null; width_cm: number | null;
  is_featured: boolean; is_bestseller: boolean; is_new: boolean;
}
export interface PublicProductSeo {
  meta_title: string | null; meta_description: string | null; canonical_url: string | null;
  og_title: string | null; og_description: string | null; og_image: string | null;
}
export interface MediaDerivatives { webp?: string; avif?: string; responsive?: Record<string, string> }
export interface PublicProductImage { id: number; url: string; alt: string | null; role: string; sort_order: number; blurhash?: string | null; derivatives?: MediaDerivatives | null; }
export interface PublicProductVariant {
  id: number; title: string; sku: string | null;
  price_minor: string | number | null; sale_price_minor: string | number | null;
  stock_quantity: number; status: string;
}
export interface PublicProductCategory { category_id: number; is_primary: boolean; }
export interface PublicProductDetail {
  product: PublicProductCore;
  seo: PublicProductSeo | null;
  categories: PublicProductCategory[];
  images: PublicProductImage[];
  variants: PublicProductVariant[];
}

export interface PublicProductSeoContent {
  faq_json?: Array<{ q?: string | null; a?: string | null }> | null;
}

/** Tek ürünü slug ile çeker. 404/hata veya 'active' değilse null (public gizler). */
export async function fetchProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const url = `${API_ORIGIN}/api/products/slug/${encodeURIComponent(slug)}`;
  const attempts = [
    { headers: apiHeaders(), next: { revalidate: 120 } },
    { headers: apiHeaders(), cache: "no-store" as const },
  ];
  for (const init of attempts) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) continue;
      const data = (await res.json()) as PublicProductDetail;
      if (!data?.product || data.product.status !== "active") return null;
      // TEK FİYAT KURALI: müşteriye yalnız SATIN ALINABİLİR (status="active") varyantlar
      // gösterilir — sipariş motoru (ordersRepository.create) da yalnız aktif varyantı
      // fiyatlar. Taslak varyantlar (AI "Taslak Hazırla" ×1/1,25/1,5) PDP'ye sızmaz;
      // aksi hâlde ₺1 placeholder varsayılan seçim oluyor ve checkout 409 alıyordu.
      if (Array.isArray(data.variants)) data.variants = data.variants.filter((v) => v.status === "active");
      if (Array.isArray(data.images)) {
        data.images = data.images.map((im) => ({ ...im, url: mediaUrl(im.url), derivatives: mediaDerivatives(im.derivatives) }));
      }
      return data;
    } catch {
      // Render'ın geçici 502/cold-start hatasında no-store tekrarını dene.
    }
  }
  return null;
}

/** Ürün SEO sekmesinde kaydedilmiş müşteri-facing SSS içeriği. */
export async function fetchProductSeoById(id: string | number): Promise<PublicProductSeoContent | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/products/${encodeURIComponent(String(id))}/seo`, {
      headers: apiHeaders(),
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicProductSeoContent;
  } catch {
    return null;
  }
}

/** minor (kuruş) → "₺1.240" biçimi (TR).
 *  Tek biçimlendiriciye devreder; ÇIKTI BİREBİR AYNIDIR (TRY regresyonu yok).
 *  Para birimine DUYARSIZDIR — sunucuda / TRY bağlamında kullanılır. Seçili para
 *  biriminde göstermek için `<Price minor={...} />` ya da `useCurrency().money`. */
export function formatMinorTRY(v: string | number | null | undefined): string {
  return formatMoney(v, "TRY", "tr-TR");
}

// ---------------------------------------------------------------------------
// ÜRÜN LİSTESİ — ADDITIVE. Homepage rail'leri + kategori grid'i gerçek katalogdan.
// Backend: GET /api/products?status=active&is_bestseller=true&page_size=8
//   → { data: ProductListItem[], pagination }. cover_image_url + flags döner.
// Admin Ürün Merkezi'ndeki is_bestseller/is_featured/is_new toggle'ları BURAYI besler.
// Mock/hardcode YOK — kayıt yoksa boş dizi (çağıran bölümü gizler).
// ---------------------------------------------------------------------------

export interface PublicProductListItem {
  id: number; name: string; slug: string;
  price_minor: string | number; sale_price_minor: string | number | null;
  currency: string; status: string; product_type: string;
  is_featured: boolean; is_bestseller: boolean; is_new: boolean;
  stock_quantity: number; cover_image_url: string | null; primary_category_id: number | null;
  same_day_available?: boolean; delivery_scope?: string;
  /** Teslimat profili kodu (backend delivery_model_code); yok/null = kargoya KAPALI. */
  delivery_model_code?: string | null;
  cover_blurhash?: string | null; cover_derivatives?: MediaDerivatives | null;
}
export interface PublicProductListParams {
  is_bestseller?: boolean; is_featured?: boolean; is_new?: boolean;
  category_id?: number; page_size?: number;
  q?: string; // metin arama (backend /api/products?q= destekler)
  product_type?: string; // flower|plant|wreath|artificial|gift|service
  same_day_available?: boolean;
  delivery_scope?: "istanbul" | "turkiye" | "regional";
  /** TEK OTORİTE: teslimat profili (product_delivery_profiles). cargo_capable = cargo ∪ same_day_and_cargo. */
  delivery_model?: "same_day_courier" | "cargo" | "same_day_and_cargo" | "cargo_capable";
  /** true → veri önbelleği atlanır (Kargo Merkezi kararı anında yansısın: kargo kategorisi / alternatif listesi). */
  fresh?: boolean;
  sort?: "created_at_desc" | "price_asc" | "price_desc" | "name_asc";
}

export async function fetchProducts(params: PublicProductListParams = {}): Promise<PublicProductListItem[]> {
  return (await fetchProductsPaged(params)).items;
}

export interface ProductPage {
  items: PublicProductListItem[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
}

/** Sayfalı ürün listesi (kategori grid'i sıralama + sayfalama için). */
export async function fetchProductsPaged(params: PublicProductListParams & { page?: number } = {}): Promise<ProductPage> {
  const empty: ProductPage = { items: [], pagination: { page: 1, page_size: params.page_size ?? 8, total: 0, total_pages: 1 } };
  const q = new URLSearchParams();
  q.set("status", "active");
  q.set("page_size", String(params.page_size ?? 8));
  if (params.page && params.page > 1) q.set("page", String(params.page));
  if (params.is_bestseller) q.set("is_bestseller", "true");
  if (params.is_featured) q.set("is_featured", "true");
  if (params.is_new) q.set("is_new", "true");
  if (params.category_id) q.set("category_id", String(params.category_id));
  if (params.q && params.q.trim()) q.set("q", params.q.trim());
  if (params.product_type) q.set("product_type", params.product_type);
  if (params.same_day_available) q.set("same_day_available", "true");
  if (params.delivery_scope) q.set("delivery_scope", params.delivery_scope);
  if (params.delivery_model) q.set("delivery_model", params.delivery_model);
  if (params.sort) q.set("sort", params.sort);
  const url = `${API_ORIGIN}/api/products?${q.toString()}`;
  const attempts = params.fresh
    ? [{ headers: apiHeaders(), cache: "no-store" as const }]
    : [
      { headers: apiHeaders(), next: { revalidate: 120 } },
      { headers: apiHeaders(), cache: "no-store" as const },
    ];
  for (const init of attempts) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) continue;
      const json = (await res.json()) as ProductPage;
      const rawItems = Array.isArray(json?.items) ? json.items : Array.isArray((json as unknown as { data?: PublicProductListItem[] })?.data) ? (json as unknown as { data: PublicProductListItem[] }).data : [];
      const items = rawItems.map((it) => ({ ...it, cover_image_url: mediaUrlOrNull(it.cover_image_url), cover_derivatives: mediaDerivatives(it.cover_derivatives) }));
      return { items, pagination: json?.pagination ?? empty.pagination };
    } catch {
      // Başarısız cevap önbelleğe alınmadan ikinci canlı okumayı dene.
    }
  }
  return empty;
}

// ---------------------------------------------------------------------------
// PAYLAŞILAN MAPPER — TEK KAYNAK. Homepage rail'leri + kategori grid'i AYNI
// mapper'ı kullanır (duplicate logic YOK). API list item → ProductCard shape.
// Rating/reviews UYDURULMAZ (yorum sistemi yok → alan yok → kart yıldızı gizler).
// ---------------------------------------------------------------------------
export interface CardProduct {
  id: number; name: string; slug: string; price: number;
  originalPrice?: number; image: string; badge?: string;
  productType?: string; sameDay?: boolean; scope?: string;
  hasSale?: boolean; isBestseller?: boolean; isNew?: boolean; categoryId?: number | null;
  derivatives?: MediaDerivatives | null; blurhash?: string | null;
  /** TRY kuruş taban fiyat — para birimi çevriminin kaynağı. `price` yuvarlanmış
   *  LİRA olduğu için çevrimde KULLANILMAZ: kart ile PDP 1 cent ayrışırdı. */
  priceMinor: number;
  originalPriceMinor?: number;
}
export function toCardProduct(p: PublicProductListItem): CardProduct {
  const hasSale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Math.round((hasSale ? Number(p.sale_price_minor) : Number(p.price_minor)) / 100),
    originalPrice: hasSale ? Math.round(Number(p.price_minor) / 100) : undefined,
    priceMinor: Math.round(hasSale ? Number(p.sale_price_minor) : Number(p.price_minor)),
    originalPriceMinor: hasSale ? Math.round(Number(p.price_minor)) : undefined,
    image: p.cover_image_url ?? "",
    badge: hasSale ? "İndirim" : p.is_new ? "Yeni" : p.is_bestseller ? "Çok Satan" : undefined,
    productType: p.product_type,
    sameDay: p.same_day_available,
    scope: p.delivery_scope,
    hasSale,
    isBestseller: p.is_bestseller,
    isNew: p.is_new,
    categoryId: p.primary_category_id,
    derivatives: p.cover_derivatives ?? null,
    blurhash: p.cover_blurhash ?? null,
  };
}

// ---------------------------------------------------------------------------
// LOKASYON SEO LANDING (ADDITIVE — Faz 1). Admin/DB tek kaynak:
// mahalleler + Coverage Engine ürünleri /api/public/delivery/zones/... uçlarından
// okunur (auth yok). Hata/erisim yoksa null döner; sayfa mevcut fallback ile
// render olmaya devam eder (canlı davranış bozulmaz).
// ---------------------------------------------------------------------------
export interface LocationNeighborhood { name: string; slug: string }
export interface DistrictNeighborhoods {
  city: { name: string; slug: string };
  district: { name: string; slug: string };
  neighborhoods: LocationNeighborhood[];
}

export async function fetchDistrictNeighborhoods(
  citySlug: string,
  districtSlug: string
): Promise<DistrictNeighborhoods | null> {
  const url = `${API_ORIGIN}/api/public/delivery/zones/${encodeURIComponent(citySlug)}/${encodeURIComponent(districtSlug)}/neighborhoods`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: DistrictNeighborhoods };
    if (!json?.data || !Array.isArray(json.data.neighborhoods)) return null;
    return json.data;
  } catch {
    return null;
  }
}

export interface LocationProductsPage {
  items: PublicProductListItem[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
  meta: { source: string; coverage_products: number };
}
export interface LocationProductsQuery {
  neighborhood?: string;
  page?: number;
  page_size?: number;
  is_bestseller?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
}

export async function fetchLocationProducts(
  citySlug: string,
  districtSlug: string,
  query: LocationProductsQuery = {}
): Promise<LocationProductsPage | null> {
  const p = new URLSearchParams();
  if (query.neighborhood) p.set("neighborhood", query.neighborhood);
  if (query.page) p.set("page", String(query.page));
  if (query.page_size) p.set("page_size", String(query.page_size));
  if (query.is_bestseller) p.set("is_bestseller", "true");
  if (query.is_new) p.set("is_new", "true");
  if (query.is_featured) p.set("is_featured", "true");
  const qs = p.toString();
  const url = `${API_ORIGIN}/api/public/delivery/zones/${encodeURIComponent(citySlug)}/${encodeURIComponent(districtSlug)}/products${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: LocationProductsPage };
    if (!json?.data || !Array.isArray(json.data.items)) return null;
    return json.data;
  } catch {
    return null;
  }
}
