// ============================================================================
// GLOBAL Faz 1 — server-side yüzey fetcher'ları (API surface uçları, 073).
// Cache YOK (no-store): yayından kaldırma anında yansımalı (23 Ağu #161 dersi).
// API erişilemezse null/boş döner — locale sayfası 404'e düşer, TR etkilenmez.
// ============================================================================
import { isSalesPageRow } from "./salesPages.ts";
import type { GlobalLocale } from "./config";
import type { GlobalCatalogResponse } from "./globalCatalog";
import { fetchWithDeadline } from "../fetchWithDeadline.ts";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export interface ProductSurface {
  product_id: number | string;
  tr_slug: string;
  name: string | null;
  short_description: string | null;
  long_description: string | null;
  slug: string;
  seo_title: string | null;
  meta_description: string | null;
  indexable: boolean;
  updated_at: string;
}

export interface ProductLocaleCluster {
  tr_slug: string | null;
  locales: { locale: string; slug: string; indexable: boolean }[];
}

export interface LocaleInventory {
  /** image / tr_slug: ADDITIVE (SEO yayın zinciri) — yeni API satırda verir; eski API'de alan yoktur (undefined). */
  products: { slug: string; updated_at: string; image?: string | null; tr_slug?: string | null }[];
  categories: { slug: string; updated_at: string }[];
}

/** RELEASE 3 — ilçe erişimi + kesme saati (API /reach: katalog ucuyla aynı motor kararı, ürün listesi yok). 5 dk tazeleme. */
export interface DistrictReach {
  city: string; district: string; reach: "in" | "mixed" | "out" | "far" | "unknown" | string;
  same_day: boolean | null; band: string | null; distance_km: number | null; cutoff_time: string | null;
}
const reachMemo = new Map<string, { at: number; v: DistrictReach | null }>();
const REACH_MEMO_MS = 5 * 60_000;
export async function fetchDistrictReach(locale: GlobalLocale, city: string, district: string): Promise<DistrictReach | null> {
  // Motor kararı ilçe başına 10 dk API'de önbellekli; burada süreç içi 5 dk memo (Data Cache YOK — dosya kuralı no-store).
  const key = `${city}/${district}`;
  const hit = reachMemo.get(key);
  if (hit && Date.now() - hit.at < REACH_MEMO_MS) return hit.v;
  let v: DistrictReach | null = null;
  try {
    const resp = await fetch(`${API_ORIGIN}/api/public/global/reach?locale=${locale}&city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`, { cache: "no-store" });
    if (resp.ok) {
      const json = (await resp.json()) as { data?: DistrictReach };
      v = json?.data ?? null;
    }
  } catch {
    v = null;
  }
  if (v) reachMemo.set(key, { at: Date.now(), v });
  return v;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const resp = await fetch(`${API_ORIGIN}${path}`, { cache: "no-store" });
    if (!resp.ok) return null;
    const body = (await resp.json()) as { data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ---- EK (13 Eki 2026 — GLOBAL İNDEKS KAYBI): "kayıt yok" ≠ "API'ye ulaşılamadı" ------------------------------
// getJson her ağ hatası / 5xx / zaman aşımında null döner; sayfa bunu "yok" sayıp notFound() → Googlebot'a 404.
// API (Render) kısa süre yavaşladığında / yeniden başladığında Global ürün, kategori ve lokasyon sayfaları gerçek
// 404 ile cevap veriyordu (404 tekrarlandıkça Google URL'yi dizinden düşürür; 5xx ise geçici sayılır).
// Aşağıdaki "require*" sürümleri YALNIZ sayfanın ana kaydında kullanılır: 2xx → veri (null = gerçekten yok → 404);
// 404 ve diğer 4xx → null (yok); ağ hatası / süre aşımı / 401 / 403 / 408 / 429 / 5xx / bozuk gövde → bir kez yeniden denenir, yine olmazsa GlobalApiUnavailableError
// fırlatılır → Next 5xx (geçici) döner, URL dizinde kalır. getJson ve diğer tüm çağıranlar DEĞİŞMEDİ.
export class GlobalApiUnavailableError extends Error {
  constructor(path: string) {
    super(`global_api_unavailable: ${path}`);
    this.name = "GlobalApiUnavailableError";
  }
}

/** Ana kayıt okuması süre sınırı (deneme başına). İki deneme → en kötü ~2 × bu süre, sonra 5xx. */
export const GLOBAL_PRIMARY_DEADLINE_MS = 8_000;

/**
 * HTTP durumunun anlamı (saf; testli):
 *  • "data"        2xx
 *  • "missing"     404 / 410 ve diğer 4xx: kayıt yok ya da istek geçersiz → sayfa 404 (bugünkü davranış)
 *  • "transient"   401 / 403 (kimlik / yapılandırma sorunu — sayfa yok DEMEK DEĞİL), 408, 429, 5xx → 5xx
 */
export function classifyPrimaryStatus(status: number): "data" | "missing" | "transient" {
  if (status >= 200 && status < 300) return "data";
  if (status === 401 || status === 403 || status === 408 || status === 429) return "transient";
  if (status >= 400 && status < 500) return "missing";
  return "transient";
}

/** Ana kayıt okuması: veri | null (kesin yok) | fırlatır (okunamadı). fetchFn / timeoutMs yalnız birim testi içindir. */
export async function getJsonOrThrow<T>(
  path: string,
  fetchFn: typeof fetch = fetch,
  attempts = 2,
  timeoutMs = GLOBAL_PRIMARY_DEADLINE_MS,
): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetchFn(`${API_ORIGIN}${path}`, { cache: "no-store", signal: controller.signal });
      const kind = classifyPrimaryStatus(resp.status);
      if (kind === "missing") return null;
      if (kind === "data") {
        const body = (await resp.json()) as { data?: T } | null;
        return body?.data ?? null;
      }
    } catch {
      // ağ hatası / süre doldu / bozuk gövde → yeniden dene
    } finally {
      clearTimeout(timer);
    }
  }
  throw new GlobalApiUnavailableError(path);
}

