// ============================================================================
// GLOBAL Faz 1 — server-side yüzey fetcher'ları (API surface uçları, 073).
// Cache YOK (no-store): yayından kaldırma anında yansımalı (23 Ağu #161 dersi).
// API erişilemezse null/boş döner — locale sayfası 404'e düşer, TR etkilenmez.
// ============================================================================
import type { GlobalLocale } from "./config";

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
  products: { slug: string; name: string; tr_slug: string; price_minor?: string | null; sale_price_minor?: string | null; image_url?: string | null }[];
  locales: { locale: string; slug: string; indexable: boolean }[];
}

export interface LocaleCatalog {
  // live_products / product_slugs: API additive alanları (Global Merkezi ile aynı formül).
  categories: { slug: string; name: string; live_products?: number; product_slugs?: string[] }[];
  products: { slug: string; name: string; tr_slug: string }[];
}

export function fetchGlobalPage(locale: GlobalLocale, key: string): Promise<GlobalPage | null> {
  return getJson<GlobalPage>(
    `/api/public/global/page?locale=${locale}&key=${encodeURIComponent(key)}`
  );
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
