"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";

/* Çiçeksepeti-tarzı filtre çubuğu — GERÇEK backend filtreleri (/api/products):
   product_type, same_day_available, is_bestseller, is_new, sort.
   URL searchParams ile çalışır → SSR (SEO dostu). Sahte filtre YOK. */

const PRODUCT_TYPES = [
  { key: "", label: "Tümü" },
  { key: "flower", label: "Çiçek" },
  { key: "plant", label: "Bitki" },
  { key: "wreath", label: "Çelenk" },
  { key: "artificial", label: "Yapay" },
  { key: "gift", label: "Hediye" },
  { key: "service", label: "Servis" },
] as const;

const SORTS = [
  { key: "created_at_desc", label: "Önerilen Sıralama" },
  { key: "price_asc", label: "Artan Fiyat" },
  { key: "price_desc", label: "Azalan Fiyat" },
  { key: "name_asc", label: "A → Z" },
] as const;

export function FilterBar({ categories = [] }: { categories?: { name: string; href: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState<null | "cat" | "type" | "sort">(null);
  const [catQuery, setCatQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(Array.from(sp.entries()));
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      next.delete("page"); // filtre değişince 1. sayfaya dön
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setOpen(null);
    },
    [router, pathname, sp],
  );

  const toggleParam = useCallback(
    (key: string) => setParam(key, sp.get(key) ? null : "1"),
    [sp, setParam],
  );

  const clearQuickFilters = useCallback(() => {
    const next = new URLSearchParams(Array.from(sp.entries()));
    ["bestseller", "new", "same_day", "page"].forEach((key) => next.delete(key));
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, sp]);

  const curType = sp.get("type") ?? "";
  const curSort = sp.get("sort") ?? "created_at_desc";
  const typeLabel = PRODUCT_TYPES.find((t) => t.key === curType)?.label ?? "Ürün Tipi";
  const sortLabel = SORTS.find((s) => s.key === curSort)?.label ?? "Sıralama";

  const pill = "flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold border transition-all whitespace-nowrap";
  const idle = "bg-white text-[#5B6472] border-[#E8E2F5] hover:border-[#C4B5FD] hover:text-[#7C3AED]";
  const active = "text-white border-[#8B5CF6] bg-gradient-to-r from-[#7C3AED] to-[#A855F7] shadow-[0_6px_18px_rgba(124,58,237,0.24)]";
  const hasQuickFilter = Boolean(sp.get("bestseller") || sp.get("new") || sp.get("same_day"));

  return (
    <div ref={rootRef} className="border-b border-black/[0.05] bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14 py-4 flex items-center gap-2.5 flex-wrap">
        <button onClick={clearQuickFilters} className={`${pill} ${!hasQuickFilter ? active : idle}`}>
          Tümü
        </button>
        <button onClick={() => toggleParam("bestseller")} className={`${pill} ${sp.get("bestseller") ? active : idle}`}>
          Çok Satan
        </button>
        <button onClick={() => toggleParam("new")} className={`${pill} ${sp.get("new") ? active : idle}`}>
          Yeni
        </button>
        <button onClick={() => toggleParam("same_day")} className={`${pill} ${sp.get("same_day") ? active : idle}`}>
          Aynı Gün
        </button>
        {/* Kategori dropdown (CANLI alt kategoriler — Çiçeksepeti deseni, aramalı) */}
        {categories.length > 0 && (
          <div className="relative">
            <button onClick={() => setOpen(open === "cat" ? null : "cat")} className={`${pill} ${idle}`}>
              Kategori
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {open === "cat" && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] overflow-hidden z-20">
                <div className="p-2.5 border-b border-black/[0.05]">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    <input
                      value={catQuery}
                      onChange={(e) => setCatQuery(e.target.value)}
                      placeholder="Ara"
                      className="w-full pl-9 pr-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[13px] focus:outline-none focus:border-[#C4B5FD]"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto py-1.5">
                  {categories
                    .filter((c) => c.name.toLocaleLowerCase("tr").includes(catQuery.trim().toLocaleLowerCase("tr")))
                    .map((c) => (
                      <button
                        key={c.href}
                        onClick={() => { router.push(c.href); setOpen(null); setCatQuery(""); }}
                        className="w-full text-left px-4 py-2.5 text-[13.5px] text-[#374151] hover:bg-[#F5F3FF] hover:text-[#7C3AED] transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ürün Tipi dropdown */}
        <div className="relative">
          <button onClick={() => setOpen(open === "type" ? null : "type")} className={`${pill} ${curType ? active : idle}`}>
            {curType ? typeLabel : "Ürün Tipi"}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {open === "type" && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] overflow-hidden z-20 py-1.5">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setParam("type", t.key || null)}
                  className={`w-full text-left px-4 py-2.5 text-[13.5px] transition-colors ${curType === t.key ? "text-[#7C3AED] font-semibold bg-[#F5F3FF]" : "text-[#374151] hover:bg-[#F9FAFB]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sırala dropdown (sağa yasla) */}
        <div className="relative ml-auto">
          <button onClick={() => setOpen(open === "sort" ? null : "sort")} className={`${pill} ${idle}`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M6 12h12M9 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Sırala: {sortLabel}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {open === "sort" && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] overflow-hidden z-20 py-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setParam("sort", s.key === "created_at_desc" ? null : s.key)}
                  className={`w-full text-left px-4 py-2.5 text-[13.5px] transition-colors ${curSort === s.key ? "text-[#7C3AED] font-semibold bg-[#F5F3FF]" : "text-[#374151] hover:bg-[#F9FAFB]"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