export function requireGlobalPage(locale: GlobalLocale, key: string): Promise<GlobalPage | null> {
  return getJsonOrThrow<GlobalPage>(`/api/public/global/page?locale=${locale}&key=${encodeURIComponent(key)}`);
}
/** 115 (ADDITIVE): satış sayfası adres çözümü — tek segment url_slug ya da anahtar. Eski API ?slug= tanımaz → 400 → null (bugünkü 404). */
export function requireGlobalSalesPage(locale: GlobalLocale, seg: string): Promise<GlobalPage | null> {
  return getJsonOrThrow<GlobalPage>(`/api/public/global/page?locale=${locale}&slug=${encodeURIComponent(seg)}`);
}
export function requireCategorySurface(locale: GlobalLocale, slug: string): Promise<CategorySurface | null> {
  return getJsonOrThrow<CategorySurface>(`/api/public/translations/surface/category/${encodeURIComponent(slug)}?locale=${locale}`);
}
export function requireProductSurface(locale: GlobalLocale, slug: string): Promise<ProductSurface | null> {
  return getJsonOrThrow<ProductSurface>(`/api/public/translations/surface/product/${encodeURIComponent(slug)}?locale=${locale}`);
}

/** EK (13 Eki 2026): Global lokasyon anahtarı → TR kaydın kendi location bloğundan çözülen yol (API /global/tr-location).
 *  Uç yok / hata / belirsiz → null (çağıran 301 haritasına düşer). */
export async function fetchTrLocationPath(key: string): Promise<string | null> {
  const data = await getJson<{ url_path?: string | null }>(`/api/public/global/tr-location?key=${encodeURIComponent(key)}`);
  return typeof data?.url_path === "string" ? data.url_path : null;
}

export function fetchProductSurface(locale: GlobalLocale, slug: string): Promise<ProductSurface | null> {
  return getJson<ProductSurface>(
    `/api/public/translations/surface/product/${encodeURIComponent(slug)}?locale=${locale}`
  );
}

