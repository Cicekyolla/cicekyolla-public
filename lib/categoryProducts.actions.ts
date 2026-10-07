"use server";

/**
 * CICEKYOLLA — Kategori ürün sayfalama server action'ı.
 * Infinite scroll için "sonraki sayfa"yı SUNUCUDA çeker (API_READ_TOKEN sunucuda kalır).
 * NOT: "use server" dosyası YALNIZ async fonksiyon export eder (Next kuralı) — tip yok.
 *
 * KATEGORİ TEK SERİ (ADMİN TEK MERKEZ): sayfa 2+ de SSR 1. sayfayla AYNI yardımcıdan geçer
 * (lib/listingSurface.ts fetchCategoryListing: listeleme ucu + kategori bloğu + global ayar).
 * Bugünkü ürün ucu (lib/api.ts sayfalı okuma) yalnız o yardımcının fail-open dalındadır; burada ÇAĞRILMAZ.
 * Sayfa boyutu / tavanlar istemciden değil global ayardan okunur (istemci değeri yalnız geriye uyumluluk için kabul edilir).
 */

import { fetchListingSettings, fetchSeoPage, toCardProduct, type CardProduct } from "@/lib/api";
import { fetchCategoryListing } from "@/lib/listingSurface";
import { getShowcaseBlock } from "@/lib/showcaseBlocks";

const CATEGORY_PATH_RE = /^\/kategori\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

export async function loadCategoryProducts(input: {
  categoryId: number;
  page: number;
  /** Geriye uyumluluk: istemci değeri KULLANILMAZ — sayfa boyutu global ayardan (SSR ile aynı). */
  pageSize?: number;
  /** Geriye uyumluluk: istemci değeri KULLANILMAZ — max_pages global ayardan / bloktan (SSR ile aynı). */
  maxPages?: number | null;
  // EK (TEK KATEGORİ SIRASI): "category_order" = varsayılan sıra; API tanımıyorsa okuma katmanı
  // aynı isteği bugünkü sırayla tekrarlar (lib/api.ts) → SSR sayfasıyla aynı sıra.
  sort: "created_at_desc" | "price_asc" | "price_desc" | "name_asc" | "category_order";
  type?: string;
  sameDay?: boolean;
  bestseller?: boolean;
  isNew?: boolean;
  /** EK (ADMİN TEK MERKEZ): kategori sayfası yolu (/kategori/<slug>) → seo_page showcase bloğu (manual / pinned) okunur. */
  path?: string;
}): Promise<{
  items: CardProduct[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const path = typeof input.path === "string" && CATEGORY_PATH_RE.test(input.path) ? input.path : null;
  const [settings, seoPage] = await Promise.all([
    fetchListingSettings(),
    path ? fetchSeoPage(path).catch(() => null) : Promise.resolve(null),
  ]);
  const pageData = await fetchCategoryListing({
    categoryId: input.categoryId,
    page: input.page,
    sort: input.sort,
    settings,
    block: getShowcaseBlock(seoPage),
    filters: {
      product_type: input.type || undefined,
      same_day_available: input.sameDay || undefined,
      is_bestseller: input.bestseller || undefined,
      is_new: input.isNew || undefined,
    },
  });
  // Kapak süzgeci yalnız fail-open yolunda (listeleme ucu kapaksız satır döndürmez — süzgeç SQL'de).
  const rows = pageData.source === "listing" ? pageData.items : (pageData.items ?? []).filter((p) => p.cover_image_url);
  return {
    items: rows.map(toCardProduct),
    total: pageData.pagination.total,
    totalPages: pageData.pagination.total_pages,
    page: pageData.pagination.page,
  };
}
