// ---------------------------------------------------------------------------
// OPERATÖR VİTRİNİ GRID'İ (Maltepe pilotu). Server Component — JS yok.
// Kartlar LocationProducts ile aynı görünüm; sayfalama GERÇEK <a href> linkleri
// (…/sayfa/N), arama motoru her sayfayı tarayabilir. Sorgu dizesi yok (ISR).
// ---------------------------------------------------------------------------
import Link from "next/link";
import { ProductDisplayName } from "@/lib/i18n/content";
import { Price } from "@/components/Price";
import { ProductImage } from "@/components/product/ProductImage";
import { avifMediaFromSizes } from "@/lib/avifPolicy";
import type { CardProduct } from "@/lib/api";
import { prevNext, showcasePageHref, visiblePages } from "@/lib/showcasePagination";

const SIZES = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw";
const AVIF_MEDIA = avifMediaFromSizes(SIZES);

const NAV_BASE = "inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-full border px-4 text-sm font-bold transition-colors";
const NAV_IDLE = "border-[#e2dbf2] bg-white text-[#6d28d9] hover:border-[#c4b5fd] hover:bg-[#f5f0ff]";
const NAV_ACTIVE = "border-[#8b5cf6] bg-[#8b5cf6] text-white";

export function ShowcaseGrid({ items, basePath, page, totalPages }: {
  items: CardProduct[];
  basePath: string;
  page: number;
  totalPages: number;
}) {
  const { prev, next } = prevNext(page, totalPages);
  return (
    <div>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <Link key={p.id} href={`/urun/${p.slug}`} className="group overflow-hidden rounded-[18px] bg-white">
            <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[#f7f5fa]">
              <ProductImage
                src={p.image}
                alt={p.name}
                padding="0px"
                derivatives={p.derivatives}
                blurhash={p.blurhash}
                hoverZoom
                sizes={SIZES}
                avifMedia={AVIF_MEDIA}
              />
              {p.badge ? (
                <span className="absolute left-3 top-3 z-[2] rounded-full bg-[#8b5cf6]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  {p.badge}
                </span>
              ) : null}
            </div>
            <div className="pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8b5cf6]">
                {p.sameDay ? "Aynı Gün Teslimat" : "Premium Aranjman"}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[#171020] group-hover:text-[#6d28d9]"><ProductDisplayName id={p.id} fallback={p.name} /></h3>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#141020]"><Price minor={p.priceMinor ?? p.price * 100} /></span>
                {p.originalPrice ? (
                  <span className="text-sm font-medium text-[#9b94a8] line-through">
                    <Price minor={p.originalPriceMinor ?? p.originalPrice * 100} />
                  </span>
                ) : null}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 ? (
        <nav aria-label="Sayfalama" className="mt-14 flex flex-wrap items-center justify-center gap-2">
          {prev !== null ? (
            <a href={showcasePageHref(basePath, prev)} rel="prev" className={`${NAV_BASE} ${NAV_IDLE}`}>Önceki</a>
          ) : null}
          {visiblePages(page, totalPages).map((n, i) =>
            n === "gap" ? (
              <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-[#9b94a8]">…</span>
            ) : n === page ? (
              <span key={n} aria-current="page" className={`${NAV_BASE} ${NAV_ACTIVE}`}>{n}</span>
            ) : (
              <a key={n} href={showcasePageHref(basePath, n)} aria-label={`Sayfa ${n}`} className={`${NAV_BASE} ${NAV_IDLE}`}>{n}</a>
            ),
          )}
          {next !== null ? (
            <a href={showcasePageHref(basePath, next)} rel="next" className={`${NAV_BASE} ${NAV_IDLE}`}>Sonraki</a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export default ShowcaseGrid;
