// ---------------------------------------------------------------------------
// CICEKYOLLA PUBLIC — API katmanı
// Mevcut backend public endpoint'ini tüketir. Backend DEĞİŞMEZ.
// Şema, canlı endpoint çıktısına birebir uyumludur:
// GET /api/public/seo/page?path=/istanbul/besiktas/akat-mah
// { data: { url_path, page_type, lang, index_state, canonical_url,
//   title_tag, meta_description, h1, intro_html, body_blocks[], faq[], schema_jsonld } }
// ---------------------------------------------------------------------------

import { mediaUrl, mediaUrlOrNull, mediaDerivatives } from "./media";

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
export async function fetchCategoryTree(): Promise<CategoryNode[] | null> {
  const url = `${API_ORIGIN}${CATEGORIES_PATH}`;

  // Render/Vercel cold-start veya kısa ağ kesintilerinde ilk istek geçici olarak
  // başarısız olabilir. İlk deneme normal ISR cache sözleşmesini korur; yalnız hata
  // halinde tek bir no-store tekrar yapılır. Kategori verisi/slug/hiyerarşi değişmez.
  const attempts = [
    { headers: apiHeaders(), next: { revalidate: 300 } },
    { headers: apiHeaders(), cache: "no-store" },
  ];

  for (const init of attempts) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch {
      continue;
    }
    if (!res.ok) continue;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      continue;
    }

    // Zarf esnek: { data: [...] } ya da düz [...] — ikisini de kabul et.
    const payload = (json as { data?: unknown } | null)?.data ?? json;
    if (!Array.isArray(payload)) continue;

    const nodes = payload.filter(
      (n): n is CategoryNode =>
        !!n &&
        typeof (n as CategoryNode).name === "string" &&
        typeof (n as CategoryNode).slug === "string"
    );
    if (nodes.length > 0) return nodes;
  }
  return null;
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

/** Tek ürünü slug ile çeker. 404/hata veya 'active' değilse null (public gizler). */
export async function fetchProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const url = `${API_ORIGIN}/api/products/slug/${encodeURIComponent(slug)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: apiHeaders(), next: { revalidate: 120 } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as PublicProductDetail;
  if (!data?.product) return null;
  // Public yalnız yayında (active) ürünü gösterir.
  if (data.product.status !== "active") return null;
  // R2 (r2.dev) galeri görsel/video URL'lerini same-origin /r2 proxy'sine çevir (TR erişim fix'i).
  if (Array.isArray(data.images)) {
    data.images = data.images.map((im) => ({ ...im, url: mediaUrl(im.url), derivatives: mediaDerivatives(im.derivatives) }));
  }
  return data;
}

/** minor (kuruş) → "₺1.240" biçimi (TR). */
export function formatMinorTRY(v: string | number | null | undefined): string {
  if (v == null) return "";
  const n = Number(v) / 100;
  if (!Number.isFinite(n)) return "";
  return `₺${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
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
  cover_blurhash?: string | null; cover_derivatives?: MediaDerivatives | null;
}
export interface PublicProductListParams {
  is_bestseller?: boolean; is_featured?: boolean; is_new?: boolean;
  category_id?: number; page_size?: number;
  q?: string; // metin arama (backend /api/products?q= destekler)
  product_type?: string; // flower|plant|wreath|artificial|gift|service
  same_day_available?: boolean;
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
  if (params.sort) q.set("sort", params.sort);
  const url = `${API_ORIGIN}/api/products?${q.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: apiHeaders(), next: { revalidate: 120 } });
  } catch {
    return empty;
  }
  if (!res.ok) return empty;
  const json = (await res.json()) as ProductPage;
  const rawItems = Array.isArray(json?.items) ? json.items : Array.isArray((json as unknown as { data?: PublicProductListItem[] })?.data) ? (json as unknown as { data: PublicProductListItem[] }).data : [];
  // R2 (r2.dev) kapak URL'lerini same-origin /r2 proxy'sine çevir (TR erişim fix'i).
  const items = rawItems.map((it) => ({ ...it, cover_image_url: mediaUrlOrNull(it.cover_image_url), cover_derivatives: mediaDerivatives(it.cover_derivatives) }));
  return {
    items,
    pagination: json?.pagination ?? empty.pagination,
  };
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
}
export function toCardProduct(p: PublicProductListItem): CardProduct {
  const hasSale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Math.round((hasSale ? Number(p.sale_price_minor) : Number(p.price_minor)) / 100),
    originalPrice: hasSale ? Math.round(Number(p.price_minor) / 100) : undefined,
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
