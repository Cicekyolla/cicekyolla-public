// ---------------------------------------------------------------------------
// MAHALLE KARTLARI (ADDITIVE — Faz 1/3). Admin/DB'den gelen gerçek mahalleler;
// her kart mevcut canlı URL'sine (/{il}/{ilçe}/{mahalle-slug}) iç link verir.
// Figma dili: beyaz kart, ince border, soft shadow, 20px radius, mor hover.
// Server Component — JS yükü yok, tüm linkler SSR'da (iç link SEO değeri).
// ---------------------------------------------------------------------------
import Link from "next/link";
import { ArrowRight, MapPin, Truck } from "lucide-react";
import type { LocationNeighborhood } from "@/lib/api";

type NeighborhoodCardsProps = {
  citySlug: string;
  districtSlug: string;
  districtName: string;
  neighborhoods: LocationNeighborhood[];
  /** Mahalle sayfasında o mahalleyi listeden gizlemek için. */
  currentSlug?: string;
  /** Mahalle sayfası varyantı: başlık "diğer mahalleler" olur, ilçe geri linki eklenir. */
  variant?: "district" | "neighborhood";
};

function displayName(name: string): string {
  return name.replace(/\s+Mah\.?$/i, "").trim() || name;
}

export function NeighborhoodCards({
  citySlug,
  districtSlug,
  districtName,
  neighborhoods,
  currentSlug,
  variant = "district",
}: NeighborhoodCardsProps) {
  const items = neighborhoods.filter((n) => n.slug !== currentSlug);
  if (items.length === 0) return null;
  const title =
    variant === "neighborhood"
      ? `${districtName}'in Diğer Mahalleleri`
      : `${districtName} Mahallelerine Çiçek Teslimatı`;

  return (
    <section className="border-y border-[#eee9f6] bg-[#f7f5fc] px-6 py-16 lg:px-14">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#8b5cf6]">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">Teslimat bölgeleri</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#140b20] md:text-4xl">{title}</h2>
            </div>
          </div>
          {variant === "neighborhood" ? (
            <Link
              href={`/${citySlug}/${districtSlug}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#e2dbf2] bg-white px-6 py-3 text-sm font-bold text-[#6d28d9] transition-colors hover:border-[#c4b5fd] hover:bg-[#f5f0ff]"
            >
              {districtName} çiçek siparişi <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((n) => (
            <Link
              key={n.slug}
              href={`/${citySlug}/${districtSlug}/${n.slug}`}
              className="group flex items-center justify-between gap-3 rounded-[20px] border border-[#ece7f4] bg-white px-5 py-5 shadow-[0_12px_34px_rgba(45,22,72,.04)] transition-all hover:border-[#c4b5fd] hover:shadow-[0_16px_40px_rgba(139,92,246,.12)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-[#1f2937] group-hover:text-[#6d28d9]">
                  {displayName(n.name)}
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#9b94a8]">
                  <Truck className="h-3.5 w-3.5 text-[#8b5cf6]" /> Aynı gün teslimat
                </span>
              </span>
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[#f5f0ff] text-[#8b5cf6] transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default NeighborhoodCards;
