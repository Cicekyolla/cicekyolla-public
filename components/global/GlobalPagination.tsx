// ============================================================================
// GLOBAL lokasyon kataloğu — sayfalama navigasyonu (Server Component; JS yükü yok, kütüphane yok).
// Model saf modülden gelir (lib/global/locationPaging.ts locationPagination): gerçek <a href>,
// canonical sorgusuz yol + mevcut ?category korunur, page=1 yazılmaz → taranabilir.
//   Önceki · 1 … p-1 p p+1 … son · Sonraki   (en çok 7 numara öğesi → mobilde TEK satır)
// Tek sayfada model null → navigasyon basılmaz. Etkin sayfa aria-current="page".
// Etiketler 13 dilde LOCATION_PAGING_LABELS; oklar RTL'de (ar) aynalanır.
// prefetch kapalı: dinamik (force-dynamic) sayfa linklerinin görünümde toplu ön-yüklemesi sunucu
// çağrısı üretmesin; tıklamada normal istemci geçişi.
// ============================================================================
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GlobalLocale } from "@/lib/global/config";
import { LOCATION_PAGING_LABELS, locationPageLabel, type LocationPagination } from "@/lib/global/locationPaging";

const BASE =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-[13px] font-semibold transition sm:h-9 sm:min-w-9";
const IDLE = "border-[#EDE9FE] bg-white text-[#4B5563] hover:border-[#8B5CF6] hover:text-[#6D28D9]";
const CURRENT = "border-[#8B5CF6] bg-[#8B5CF6] text-white";
const OFF = "border-[#F3F0FB] bg-white text-[#C4C0D4]";

export function GlobalPagination({ locale, pagination }: { locale: GlobalLocale; pagination: LocationPagination | null }) {
  if (!pagination) return null;
  const l = LOCATION_PAGING_LABELS[locale];
  const prevInner = (
    <>
      <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
      <span className="sr-only sm:not-sr-only">{l.prev}</span>
    </>
  );
  const nextInner = (
    <>
      <span className="sr-only sm:not-sr-only">{l.next}</span>
      <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
    </>
  );
  return (
    <nav aria-label={l.nav} className="mt-8" data-catalog-pagination>
      {/* Tek satır: sarma yok; çok dar ekranda yalnız bu şerit kayar (sayfa gövdesi yatay kaymaz). */}
      <ul className="mx-auto flex w-max max-w-full items-center gap-1 overflow-x-auto pb-1 sm:gap-1.5">
        <li className="shrink-0">
          {pagination.prevHref ? (
            <Link href={pagination.prevHref} rel="prev" prefetch={false} className={`${BASE} ${IDLE} gap-1 sm:px-3`}>
              {prevInner}
            </Link>
          ) : (
            <span aria-disabled="true" className={`${BASE} ${OFF} gap-1 sm:px-3`}>
              {prevInner}
            </span>
          )}
        </li>
        {pagination.items.map((it) =>
          it.kind === "gap" ? (
            <li key={it.key} aria-hidden="true" className="shrink-0 px-0.5 text-[13px] text-[#9CA3AF]">
              …
            </li>
          ) : (
            <li key={it.page} className="shrink-0">
              <Link
                href={it.href}
                prefetch={false}
                aria-label={locationPageLabel(locale, it.page)}
                aria-current={it.current ? "page" : undefined}
                className={`${BASE} ${it.current ? CURRENT : IDLE}`}
              >
                {it.page}
              </Link>
            </li>
          ),
        )}
        <li className="shrink-0">
          {pagination.nextHref ? (
            <Link href={pagination.nextHref} rel="next" prefetch={false} className={`${BASE} ${IDLE} gap-1 sm:px-3`}>
              {nextInner}
            </Link>
          ) : (
            <span aria-disabled="true" className={`${BASE} ${OFF} gap-1 sm:px-3`}>
              {nextInner}
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
