"use client";

/**
 * LanguageSelector — Figma Version 117 görünümü (yalnız tasarım alındı; davranış production).
 *  Desktop (lg+): compact pill (bayrak + kod + caret) → 320px floating panel, 2 sütun, 14 dil,
 *                 aktif lila highlight + ✓. Dış tık / Escape kapatır. Panel body'ye portal edilir
 *                 (sticky header'ın z-50 stacking context'i altında kalmasın).
 *  Mobile:        bayrak butonu → alttan bottom sheet (mevcut Radix Sheet primitive; focus trap,
 *                 Escape, overlay), drag handle, 14 dil dikey liste, min 52px satır, ✓.
 *  Bayrak emoji desteklenmeyen platformda (Windows) harf çifti çizilir → kod rozeti gösterilir.
 *  Dil değişimi = setLocale (cookie + sözlük + html[lang/dir]). Sepet/adres/slot DOKUNULMAZ.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";

let flagSupportCache: boolean | null = null;
/** Bayrak emoji gerçekten renkli çiziliyor mu? (Windows: siyah harf çifti → false) */
function detectFlagEmoji(): boolean {
  if (flagSupportCache != null) return flagSupportCache;
  try {
    const c = document.createElement("canvas");
    c.width = 32; c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return (flagSupportCache = false);
    ctx.font = "24px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("🇹🇷", 0, 0);
    const d = ctx.getImageData(0, 0, 32, 32).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) return (flagSupportCache = true);
    }
    return (flagSupportCache = false);
  } catch {
    return (flagSupportCache = false);
  }
}

