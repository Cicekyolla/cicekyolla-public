// Vitrin / konum blokları (saf). Veri sözleşmesi: seo_page_content.body_blocks içinde
//   { type:"showcase", items:[{product_id, active}] }   — dizi sırası = gösterim sırası, en çok 500
//   { type:"location", city:"istanbul", district:"maltepe" } — yalnız pillar (category_location)
// Yeni tablo/uç YOK. Bu dosya runtime'da api.ts'e bağımlı değildir (yalnız tip).
import type { PublicProductDetail, PublicProductListItem } from "./api.ts";
import { SHOWCASE_PAGE_SIZE, totalPages } from "./showcasePagination.ts";

type WithBlocks = { body_blocks?: unknown } | null | undefined;
export const MAX_SHOWCASE_ITEMS = 500;

function blocks(page: WithBlocks): Record<string, unknown>[] {
  const b = page?.body_blocks;
  return Array.isArray(b) ? b.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
}

/** Aktif vitrin ürün kimlikleri, blok sırasıyla. Tekrarlar ve geçersiz kimlikler atılır. */
export function getShowcaseItems(page: WithBlocks): number[] {
  const block = blocks(page).find((x) => x.type === "showcase");
  if (!block || !Array.isArray(block.items)) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of block.items.slice(0, MAX_SHOWCASE_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as { product_id?: unknown; active?: unknown };
    const id = Number(it.product_id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    if (it.active === false) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Pillar konum bloğu; geçersizse null. */
export function getLocationBlock(page: WithBlocks): { city: string; district: string } | null {
  const block = blocks(page).find((x) => x.type === "location");
  if (!block) return null;
  const city = typeof block.city === "string" ? block.city.trim() : "";
  const district = typeof block.district === "string" ? block.district.trim() : "";
  return SLUG.test(city) && SLUG.test(district) ? { city, district } : null;
}

/** Toplam sayfa = aktif öğe sayısına göre (ürün çözümlemesinden bağımsız). */
export function showcaseTotalPages(activeCount: number): number {
  return totalPages(activeCount, SHOWCASE_PAGE_SIZE);
}

/** Verilen sayfanın (1 tabanlı) ürün kimlikleri. */
export function showcasePageIds(ids: number[], page: number): number[] {
  const start = (page - 1) * SHOWCASE_PAGE_SIZE;
  return start < 0 ? [] : ids.slice(start, start + SHOWCASE_PAGE_SIZE);
}

/** GET /api/products/:id yanıtı → toCardProduct'ın beklediği şekil. Aktif değil / stok 0 / kapak yok → null. */
export function productDetailToListItem(d: PublicProductDetail | null | undefined): PublicProductListItem | null {
  const p = d?.product;
  if (!p || p.status !== "active" || !(Number(p.stock_quantity) > 0)) return null;
  const covers = (Array.isArray(d?.images) ? d!.images : [])
    .filter((im) => im && im.role === "cover" && im.url)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const cover = covers[0];
  if (!cover) return null;
  return {
    id: p.id, name: p.name, slug: p.slug,
    price_minor: p.price_minor, sale_price_minor: p.sale_price_minor,
    currency: p.currency, status: p.status, product_type: p.product_type,
    is_featured: p.is_featured, is_bestseller: p.is_bestseller, is_new: p.is_new,
    stock_quantity: p.stock_quantity, cover_image_url: cover.url, primary_category_id: d!.categories?.find((c) => c.is_primary)?.category_id ?? null,
    same_day_available: p.same_day_available, delivery_scope: p.delivery_scope, delivery_model_code: p.delivery_model_code ?? null,
    cover_blurhash: cover.blurhash ?? null, cover_derivatives: cover.derivatives ?? null,
  };
}
