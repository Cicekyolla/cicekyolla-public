// ---------------------------------------------------------------------------
// GLOBAL LOKASYON NAVİGASYONU (ADDITIVE) — İstanbul → ilçe → mahalle zincirini
// 13 dilde GERÇEK <a href> ile bağlar. Server Component: JS yükü yok, tüm
// linkler SSR'da (crawlable). Veri lib/global/locationTree.ts'ten gelir.
//
// Buradaki metinler ARAYÜZ etiketidir (bölüm başlığı / breadcrumb) — yeni SEO
// içeriği DEĞİL. Yer adları TR location core'dan olduğu gibi kullanılır.
// ---------------------------------------------------------------------------
import Link from "next/link";
import { MapPin } from "lucide-react";
import { DIR, type GlobalLocale } from "./config";
import type { LocationNode } from "./locationTree";

type Etiket = {
  /** İstanbul kökünde ilçe bölümünün başlığı */
  ilceler: string;
  /** İlçe sayfasında mahalle bölümünün başlığı — {d} = ilçe adı */
  mahalleler: (d: string) => string;
  /** Bölüm üstü küçük etiket */
  ustEtiket: string;
  /** Breadcrumb aria-label */
  yol: string;
};

const T: Record<GlobalLocale, Etiket> = {
  en: { ilceler: "Districts of Istanbul", mahalleler: (d) => `Neighbourhoods of ${d}`, ustEtiket: "Delivery areas", yol: "Breadcrumb" },
  de: { ilceler: "Bezirke von Istanbul", mahalleler: (d) => `Stadtteile von ${d}`, ustEtiket: "Liefergebiete", yol: "Navigationspfad" },
  fr: { ilceler: "Arrondissements d'Istanbul", mahalleler: (d) => `Quartiers de ${d}`, ustEtiket: "Zones de livraison", yol: "Fil d'Ariane" },
  nl: { ilceler: "Districten van Istanbul", mahalleler: (d) => `Wijken van ${d}`, ustEtiket: "Bezorggebieden", yol: "Kruimelpad" },
  it: { ilceler: "Distretti di Istanbul", mahalleler: (d) => `Quartieri di ${d}`, ustEtiket: "Zone di consegna", yol: "Percorso" },
  es: { ilceler: "Distritos de Estambul", mahalleler: (d) => `Barrios de ${d}`, ustEtiket: "Zonas de entrega", yol: "Ruta de navegación" },
  pt: { ilceler: "Distritos de Istambul", mahalleler: (d) => `Bairros de ${d}`, ustEtiket: "Áreas de entrega", yol: "Caminho" },
  az: { ilceler: "İstanbulun rayonları", mahalleler: (d) => `${d} məhəllələri`, ustEtiket: "Çatdırılma bölgələri", yol: "Naviqasiya" },
  ru: { ilceler: "Районы Стамбула", mahalleler: (d) => `Кварталы района ${d}`, ustEtiket: "Зоны доставки", yol: "Навигация" },
  ar: { ilceler: "مناطق إسطنبول", mahalleler: (d) => `أحياء ${d}`, ustEtiket: "مناطق التوصيل", yol: "مسار التنقل" },
  zh: { ilceler: "伊斯坦布尔各区", mahalleler: (d) => `${d}的街区`, ustEtiket: "配送区域", yol: "导航路径" },
  ja: { ilceler: "イスタンブールの地区", mahalleler: (d) => `${d}の町名`, ustEtiket: "配達エリア", yol: "パンくずリスト" },
  ko: { ilceler: "이스탄불의 구", mahalleler: (d) => `${d}의 동네`, ustEtiket: "배송 지역", yol: "경로" },
};

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
    <nav aria-label={T[locale].yol} className="mb-4 text-[13px] text-[#6B7280]">
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
 * Lokasyon kartı ızgarası — İstanbul kökünde ilçeler, ilçe sayfasında mahalleler.
 * Link çöplüğü değil: mevcut kart dili (beyaz kart, ince mor kenarlık, hover).
 */
export function LocationGrid({
  locale,
  baseHref,
  items,
  title,
}: {
  locale: GlobalLocale;
  /** "/ru/istanbul" veya "/ru/istanbul/kadikoy" */
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
            {T[locale].ustEtiket}
          </p>
          <h2 className="mt-1 text-[19px] font-semibold text-[#1C0838]">{title}</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`${baseHref}/${it.slug}`}
            className="truncate rounded-[14px] border border-[#EDE9FE] bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-[#111827] transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:text-[#6D28D9] hover:shadow-[0_8px_20px_rgba(124,58,237,0.10)]"
          >
            {it.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ilceBasligi(locale: GlobalLocale): string {
  return T[locale].ilceler;
}
export function mahalleBasligi(locale: GlobalLocale, districtName: string): string {
  return T[locale].mahalleler(districtName);
}
