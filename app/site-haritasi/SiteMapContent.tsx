"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, CalendarHeart, Flower2, MapPin, Search, Truck, X } from "lucide-react";
import type { SiteMapCategory } from "@/app/api/site-map/route";

const ICONS = {
  "Koleksiyonlar": Flower2,
  "Gönderim Amacına Göre": CalendarHeart,
  "Özel Günler": CalendarHeart,
  "Teslimat Bölgeleri": Truck,
  "Bilgi Sayfaları": BookOpen,
} as const;

export function SiteMapContent({ categories }: { categories: SiteMapCategory[] }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const visible = useMemo(
    () => categories.filter((item) => !normalized || `${item.title} ${item.desc} ${item.section}`.toLocaleLowerCase("tr-TR").includes(normalized)),
    [categories, normalized],
  );
  const sections = useMemo(() => {
    const grouped = new Map<string, SiteMapCategory[]>();
    visible.forEach((item) => grouped.set(item.section, [...(grouped.get(item.section) ?? []), item]));
    return Array.from(grouped.entries());
  }, [visible]);

  return (
    <>
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B7FA2]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kategori, özel gün, teslimat bölgesi veya bilgi sayfası ara..." className="h-14 w-full rounded-2xl border border-[#DED5EC] bg-white pl-12 pr-12 text-sm text-[#160B2E] outline-none focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/10" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Aramayı temizle" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#8B7FA2] hover:bg-[#F5F3FF]"><X className="h-4 w-4" /></button>}
      </div>

      {sections.length ? <div className="space-y-10">
        {sections.map(([sectionName, items]) => {
          const Icon = ICONS[sectionName as keyof typeof ICONS] ?? MapPin;
          return (
            <section key={sectionName} className="rounded-[28px] border border-[#E9E2F5] bg-white p-6 shadow-[0_20px_60px_rgba(34,12,74,0.07)] md:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-xl font-black text-[#24143F]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]"><Icon className="h-5 w-5" /></span>
                {sectionName}
                <span className="text-sm font-medium text-[#8B7FA2]">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const href = item.isPage ? `/${item.slug}` : `/kategori/${item.slug}`;
                  return (
                    <Link key={`${item.section}:${item.title}`} href={href} className="group block rounded-2xl border border-[#EEE8F5] bg-[#FCFBFE] p-5 transition hover:-translate-y-0.5 hover:border-[#C4B5FD] hover:bg-[#F8F5FF]">
                      <h3 className="font-bold text-[#24143F] transition group-hover:text-[#6D28D9]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#716680]">{item.desc}</p>
                      <span className="mt-3 block truncate text-xs font-semibold text-[#8B5CF6]">{href} →</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div> : <div className="rounded-[28px] border border-[#E9E2F5] bg-white p-12 text-center"><Search className="mx-auto h-8 w-8 text-[#8B5CF6]" /><h2 className="mt-4 text-xl font-black text-[#24143F]">Eşleşen bağlantı bulunamadı</h2><p className="mt-2 text-sm text-[#716680]">Arama ifadenizi değiştirerek tekrar deneyin.</p></div>}
    </>
  );
}
