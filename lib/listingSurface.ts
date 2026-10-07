// ============================================================================
// lib/listingSurface.ts — GENEL LİSTELEME MOTORU'nun yüzey yapıştırıcısı (ağ katmanına bağlı).
// Saf kararlar lib/listingEngine.ts'te; burada yalnız "uç → bugünkü yol" fail-open zinciri kurulur.
//
// KATEGORİ TEK SERİ (ADMİN TEK MERKEZ — sözleşme v2 §4): TR /kategori/<slug> sayfa 1 (SSR), sayfa 2+
// (?page=N ve sonsuz kaydırma server action'ı), rota metadata'sı (ana seri durumu) ve boş kategori kararı
// HEPSİ bu TEK yardımcıdan geçer → aynı parametreler → aynı URL → istek içi tekilleştirme.
//   • Kategori seo_page showcase bloğu (Kategori Merkezi paneli) okunur:
//       manual → source=ids (operatörün tam listesi; sıra blok sırası),
//       auto + aktif items → pinned_ids (önce gösterilir, havuzdan dışlanır; uç tanımıyorsa aynı sonuç burada kurulur).
//   • auto: GET /api/public/seo/listing?source=category (stok/kapak/fiyat süzgeci SQL'de; tavanlar uçta + motorda)
//   • uç null (yok / hata) ya da filtre varsa (uç filtre tanımaz) → fetchProductsPaged (bugünkü) + motor tavanları.
//     /api/products YALNIZ bu fail-open dalında kullanılır.
// ============================================================================
import { fetchListingCardsByIds, fetchListingPage, fetchProductsPaged, type ListingRow, type ListingSettings, type ProductPage, type PublicProductListParams } from "./api.ts";
import {
  defaultShowcaseConfig, listingQueryFor, listingSortOf, mergePinnedFirst, pageSlice, resolveShowcaseConfig, resolvedPageSize, resolvedTotalPages, resolvedTotalPagesFrom,
  type ListingSort, type ResolvedShowcase, type ShowcaseBlockConfig,
} from "./listingEngine.ts";

export interface CategoryListingFilters {
  product_type?: string;
  same_day_available?: boolean;
  is_bestseller?: boolean;
  is_new?: boolean;
}

export interface CategoryListingInput {
  categoryId: number;
  page: number;
  /** Kategori yüzeyi sıralaması (category_order = varsayılan). */
  sort: NonNullable<PublicProductListParams["sort"]>;
  settings: ListingSettings;
  /** Kategori seo_page showcase bloğu (Kategori Merkezi); yoksa / okunamadıysa null → yalnız global ayar. */
  block?: ShowcaseBlockConfig | null;
  filters?: CategoryListingFilters;
}

/** ProductPage + kaynak etiketi: "listing" = listeleme ucu (kapak/stok süzgeci SQL'de); "fallback" = bugünkü /api/products. */
export type CategoryListingPage = ProductPage & { source?: "listing" | "fallback" };

/** Kategori sayfasının etkin vitrin yapılandırması: blok (manual / auto+pinned / override) → yoksa global ayardan auto category. */
export function categoryShowcaseConfig(categoryId: number, settings: ListingSettings, block?: ShowcaseBlockConfig | null): ResolvedShowcase {
  const source = { kind: "category" as const, category_id: categoryId };
  const fromBlock = block ? resolveShowcaseConfig(block, settings, { pageType: "category", categoryId }) : null;
  const cfg = fromBlock ?? defaultShowcaseConfig(settings, source);
  // Kategori sırası: operatörün elle kategori sırası (categoryOrderSql = ucun varsayılanı "default"). Global `sort`
  // kategoriye uygulanmaz (lib/categorySort.ts: varsayılan = category_order); yalnız blok `sort` override'ı geçerlidir.
  const blockSort = block && typeof block.sort === "string" && block.sort.trim() ? listingSortOf(block.sort) : null;
  return { ...cfg, sort: blockSort ?? "default" };
}

