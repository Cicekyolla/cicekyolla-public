// components/location/CrossLinkBlock.tsx — ADDITIVE (HATA 3).
// Önceki durum: her lokasyon sayfası (39 ilçe + 975 mahalle dahil) Footer'daki
// SABİT 5 linki (Kadıköy/Beşiktaş/Şişli/Ankara/İzmir) görüyordu — sayfaya
// özel bağlam YOKTU. Bu bileşen sayfanın GERÇEK bağlamına göre değişir:
//   - "city"     → o ilin TÜM ilçeleri (gerçek SEO envanterinden, hardcode YOK)
//   - "district" → İstanbul ilçesiyse coğrafi komşu 4–6 ilçe (KOMSU_ILCELER) +
//                  /istanbul hub; İstanbul dışıysa aynı ildeki birkaç diğer
//                  ilçe (gerçek veri) + il hub linki
// Server Component — veri page.tsx'te önceden çekilip prop olarak geçirilir
// (NeighborhoodCards ile aynı desen).
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import type { CityDistrictSummary } from "@/lib/api";

type CrossLinkBlockProps =
  | {
      variant: "city";
      citySlug: string;
      cityName: string;
      districts: CityDistrictSummary[];
    }
  | {
      variant: "district";
      citySlug: string;
      cityName: string;
      districtSlug: string;
      related: CityDistrictSummary[];
      /** İstanbul dışı illerde /istanbul yerine kendi iline döner. */
      hubIsOwnCity?: boolean;
    };

export function CrossLinkBlock(props: CrossLinkBlockProps) {
  const items = props.variant === "city" ? props.districts : props.related;
  if (items.length === 0) return null;

  // Not: "{İl}'in/'ın Tüm İlçeleri" gibi bir iyelik eki (genitif) burada
  // KULLANILMAZ — yonelme() yalnız yönelme (dative) hâli üretir, iyelik eki
  // ayrı bir kural gerektirir. Belirsizliği önlemek için em-tire ile
  // ayrılan, ek gerektirmeyen bir başlık tercih edildi.
  const title =
    props.variant === "city"
      ? `${props.cityName} — Tüm İlçeler`
      : `${props.cityName} — Yakın Bölgeler`;

  const hubHref = props.variant === "city" ? null : `/${props.citySlug}`;
  const hubLabel = props.variant === "city" ? null : `Tüm ${props.cityName} Çiçekçileri`;

  return (
    <section className="border-y border-[#eee9f6] bg-white px-6 py-16 lg:px-14">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f7f5fc] text-[#8b5cf6]">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">Diğer bölgeler</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#140b20] md:text-4xl">{title}</h2>
            </div>
          </div>
          {hubHref ? (
            <Link
              href={hubHref}
              className="inline-flex items-center gap-2 rounded-full border border-[#e2dbf2] bg-white px-6 py-3 text-sm font-bold text-[#6d28d9] transition-colors hover:border-[#c4b5fd] hover:bg-[#f5f0ff]"
            >
              {hubLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((d) => (
            <Link
              key={d.slug}
              href={`/${props.citySlug}/${d.slug}`}
              className="group flex items-center justify-between gap-3 rounded-[20px] border border-[#ece7f4] bg-[#fbfafd] px-5 py-5 shadow-[0_12px_34px_rgba(45,22,72,.04)] transition-all hover:border-[#c4b5fd] hover:bg-white hover:shadow-[0_16px_40px_rgba(139,92,246,.12)]"
            >
              <span className="block truncate text-base font-semibold text-[#1f2937] group-hover:text-[#6d28d9]">
                {d.name} Çiçekçi
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

export default CrossLinkBlock;
