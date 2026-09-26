// ============================================================================
// GLOBAL Faz 1 — server-side yüzey fetcher'ları (API surface uçları, 073).
// Cache YOK (no-store): yayından kaldırma anında yansımalı (23 Ağu #161 dersi).
// API erişilemezse null/boş döner — locale sayfası 404'e düşer, TR etkilenmez.
// ============================================================================
import type { GlobalLocale } from "./config";
import type { GlobalCatalogResponse } from "./globalCatalog";

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
  products: { slug: string; updated_at: string }[];
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
  locales: { locale: string; indexable: boolean }[];
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

export function fetchGlobalPagesInventory(locale: GlobalLocale): Promise<{ page_key: string; updated_at: string }[] | null> {
  return getJson<{ page_key: string; updated_at: string }[]>(
    `/api/public/global/pages-inventory?locale=${locale}`
  );
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
