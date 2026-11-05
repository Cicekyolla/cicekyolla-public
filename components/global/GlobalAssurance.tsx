// ============================================================================
// GLOBAL — SATIŞ ODAKLI GÜVENCE BLOĞU (C2, 5 Kas 2026, ADDITIVE).
// Hook YOK → hem sunucu (İstanbul ticari sayfası) hem istemci (ürün sayfası güven paneli) içinden çizilir.
// Metin + şartlı maddeler: lib/global/assuranceCopy.ts. Yalnız 13 global dilde kullanılır; TR sayfaları değişmez.
// ============================================================================
import type { GlobalLocale } from "@/lib/global/config";
import { ASSURANCE, assuranceItems, assuranceWaHref } from "@/lib/global/assuranceCopy";

const RTL: ReadonlySet<GlobalLocale> = new Set<GlobalLocale>(["ar"]);

/** Madde listesi (başlık + tek cümle). Telefonlar her dilde soldan sağa (bdi). */
export function GlobalAssuranceList({ locale, sameDay = true, compact = false }: {
  locale: GlobalLocale; sameDay?: boolean; compact?: boolean;
}) {
  const items = assuranceItems(locale, { sameDay });
  const last = items.length - 1;
  return (
    <ul data-assurance-items={items.length} className={compact ? "space-y-3" : "grid gap-x-8 gap-y-5 sm:grid-cols-2"}>
      {items.map(([title, text], i) => (
        <li key={title} className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F1EAF9] text-[11px] font-bold text-[#7445A0]">✓</span>
          <div>
            <p className={`${compact ? "text-[13px]" : "text-[14.5px]"} font-semibold leading-snug text-[#2E2437]`}>{title}</p>
            <p className={`${compact ? "text-[12.5px] leading-5" : "text-[13.5px] leading-6"} mt-0.5 text-[#71667C]`}>
              {i === last ? <bdi dir="ltr" style={{ unicodeBidi: "isolate" }}>{text}</bdi> : text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** İstanbul ticari sayfası bölümü: başlık + giriş + 7 madde + 2 düğme. */
export function GlobalAssuranceSection({ locale, shopHref = "#products" }: { locale: GlobalLocale; shopHref?: string }) {
  const c = ASSURANCE[locale];
  return (
    <section
      data-global-assurance
      dir={RTL.has(locale) ? "rtl" : "ltr"}
      aria-labelledby="global-assurance-title"
      className="my-10 rounded-[28px] border border-[#EAE4F1] bg-[linear-gradient(145deg,#FCFBF8_0%,#F8F5FC_55%,#F2ECFA_100%)] px-6 py-8 md:px-10"
    >
      <h2
        id="global-assurance-title"
        className="max-w-2xl text-[24px] font-semibold leading-tight text-[#24182F] md:text-[28px]"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
      >
        {c.title}
      </h2>
      <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-[#71667C]">{c.intro}</p>
      <div className="mt-7"><GlobalAssuranceList locale={locale} /></div>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={shopHref} className="inline-flex items-center rounded-full bg-[#7C3AED] px-6 py-3 text-[14px] font-semibold text-white no-underline hover:bg-[#6D28D9]">
          {c.ctaShop}
        </a>
        <a
          href={assuranceWaHref(locale)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full border border-[#D9CDEA] bg-white px-6 py-3 text-[14px] font-semibold text-[#5C3A73] no-underline hover:border-[#7C3AED]"
        >
          {c.ctaWa}
        </a>
      </div>
    </section>
  );
}