function Flag({ flag, code, size }: { flag: string; code: string; size: "sm" | "md" | "lg" }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { setOk(detectFlagEmoji()); }, []);
  const px = size === "sm" ? 16 : size === "md" ? 18 : 24;
  if (ok === false) {
    return (
      <span
        aria-hidden
        dir="ltr"
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/[0.10] font-extrabold uppercase text-[#6D28D9]"
        style={{ width: px + 6, height: px + 6, fontSize: Math.round(px * 0.42), letterSpacing: "0.02em" }}
      >
        {code}
      </span>
    );
  }
  return <span aria-hidden className="shrink-0 leading-none" style={{ fontSize: px }}>{flag}</span>;
}

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (btnRef.current?.contains(tgt) || panelRef.current?.contains(tgt)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // GLOBAL 14-dil (kanun §10): dil seçimi yalnız sunum cookie'si DEĞİL —
  // hedef dilin public vitrini HAZIRSA (approved home) gerçek locale rotasına gider.
  //  1) Sayfadaki hreflang cluster'ında hedef dilin karşılığı varsa → o URL
  //     (core ID/translation cluster; slug tahmini yok).
  //  2) Yoksa hedef dil available-locales'taysa → /<locale> anasayfası.
  //  3) Vitrin hazır değilse → mevcut davranış (yalnız sunum çevirisi).
  // TR: locale path'indeysek TR karşılık = hreflang tr yoksa ana sayfa.
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/global/available-locales', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((b) => setAvailableLocales(Array.isArray(b.data) ? b.data : []))
      .catch(() => {});
  }, []);
  const pick = (code: Locale) => {
    setOpen(false); setSheetOpen(false);
    const onLocalePath = /^\/(de|en|fr|nl|it|es|pt|az|ru|ar|zh|ja|ko)(?:\/|$)/.test(window.location.pathname);
    if (code === 'tr') {
      setLocale(code);
      if (onLocalePath) window.location.assign('/');
      return;
    }
    const alt = document.querySelector(`link[rel="alternate"][hreflang="${code}"]`) as HTMLLinkElement | null;
    if (alt?.href) { setLocale(code); window.location.assign(alt.href); return; }
    if (availableLocales.includes(code)) { setLocale(code); window.location.assign(`/${code}`); return; }
    setLocale(code); // vitrin hazır değil: mevcut sunum-çevirisi davranışı
  };

  const panel = open && pos && typeof document !== "undefined" ? createPortal(
    <div
      ref={panelRef}
      role="listbox"
      aria-label={t("lang.title")}
      dir="ltr"
      style={{ position: "fixed", top: pos.top, right: pos.right }}
      className="z-[9999] w-[320px] rounded-[20px] border border-[#8B5CF6]/15 bg-white p-5 pt-6 shadow-[0_8px_40px_rgba(0,0,0,0.10),0_2px_8px_rgba(139,92,246,0.08)]"
    >
      <h3 className="m-0 mb-1 text-[15px] font-bold text-[#1C0838]">{t("lang.title")}</h3>
      <p className="m-0 mb-4 text-[12px] leading-[1.5] text-[#6B7280]">{t("lang.subtitle")}</p>
      <div className="mb-3.5 h-px bg-[#8B5CF6]/[0.08]" />
      <div className="grid grid-cols-2 gap-0.5">
        {LOCALES.map((l) => {
          const active = l.code === locale;
          return (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={active}
              lang={l.code}
              onClick={() => pick(l.code)}
              className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] ${
                active ? "bg-[#8B5CF6]/[0.09]" : "hover:bg-[#8B5CF6]/[0.04]"
              }`}
            >
              <Flag flag={l.flag} code={l.code} size="md" />
              <span className={`flex-1 truncate text-[12.5px] ${active ? "font-semibold text-[#7C3AED]" : "font-normal text-[#374151]"}`}>{l.name}</span>
              {active && <span className="shrink-0 text-[11px] font-bold text-[#8B5CF6]" aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {/* ── Desktop: pill + (portal) floating panel ── */}
      <div className="relative hidden lg:block">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t("lang.aria")}
          dir="ltr"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-[7px] pl-[9px] text-[11px] font-bold tracking-[0.04em] text-[#374151] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] ${
            open ? "border-[#8B5CF6]/35 bg-[#8B5CF6]/[0.07]" : "border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.02] hover:bg-[#8B5CF6]/[0.05]"
          }`}
        >
          <Flag flag={current.flag} code={current.code} size="sm" />
          <span className="uppercase">{current.code}</span>
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden className={`ml-px transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="M1 1l3 3.5L7 1" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {panel}
      </div>

      {/* ── Mobile: flag button + bottom sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={t("lang.aria")}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 hover:bg-[#F5F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] lg:hidden"
          >
            <Flag flag={current.flag} code={current.code} size="md" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-[28px] border-0 bg-white p-0 shadow-2xl outline-none [&>button:last-child]:hidden">
          <div className="flex justify-center pb-1 pt-3" aria-hidden>
            <div className="h-1 w-9 rounded-full bg-gray-200" />
          </div>
          <div className="px-5 pb-3 pt-2">
            <SheetTitle className="mb-1 text-[17px] font-bold text-[#1C0838]">{t("lang.title")}</SheetTitle>
            <p className="text-xs leading-relaxed text-gray-500">{t("lang.subtitle")}</p>
          </div>
          <div className="mx-5 h-px bg-[#8B5CF6]/[0.08]" />
          <div role="listbox" aria-label={t("lang.title")} className="overflow-y-auto overflow-x-hidden pb-[max(12px,env(safe-area-inset-bottom))]">
            {LOCALES.map((l) => {
              const active = l.code === locale;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  lang={l.code}
                  onClick={() => pick(l.code)}
                  className={`flex min-h-[52px] w-full items-center gap-3 px-5 py-[13px] text-start transition-colors ${active ? "bg-[#8B5CF6]/[0.07]" : "active:bg-[#8B5CF6]/[0.05]"}`}
                >
                  <Flag flag={l.flag} code={l.code} size="lg" />
                  <span className={`flex-1 text-[15px] ${active ? "font-semibold text-[#7C3AED]" : "font-normal text-[#374151]"}`}>{l.name}</span>
                  {active && <span className="text-[16px] font-bold text-[#8B5CF6]" aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
