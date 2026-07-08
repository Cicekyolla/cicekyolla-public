"use server";

/**
 * CICEKYOLLA — Kategori ürün sayfalama server action'ı.
 * Infinite scroll için "sonraki 50 ürün"ü SUNUCUDA çeker (API_READ_TOKEN sunucuda kalır).
 * NOT: "use server" dosyası YALNIZ async fonksiyon export eder (Next kuralı) — tip yok.
 */

import {
  fetchProductsPaged,
  toCardProduct,
  type CardProduct,
} from "@/lib/api";

export async function loadCategoryProducts(input: {
  categoryId: number;
  page: number;
  pageSize: number;
  sort: "created_at_desc" | "price_asc" | "price_desc" | "name_asc";
  type?: string;
  sameDay?: boolean;
  bestseller?: boolean;
  isNew?: boolean;
}): Promise<{
  items: CardProduct[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const pageData = await fetchProductsPaged({
    category_id: input.categoryId,
    page: input.page,
    page_size: input.pageSize,
    sort: input.sort,
    product_type: input.type || undefined,
    same_day_available: input.sameDay || undefined,
    is_bestseller: input.bestseller || undefined,
    is_new: input.isNew || undefined,
  });
  return {
    items: (pageData.items ?? [])
      .filter((p) => p.cover_image_url)
      .map(toCardProduct),
    total: pageData.pagination.total,
    totalPages: pageData.pagination.total_pages,
    page: pageData.pagination.page,
  };
}
