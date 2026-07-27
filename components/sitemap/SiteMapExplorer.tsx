"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarHeart,
  ChevronRight,
  Flower2,
  MapPin,
  PackageSearch,
  Search,
  Sparkles,
  Tags,
  Truck,
  X,
} from "lucide-react";
import type { SeoInventoryItem, SeoInventoryPageType } from "@/lib/api";

type GroupKey =
  | "all"
  | "category"
  | "product"
  | "special_day"
  | "city"
  | "district"
  | "neighborhood"
  | "delivery";

const GROUPS: Array<{
  key: GroupKey;
  label: string;
  eyebrow: string;
  types: SeoInventoryPageType[];
  icon: typeof Flower2;
}> = [
  { key: "all", label: "Tüm sayfalar", eyebrow: "Canlı envanter", types: [], icon: Sparkles },
  { key: "category", label: "Koleksiyonlar", eyebrow: "Kategoriler", types: ["category", "category_location"], icon: Tags },
  { key: "product", label: "Ürünler", eyebrow: "Canlı katalog", types: ["product", "product_location"], icon: PackageSearch },
  { key: "special_day", label: "Özel Günler", eyebrow: "Anlamlı anlar", types: ["special_day"], icon: CalendarHeart },
  { key: "city", label: "İller", eyebrow: "Türkiye", types: ["city"], icon: MapPin },
  { key: "district", label: "İlçeler", eyebrow: "Yerel teslimat", types: ["district"], icon: MapPin },
  { key: "neighborhood", label: "Mahalleler", eyebrow: "Yakınınızdaki çiçekçi", types: ["neighborhood"], icon: MapPin },
  { key: "delivery", label: "Teslimat", eyebrow: "Hizmet bölgeleri", types: ["delivery_info"], icon: Truck },
];

function fallbackTitle(item: SeoInventoryItem) {
  const lastPart = item.url_path.split("/").filter(Boolean).pop() ?? "Cicekyolla";
  return lastPart
    .split("-")
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
    .join(" ");
}

export function SiteMapExplorer({ items }: { items: SeoInventoryItem[] }) {
  const [activeGroup, setActiveGroup] = useState<GroupKey>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

  const counts = useMemo(() => {
    const result = new Map<GroupKey, number>();
    GROUPS.forEach((group) => {
      result.set(
        group.key,
        group.key === "all"
          ? items.length
          : items.filter((item) => group.types.includes(item.page_type)).length,
      );
    });
    return result;
  }, [items]);

  const visibleItems = useMemo(() => {
    const group = GROUPS.find((entry) => entry.key === activeGroup) ?? GROUPS[0];
    return items.filter((item) => {
      const inGroup = group.key === "all" || group.types.includes(item.page_type);
      if (!inGroup) return false;
      if (!normalizedQuery) return true;
      const haystack = `${item.title ?? ""} ${item.url_path}`.toLocaleLowerCase("tr-TR");
      return haystack.includes(normalizedQuery);
    });
  }, [activeGroup, items, normalizedQuery]);

  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-14">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GROUPS.slice(1).map((group) => {
          const Icon = group.icon;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroup(group.key)}
              className="group flex min-h-28 items-center justify-between rounded-3xl border border-[#EDE9FE] bg-white p-5 text-left shadow-[0_16px_50px_rgba(76,29,149,0.06)] transition hover:-translate-y-0.5 hover:border-[#C4B5FD]"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8B5CF6]">
                  {group.eyebrow}
                </span>
                <p className="mt-2 text-lg font-black text-[#160B2E]">{group.label}</p>
                <p className="mt-1 text-sm text-[#7C718F]">{counts.get(group.key) ?? 0} canlı sayfa</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED] transition group-hover:bg-[#7C3AED] group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 rounded-[32px] border border-[#E9E2F5] bg-white p-4 shadow-[0_24px_80px_rgba(34,12,74,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[#F0EBF7] pb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B7FA2]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün, kategori, özel gün veya teslimat bölgesi ara..."
              className="h-14 w-full rounded-2xl border border-[#DED5EC] bg-[#FCFBFE] pl-12 pr-12 text-sm text-[#160B2E] outline-none transition placeholder:text-[#9B90AD] focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Aramayı temizle"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8B7FA2] hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroup(group.key)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  activeGroup === group.key
                    ? "bg-[#6D28D9] text-white shadow-[0_8px_22px_rgba(109,40,217,0.25)]"
                    : "border border-[#E5DDF0] bg-white text-[#5F5470] hover:border-[#A78BFA] hover:text-[#6D28D9]"
                }`}
              >
                {group.label} <span className="ml-1 opacity-70">{counts.get(group.key) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length > 0 ? (
          <div className="grid gap-x-8 px-1 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => (
              <Link
                key={`${item.page_type}:${item.url_path}`}
                href={item.url_path}
                className="group flex min-h-16 items-center justify-between border-b border-[#F2EDF7] py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[#24143F] transition group-hover:text-[#6D28D9]">
                    {item.title?.trim() || fallbackTitle(item)}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-[#9B90AD]">{item.url_path}</span>
                </span>
                <ChevronRight className="ml-3 h-4 w-4 flex-none text-[#C4B5FD] transition group-hover:translate-x-1 group-hover:text-[#7C3AED]" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F5F3FF] text-[#7C3AED]">
              <Search className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-xl font-black text-[#160B2E]">Eşleşen canlı sayfa bulunamadı</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#7C718F]">
              Arama ifadenizi değiştirin veya başka bir sayfa grubuna geçin.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
