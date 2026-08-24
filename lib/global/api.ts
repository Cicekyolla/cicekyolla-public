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

export async function fetchLocaleInventory(locale: GlobalLocale): Promise<LocaleInventory> {
  return (
    (await getJson<LocaleInventory>(`/api/public/translations/surface/inventory?locale=${locale}`)) ?? {
      products: [],
      categories: [],
    }
  );
}