function rowMatches(r: ListingRow, f: CategoryListingFilters): boolean {
  if (f.product_type && r.product_type !== f.product_type) return false;
  if (f.same_day_available && !r.same_day_available) return false;
  if (f.is_bestseller && !r.is_bestseller) return false;
  if (f.is_new && !r.is_new) return false;
  return true;
}

function sortRows(rows: ListingRow[], sort: ListingSort): ListingRow[] {
  const price = (r: ListingRow) => {
    const sale = r.sale_price_minor == null ? NaN : Number(r.sale_price_minor);
    const base = Number(r.price_minor);
    return Number.isFinite(sale) && sale > 0 && sale < base ? sale : base;
  };
  const out = [...rows];
  if (sort === "price_asc") out.sort((a, b) => price(a) - price(b));
  else if (sort === "price_desc") out.sort((a, b) => price(b) - price(a));
  else if (sort === "name_asc") out.sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
  return out; // default / category_order / created_at_desc: manuel listede blok sırası
}

/** Sayfalı kategori listesi — ProductPage biçiminde (mevcut kararlar: categoryListingState, isConfirmedEmptyCategory aynen çalışır). */
export async function fetchCategoryListing(input: CategoryListingInput): Promise<CategoryListingPage> {
  const { settings } = input;
  const cfg = categoryShowcaseConfig(input.categoryId, settings, input.block);
  const perPage = resolvedPageSize(cfg);
  const f = input.filters ?? {};
  const filtered = !!(f.product_type || f.same_day_available || f.is_bestseller || f.is_new);
  const userSort = listingSortOf(input.sort);
  const sort: ListingSort = userSort !== "default" ? userSort : cfg.sort;

  if (cfg.mode === "manual") {
    // Elle seçim (Kategori Merkezi): operatörün tam listesi, blok sırası; aktif/stok/kapak süzgeci uçta (source=ids).
    // Müşteri sıralaması ve filtreler bu liste ÜZERİNDE uygulanır (uç ids'te sıralama/filtre tanımaz).
    const cards = await fetchListingCardsByIds(cfg.items);
    if (cards !== null) {
      const rows = sortRows(filtered ? cards.filter((r) => rowMatches(r, f)) : cards, sort);
      const total = rows.length;
      const totalPages = resolvedTotalPages(cfg, total);
      const { offset, limit } = cfg.paginationEnabled ? pageSlice(input.page, perPage) : { offset: 0, limit: perPage };
      return {
        items: rows.slice(offset, offset + limit),
        pagination: { page: input.page, page_size: perPage, total, total_pages: totalPages },
        answered: true,
        source: "listing",
      };
    }
    // FAIL-OPEN (ids ucu yok): bugünkü kategori listesi aşağıda.
  } else if (!filtered) {
    const listing = await fetchListingPage({ ...listingQueryFor(cfg, input.page), sort });
    if (listing) {
      // Uç pinned_ids'i tanımıyorsa (eski uç) öne çıkarılanlar 1. sayfada burada öne alınır (tekrar yok); tanıyorsa aynı sonuç.
      const items = input.page === 1 && cfg.pinnedIds.length ? mergePinnedFirst(cfg.pinnedIds, listing.items) : listing.items;
      return {
        items,
        pagination: {
          page: listing.pagination.page,
          page_size: perPage,
          total: listing.pagination.total,
          total_pages: resolvedTotalPagesFrom(cfg, listing.pagination),
        },
        answered: true,
        source: "listing",
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
  if (!pageData.answered) return { ...pageData, source: "fallback" };
  // Gerçek toplam aynen (başlıktaki "(N)" sayısı doğru kalır); yalnız sayfa sayısı motor tavanlarıyla kırpılır.
  return {
    ...pageData,
    pagination: { ...pageData.pagination, total_pages: resolvedTotalPagesFrom(cfg, pageData.pagination) },
    source: "fallback",
  };
}
