// ============================================================================
// lib/listingSurface.ts — GENEL LİSTELEME MOTORU'nun yüzey yapıştırıcısı (ağ katmanına bağlı).
// Saf kararlar lib/listingEngine.ts'te; burada yalnız "uç → bugünkü yol" fail-open zinciri kurulur.
//
// Kategori yüzeyi (TR /kategori/<slug>): aynı istek üç yerden yapılır (metadata ana seri durumu,
// boş kategori kararı, CategoryLanding listesi) → hepsi BU yardımcıdan geçer: aynı parametreler → aynı
// URL → istek içi tekilleştirme (önceki `fetchProductsPaged({... page_size: 50 ...})` üçlüsüyle aynı niyet).
//   1) GET /api/public/seo/listing?source=category (stok/kapak/fiyat süzgeci SQL'de; tavanlar uçta)
//   2) uç null (yok / hata) ya da filtre varsa (uç filtre tanımaz) → fetchProductsPaged (bugünkü) + motor tavanları
// ============================================================================
import { fetchListingPage, fetchProductsPaged, type ListingSettings, type ProductPage, type PublicProductListParams } from "./api.ts";
import { cappedTotalPages, listingSortOf } from "./listingEngine.ts";

export interface CategoryListingInput {
  categoryId: number;
  page: number;
  /** Kategori yüzeyi sıralaması (category_order = varsayılan). */
  sort: NonNullable<PublicProductListParams["sort"]>;
  settings: ListingSettings;
  filters?: { product_type?: string; same_day_available?: boolean; is_bestseller?: boolean; is_new?: boolean };
}

/** Sayfalı kategori listesi — ProductPage biçiminde (mevcut kararlar: categoryListingState, isConfirmedEmptyCategory aynen çalışır). */
export async function fetchCategoryListing(input: CategoryListingInput): Promise<ProductPage> {
  const { settings } = input;
  const perPage = settings.per_page;
  const f = input.filters ?? {};
  const filtered = !!(f.product_type || f.same_day_available || f.is_bestseller || f.is_new);
  if (!filtered) {
    const listing = await fetchListingPage({
      source: { kind: "category", category_id: input.categoryId },
      page: input.page,
      per_page: perPage,
      max_items: settings.max_items,
      in_stock: settings.in_stock,
      sort: listingSortOf(input.sort),
    });
    if (listing) {
      return {
        items: listing.items,
        pagination: {
          page: listing.pagination.page,
          page_size: perPage,
          total: listing.pagination.total,
          total_pages: cappedTotalPages(listing.pagination, perPage, settings.max_items, settings.max_pages),
        },
        answered: true,
      };
    }
  }
  // FAIL-OPEN / filtreli: bugünkü uç, bugünkü sıra mantığı (lib/api.ts), motor tavanları.
  const pageData = await fetchProductsPaged({
    category_id: input.categoryId,
    page: input.page,
    page_size: perPage,
    sort: input.sort,
    product_type: f.product_type || undefined,
    same_day_available: f.same_day_available || undefined,
    is_bestseller: f.is_bestseller || undefined,
    is_new: f.is_new || undefined,
  });
  if (!pageData.answered) return pageData;
  // Gerçek toplam aynen (başlıktaki "(N)" sayısı doğru kalır); yalnız sayfa sayısı motor tavanlarıyla kırpılır.
  return {
    ...pageData,
    pagination: { ...pageData.pagination, total_pages: cappedTotalPages(pageData.pagination, perPage, settings.max_items, settings.max_pages) },
  };
}
