// ============================================================================
// GLOBAL lokasyon kataloğu — kategori çipleri (GERÇEK link) + 24'lük sayfa dilimi + sayfalama.
// Server Component (istemci durumu yok). Veri sunucuda çözülür:
//   API /api/public/global/catalog → planLocationPage → resolveLocationCatalog (lib/global/locationPaging.ts)
//   • "Tümü" (sorgusuz yol): bu lokasyona teslim edilebilir katalog, her ürün bir kez
//     (önce vitrin öne çıkanları, sonra katalog sırası).
//   • Kategori çipi (?category=slug): o kategorinin GERÇEK Product Center bağlı ürünleri, Global Merkezi
//     sırasıyla (çok kategorili ürün bağlı olduğu HER çipte; teslimat süzmesi sırayı bozmaz).
//   • Önce SON sıralı liste, SONRA dilim (?page=N): bu bileşen YALNIZ o sayfanın kartlarını alır ve basar —
//     tam liste ne DOM'a ne RSC yüküne girer; gizlenmiş ürün ya da gizli link listesi yok.
//   • Çip sayıları filtre-bağımsız toplamlar; çip linki page taşımaz (filtre değişince page düşer, TR standardı).
// Kartlar TR mağazasıyla aynı ProductCard. Ürün başına istek yok. Giriş animasyonu gecikmesi TR
// CategoryProductGrid standardıyla sınırlı (Math.min(idx, 7)).
// ============================================================================
import Link from "next/link";
import { ProductCard, type Product } from "@/components/home/ProductCard";
import { GlobalPagination } from "@/components/global/GlobalPagination";
import type { GlobalLocale } from "@/lib/global/config";
import type { LocationCatalogView } from "@/lib/global/locationPaging";

export interface CatalogBrowserItem { id: number; href: string; card: Product }
/** Plan kategori listesi biçimi (geriye uyum için dışa aktarılı kalır; tam liste bu bileşene GEÇİRİLMEZ). */
export interface CatalogBrowserCategory { slug: string; name: string; ids: number[] }

export function GlobalCatalogBrowser({ locale, items, view }: {
  locale: GlobalLocale;
  /** YALNIZ bu sayfanın dilimi (en çok LOCATION_PAGE_SIZE kart), son sıralı listeden. */
  items: CatalogBrowserItem[];
  /** Etkin filtre/sayfa, çip linkleri (+ sayılar) ve sayfalama modeli — ürün listesi taşımaz. */
  view: Pick<LocationCatalogView, "category" | "page" | "chips" | "pagination">;
}) {
  const active = view.category;
  // 1. sayfada çip geçişi ızgarayı yerinde değiştirir (kaydırma korunur); devam sayfasından çıkışta sayfa başı.
  const keepScroll = view.page === 1;
  return (
    <div data-global-catalog>
      {/* Çipler: mobilde TEK satır yatay kaydırma (ızgara ekranın altına itilmez); sm+ sarar.
          -mx-4/px-4: <main px-4> kenarına kadar kayar, ilk çip ızgarayla hizalı başlar. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" data-catalog-chips>
        {view.chips.map((c) => (
          <Link
            key={c.key ?? "__all"}
            href={c.href}
            prefetch={false}
            scroll={keepScroll ? false : undefined}
            aria-current={c.active ? "true" : undefined}
            data-catalog-chip={c.key ?? "all"}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${c.active ? "border-[#8B5CF6] bg-[#F5F3FF] text-[#6D28D9]" : "border-[#EDE9FE] bg-white text-[#4B5563] hover:border-[#8B5CF6]"}`}
          >
            {c.label} <span className="font-normal text-[#8B5CF6]">{c.count}</span>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4" data-catalog-grid={active ?? "all"} data-catalog-page={view.page}>
        {items.map((it, idx) => (
          <ProductCard key={`${active ?? "all"}-${view.page}-${it.id}`} product={it.card} idx={Math.min(idx, 7)} href={it.href} />
        ))}
      </div>
      <GlobalPagination locale={locale} pagination={view.pagination} />
    </div>
  );
}
