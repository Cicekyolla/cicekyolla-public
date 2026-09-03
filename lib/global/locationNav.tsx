// ---------------------------------------------------------------------------
// GLOBAL LOKASYON NAVİGASYONU (ADDITIVE) — şehir → ilçe → mahalle zincirini
// 13 dilde GERÇEK <a href> ile bağlar. Server Component: JS yükü yok, tüm
// linkler SSR'da (crawlable). Veri lib/global/locationTree.ts'ten, etiketler
// ve şehir eksonimleri lib/global/locationLabels.ts'ten (saf, testli) gelir.
// ---------------------------------------------------------------------------
import Link from "next/link";
import { MapPin } from "lucide-react";
import { DIR, type GlobalLocale } from "./config";
import type { LocationNode } from "./locationTree";
import { LABELS } from "./locationLabels";

export { CITY_NAMES, cityDisplayName, ilceBasligi, mahalleBasligi } from "./locationLabels";

/**
 * Lokasyon kırıntısı — üst seviyeler GERÇEK link (görsel metin değil).
 * İstanbul > Kadıköy > Caferağa
 */
export function LocationBreadcrumb({
  locale,
  city,
  cityName,
  district,
  districtName,
  neighborhoodName,
}: {
  locale: GlobalLocale;
  city: string;
  cityName: string;
  district?: string;
  districtName?: string;
  neighborhoodName?: string;
}) {
  const rtl = DIR[locale] === "rtl";
  const ayrac = <span className="px-2 text-[#C4B5FD]">{rtl ? "‹" : "›"}</span>;
  const link = "text-[#6D28D9] hover:underline";
  return (
    <nav aria-label={LABELS[locale].yol} className="mb-4 text-[13px] text-[#6B7280]">
      <Link href={`/${locale}/${city}`} className={link}>
        {cityName}
      </Link>
      {district && districtName ? (
        <>
          {ayrac}
          {neighborhoodName ? (
            <Link href={`/${locale}/${city}/${district}`} className={link}>
              {districtName}
            </Link>
          ) : (
            <span className="font-semibold text-[#1F2937]">{districtName}</span>
          )}
        </>
      ) : null}
      {neighborhoodName ? (
        <>
          {ayrac}
          <span className="font-semibold text-[#1F2937]">{neighborhoodName}</span>
        </>
      ) : null}
    </nav>
  );
}

/**
 * Lokasyon kartı ızgarası — şehir kökünde ilçeler, ilçe sayfasında mahalleler.
 * Link çöplüğü değil: mevcut kart dili (beyaz kart, ince mor kenarlık, hover).
 */
export function LocationGrid({
  locale,
  baseHref,
  items,
  title,
}: {
  locale: GlobalLocale;
  /** "/ru/istanbul" veya "/ru/antalya/alanya" */
  baseHref: string;
  items: LocationNode[];
  title: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12 rounded-[22px] border border-[#EDE9FE] bg-[#FAF9FE] px-5 py-8 sm:px-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#8B5CF6]">
          <MapPin className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#8B5CF6]">
            {LABELS[locale].ustEtiket}
          </p>
          <h2 className="mt-1 text-[19px] font-semibold text-[#1C0838]">{title}</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`${baseHref}/${it.slug}`}
            className="truncate rounded-[14px] border border-[#EDE9FE] bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-[#111827] transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:text-[#6D28D9]"
          >
            {it.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