export function fetchProductLocaleCluster(productId: number | string): Promise<ProductLocaleCluster | null> {
  return getJson<ProductLocaleCluster>(
    `/api/public/translations/surface/product-locales/${productId}`
  );
}

// ---- Faz 2: global_pages + kategori yüzeyi + katalog ------------------------

export interface GlobalPage {
  locale: string;
  page_key: string;
  h1: string | null;
  seo_title: string | null;
  meta_description: string | null;
  intro_html: string | null;
  content_html: string | null;
  faq: { q: string; a: string }[] | null;
  indexable: boolean;
  updated_at: string;
  /** 115 (ADDITIVE, satış sayfaları): url_slug her dil karşılığında da gelir; eski API'de yok. */
  locales: { locale: string; indexable: boolean; url_slug?: string | null }[];
  /** 115: dilin SEO adresi (/{dil}/{url_slug}); yoksa /{dil}/{page_key}. */
  url_slug?: string | null;
  focus_keyword?: string | null;
  /** 115: Global Merkezi'nde sıralanan ürün seçimi; boş/yok → otomatik katalog. */
  product_ids?: number[] | null;
}

export interface CategorySurface {
  category_id: number | string;
  tr_slug: string;
  name: string | null;
  description: string | null;
  slug: string;
  seo_title: string | null;
  meta_description: string | null;
  indexable: boolean;
  updated_at: string;
  /** Additive (16 Eyl 2026): Category Center görseli. */
  image?: string | null;
  /** Ürünler: katalog ∩ gerçek kategori bağı, Global Merkezi sırası. Kart alanları yeni API'de satırda. */
  products: CategorySurfaceProduct[];
  locales: { locale: string; slug: string; indexable: boolean }[];
}
export interface CategorySurfaceProduct {
  slug: string; name: string; tr_slug: string; price_minor?: string | null; sale_price_minor?: string | null; image_url?: string | null;
  id?: number; image?: string | null; blurhash?: string | null; derivatives?: { webp?: string; avif?: string; responsive?: Record<string, string> } | null;
  product_type?: string | null; delivery_scope?: string | null; same_day_available?: boolean; is_new?: boolean; is_bestseller?: boolean; delivery_model_code?: string | null;
}

export interface LocaleCatalog {
  // live_products / product_slugs: katalog ∩ gerçek kategori bağı (Global Merkezi ile aynı sorgu).
  categories: { id?: number; slug: string; name: string; image?: string | null; live_products?: number; product_slugs?: string[] }[];
  products: { slug: string; name: string; tr_slug: string }[];
}

export function fetchGlobalPage(locale: GlobalLocale, key: string): Promise<GlobalPage | null> {
  return getJson<GlobalPage>(
    `/api/public/global/page?locale=${locale}&key=${encodeURIComponent(key)}`
  );
}

/** GLOBAL VERSION 80 footer: 4 destinasyon — ilçe sayısı + o dilde şehir kökü yayımlı mı (uç yoksa null → bağlantı basılmaz). */
export interface LiveDestination { slug: string; districts: number; live: boolean }
export function fetchLiveDestinations(locale: GlobalLocale): Promise<LiveDestination[] | null> {
  return getJson<LiveDestination[]>(`/api/public/global/destinations?locale=${locale}`);
}

/**
 * GLOBAL KATALOG (lokasyon yüzeyleri): o dilde canlı tüm ürünler, gerçek kategori bağı + ortak sıra,
 * öne çıkanlar; lokasyon verilirse teslimat uygunluğuyla süzülmüş. Sayfa başına TEK istek.
 * Hata/uç yok → null; karar lib/global/globalCatalog.ts catalogDecision'da (null = bugünkü davranış).
 */
export function fetchGlobalCatalog(
  locale: GlobalLocale,
  location?: { city: string; district?: string; neighborhood?: string } | null
): Promise<GlobalCatalogResponse | null> {
  const q = new URLSearchParams({ locale });
  if (location) {
    q.set("city", location.city);
    if (location.district) q.set("district", location.district);
    if (location.district && location.neighborhood) q.set("neighborhood", location.neighborhood);
  }
  return getJson<GlobalCatalogResponse>(`/api/public/global/catalog?${q.toString()}`);
}

