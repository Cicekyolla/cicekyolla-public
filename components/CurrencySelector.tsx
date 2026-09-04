"use client";

/**
 * CurrencySelector — LanguageSelector'ın kardeşi.
 *
 * TASARIM: Version 72 / Figma 117 ailesi birebir. Aynı pill yüksekliği, aynı
 * lila tonları (#8B5CF6), aynı caret, aynı focus ring, aynı bottom sheet.
 * Header'da dil seçicinin HEMEN YANINDA:  TR ▼   ₺ TRY ▼
 * Yeni bir tasarım dili GETİRİLMEZ.
 *
 * Kur alınamıyorsa (available = ["TRY"]) seçici HİÇ RENDER EDİLMEZ — müşteriye
 * seçemeyeceği bir para birimi gösterilmez, header bugünkü gibi kalır.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import { CURRENCIES, useCurrency, type Currency } from "@/lib/currency";

export function CurrencySelector() {
  const t = useT();
  const { currency, available, setCurrency, ready, source } = useCurrency();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const options = CURRENCIES.filter((c) => available.includes(c.code));
  const current = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

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

  // Kur yüklenmeden veya tek seçenek varken seçici gösterilmez.
  if (!ready || options.length < 2) return null;

  const pick = (code: Currency) => {
    setOpen(false);
    setSheetOpen(false);
    setCurrency(code);
  };

  const rows = (size: "panel" | "sheet") =>
    options.map((c) => {
      const active = c.code === currency;
      return (
        <button
          key={c.code}
          type="button"
          role="option"
          aria-selected={active}
          dir="ltr"
          onClick={() => pick(c.code)}
          className={
            size === "panel"
              ? `flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] ${
                  active ? "bg-[#8B5CF6]/[0.09]" : "hover:bg-[#8B5CF6]/[0.04]"
                }`
              : `flex min-h-[52px] w-full items-center gap-3 px-5 py-[13px] text-start transition-colors ${
                  active ? "bg-[#8B5CF6]/[0.07]" : "active:bg-[#8B5CF6]/[0.05]"
                }`
          }
        >
          <span
            aria-hidden
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/[0.10] font-extrabold text-[#6D28D9]"
            style={{ width: size === "panel" ? 24 : 30, height: size === "panel" ? 24 : 30, fontSize: size === "panel" ? 13 : 16 }}
          >
            {c.symbol}
          </span>
          <span className={size === "panel" ? "flex-1 truncate text-[12.5px]" : "flex-1 text-[15px]"}>
            <span className={active ? "font-semibold text-[#7C3AED]" : "font-normal text-[#374151]"}>{c.label}</span>
            <span className="ml-1.5 text-[#9CA3AF]">{c.name}</span>
          </span>
          {active && <span className="shrink-0 text-[11px] font-bold text-[#8B5CF6]" aria-hidden>✓</span>}
        </button>
      );
    });

  /** Panel altı not: kurun gösterim amaçlı olduğunu ve tahsilatın TRY olduğunu söyler. */
  const note = (
    <p className="text-[11px] leading-[1.5] text-[#9CA3AF]">
      {t("currency.rateNote", { source: source ?? "TCMB" })}
    </p>
  );

  const panel = open && pos && typeof document !== "undefined" ? createPortal(
    <div
      ref={panelRef}
      role="listbox"
      aria-label={t("currency.aria")}
      dir="ltr"
      style={{ position: "fixed", top: pos.top, right: pos.right }}
      className="z-[9999] w-[288px] rounded-[20px] border border-[#8B5CF6]/15 bg-white p-5 pt-6 shadow-[0_8px_40px_rgba(0,0,0,0.10),0_2px_8px_rgba(139,92,246,0.08)]"
    >
      <h3 className="m-0 mb-1 text-[15px] font-bold text-[#1C0838]">{t("currency.title")}</h3>
      <p className="m-0 mb-4 text-[12px] leading-[1.5] text-[#6B7280]">{t("currency.subtitle")}</p>
      <div className="mb-3.5 h-px bg-[#8B5CF6]/[0.08]" />
      <div className="grid gap-0.5">{rows("panel")}</div>
      <div className="mt-3.5 border-t border-[#8B5CF6]/[0.08] pt-3">{note}</div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {/* ── Desktop: pill + (portal) floating panel — dil seçiciyle aynı aile ── */}
      <div className="relative hidden lg:block">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t("currency.aria")}
          dir="ltr"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-[7px] pl-[9px] text-[11px] font-bold tracking-[0.04em] text-[#374151] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] ${
            open ? "border-[#8B5CF6]/35 bg-[#8B5CF6]/[0.07]" : "border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.02] hover:bg-[#8B5CF6]/[0.05]"
          }`}
        >
          <span aria-hidden className="text-[13px] leading-none text-[#6D28D9]">{current.symbol}</span>
          <span className="uppercase">{current.label}</span>
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden className={`ml-px transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="M1 1l3 3.5L7 1" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {panel}
      </div>

      {/* ── Mobile: sembol butonu + bottom sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={t("currency.aria")}
            dir="ltr"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold text-[#6D28D9] transition-all duration-200 hover:bg-[#F5F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] lg:hidden"
          >
            {current.symbol}
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-[28px] border-0 bg-white p-0 shadow-2xl outline-none [&>button:last-child]:hidden">
          <div className="flex justify-center pb-1 pt-3" aria-hidden>
            <div className="h-1 w-9 rounded-full bg-gray-200" />
          </div>
          <div className="px-5 pb-3 pt-2">
            <SheetTitle className="mb-1 text-[17px] font-bold text-[#1C0838]">{t("currency.title")}</SheetTitle>
            <p className="text-xs leading-relaxed text-gray-500">{t("currency.subtitle")}</p>
          </div>
          <div className="mx-5 h-px bg-[#8B5CF6]/[0.08]" />
          <div role="listbox" aria-label={t("currency.title")} className="overflow-y-auto overflow-x-hidden">
            {rows("sheet")}
          </div>
          <div className="px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">{note}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
