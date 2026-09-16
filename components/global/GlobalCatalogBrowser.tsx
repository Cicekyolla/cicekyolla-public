"use client";

// ============================================================================
// GLOBAL lokasyon kataloğu — kategori çipleriyle süzülen ürün ızgarası.
// Veri sunucuda çözülür (API /api/public/global/catalog → planLocationPage):
//   • "Tümü": bu lokasyona teslim edilebilir katalogun TAMAMI, her ürün bir kez
//     (önce vitrin öne çıkanları, sonra katalog sırası) — SSR HTML'de tüm ürün linkleri.
//   • Kategori çipi: o kategorinin GERÇEK Product Center bağlı ürünleri, Global Merkezi
//     sırasıyla (çok kategorili ürün bağlı olduğu HER çipte görünür; teslimat süzmesi
//     sırayı bozmaz). Kartlar TR mağazasıyla aynı ProductCard.
// Ürün başına istek yok; filtre yalnız istemcide id listesi seçer. Giriş animasyonu gecikmesi TR
// CategoryProductGrid standardıyla sınırlı (Math.min(idx, 7)) — 100+ kartta kart başına saniyelerce bekleme yok.
// ============================================================================
import { useMemo, useState } from "react";
import { ProductCard, type Product } from "@/components/home/ProductCard";

export interface CatalogBrowserItem { id: number; href: string; card: Product }
export interface CatalogBrowserCategory { slug: string; name: string; ids: number[] }

export function GlobalCatalogBrowser({ items, allOrder, categories, allLabel }: {
  items: CatalogBrowserItem[];
  allOrder: number[];
  categories: CatalogBrowserCategory[];
  allLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const ids = active ? categories.find((c) => c.slug === active)?.ids ?? [] : allOrder;
  const shown = ids.map((id) => byId.get(id)).filter((x): x is CatalogBrowserItem => !!x);
  const chip = (key: string | null, label: string, count: number) => {
    const on = active === key;
    return (
      <button
        key={key ?? "__all"}
        type="button"
        aria-pressed={on}
        data-catalog-chip={key ?? "all"}
        onClick={() => setActive(key)}
        className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${on ? "border-[#8B5CF6] bg-[#F5F3FF] text-[#6D28D9]" : "border-[#EDE9FE] bg-white text-[#4B5563] hover:border-[#8B5CF6]"}`}
      >
        {label} <span className="font-normal text-[#8B5CF6]">{count}</span>
      </button>
    );
  };
  return (
    <div data-global-catalog>
      <div className="mb-4 flex flex-wrap gap-2">
        {chip(null, allLabel, allOrder.length)}
        {categories.filter((c) => c.ids.length > 0).map((c) => chip(c.slug, c.name, c.ids.length))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4" data-catalog-grid={active ?? "all"}>
        {shown.map((it, idx) => (
          <ProductCard key={`${active ?? "all"}-${it.id}`} product={it.card} idx={Math.min(idx, 7)} href={it.href} />
        ))}
      </div>
    </div>
  );
}