export function fetchGlobalPagesInventory(locale: GlobalLocale): Promise<{ page_key: string; updated_at: string; url_slug?: string | null }[] | null> {
  return getJson<{ page_key: string; updated_at: string; url_slug?: string | null }[]>(
    `/api/public/global/pages-inventory?locale=${locale}`
  );
}

/** 115 (ADDITIVE): o dilde yayında + indexlenebilir satış sayfaları (iç bağlantı listesi). Eski API ?kind'i tanımaz ve h1
 *  vermez → yalnız h1'li satış satırları alınır (eski API'de liste boş kalır; sahte bağlantı yok). */
export async function fetchLiveSalesPages(locale: GlobalLocale): Promise<{ page_key: string; url_slug: string | null; h1: string }[]> {
  const rows = await getJson<{ page_key: string; url_slug?: string | null; h1?: string | null }[]>(
    `/api/public/global/pages-inventory?locale=${locale}&kind=sales`
  ).catch(() => null);
  return (rows ?? [])
    .filter((r) => typeof r.h1 === "string" && r.h1.trim() !== "" && isSalesPageRow(r))
    .map((r) => ({ page_key: r.page_key, url_slug: r.url_slug ?? null, h1: (r.h1 as string).trim() }));
}

export function fetchCategorySurface(locale: GlobalLocale, slug: string): Promise<CategorySurface | null> {
  return getJson<CategorySurface>(
    `/api/public/translations/surface/category/${encodeURIComponent(slug)}?locale=${locale}`
  );
}

export async function fetchLocaleCatalog(locale: GlobalLocale): Promise<LocaleCatalog> {
  return (
    (await getJson<LocaleCatalog>(`/api/public/translations/surface/catalog?locale=${locale}`)) ?? {
      categories: [],
      products: [],
    }
  );
}

export async function fetchLocaleInventory(locale: GlobalLocale): Promise<LocaleInventory> {
  return (
    (await getJson<LocaleInventory>(`/api/public/translations/surface/inventory?locale=${locale}`)) ?? {
      products: [],
      categories: [],
    }
  );
}

// ---- EK (SEO YAYIN ZİNCİRİ) — locale sitemap için "checked" okumalar -------
// Yukarıdaki fetcher'lar DEĞİŞMEDİ (hata → boş/null; sayfalar aynı yolu kullanır).
// Buradakiler hatayı BİLDİRİR: locale sitemap'i upstream hatasında boş 200 yerine
// 503 verebilsin (lib/sitemapSources.ts). Dosya kuralı aynı: no-store, Data Cache yok.

/** ok=false → uç OKUNAMADI (ağ / zaman aşımı / 200 dışı / bozuk gövde); ok=true ve data=null → yanıt geldi ama veri yok. */
export interface CheckedRead<T> {
  ok: boolean;
  data: T | null;
}

async function getJsonChecked<T>(path: string): Promise<CheckedRead<T>> {
  try {
    // DAYANIKLILIK: 8 sn süre sınırı + tek tekrar (bkz. lib/fetchWithDeadline.ts).
    const resp = await fetchWithDeadline(`${API_ORIGIN}${path}`, { cache: "no-store" }, 8_000);
    if (!resp.ok) return { ok: false, data: null };
    const body = (await resp.json()) as { data?: T };
    return { ok: true, data: body.data ?? null };
  } catch {
    return { ok: false, data: null };
  }
}

export function fetchLocaleInventoryChecked(locale: GlobalLocale): Promise<CheckedRead<LocaleInventory>> {
  return getJsonChecked<LocaleInventory>(`/api/public/translations/surface/inventory?locale=${locale}`);
}

export function fetchGlobalPagesInventoryChecked(
  locale: GlobalLocale
): Promise<CheckedRead<{ page_key: string; updated_at: string; url_slug?: string | null }[]>> {
  return getJsonChecked<{ page_key: string; updated_at: string; url_slug?: string | null }[]>(
    `/api/public/global/pages-inventory?locale=${locale}`
  );
}
