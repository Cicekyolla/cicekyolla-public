import { isCategoryVisible, type CategoryNode } from "./api";

/* ============================================================================
   CICEKYOLLA — HEADER CURATION (Sales First)
   Header, ham DB root'larını değil, satış niyetini artıran CURATED bir seti gösterir.
   Bu config yalnız "hangi kategori header'da + sıra + kısa etiket" belirler.
   VERİ (isim/çocuk/link/görsel/mega menü) CANLI CategoryTree'den gelir → tek kaynak.
   `match`: canlı ağaçta aranacak kategori adı (normalize). `label`: header'da gösterilen kısa ad.
   Admin'de kategori adı/slug değişirse tree değişir, header uyum sağlar (bulunamayan atlanır).
   ============================================================================ */

export interface HeaderNavItem { match: string; label: string }

export const HEADER_NAV_CONFIG: HeaderNavItem[] = [
  { match: "Çiçekler", label: "Çiçekler" },
  { match: "Gönderim Amacına Göre", label: "Gönderim Amacı" },
  { match: "Buketler", label: "Buketler" },
  { match: "Güller", label: "Güller" },
  { match: "Premium Çiçekler", label: "Premium" },
  { match: "Doğum Günü", label: "Doğum Günü" },
  { match: "Orkideler", label: "Orkideler" },
  { match: "Saksı Bitkileri", label: "Saksı Bitkileri" },
  { match: "Kampanyalar", label: "Kampanyalar" },
  { match: "Koleksiyonlar", label: "Koleksiyonlar" },
];

export interface MegaGroup {
  href: string;
  featured?: { label: string; title: string; href: string; image: string };
  categories: { name: string; sub?: string; href: string }[];
}

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

/** Canlı ağaçta (her derinlik) adı eşleşen ilk görünür düğümü bulur. */
function findByName(nodes: CategoryNode[], name: string): CategoryNode | null {
  const target = norm(name);
  let found: CategoryNode | null = null;
  const walk = (list: CategoryNode[]): void => {
    for (const n of list) {
      if (found) return;
      if (n?.name && norm(n.name) === target && isCategoryVisible(n)) { found = n; return; }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);
  return found;
}

/** Curated header menüsünü canlı ağaçtan üretir. Bulunamayan config öğeleri `missing`. */
export function buildHeaderMenu(
  tree: CategoryNode[] | null,
  config: HeaderNavItem[] = HEADER_NAV_CONFIG,
): { menu: Record<string, MegaGroup>; missing: string[] } {
  const menu: Record<string, MegaGroup> = {};
  const missing: string[] = [];
  if (!tree) return { menu, missing: config.map((c) => c.label) };
  for (const item of config) {
    const node = findByName(tree, item.match);
    if (!node) { missing.push(item.label); continue; }
    const href = `/kategori/${node.slug}`;
    const kids = Array.isArray(node.children) ? (node.children as CategoryNode[]) : [];
    const cats = kids
      .filter((c) => c?.name && c?.slug && isCategoryVisible(c))
      .map((c) => {
        const d = (c as { description?: unknown }).description;
        return { name: c.name, href: `/kategori/${c.slug}`, sub: typeof d === "string" && d ? d.slice(0, 42) : undefined };
      });
    const banner = (node as { banner_image?: unknown }).banner_image;
    menu[item.label] = {
      href,
      categories: cats.length > 0 ? cats : [{ name: `Tüm ${item.label}`, href }],
      featured: typeof banner === "string" && banner ? { label: "Koleksiyon", title: item.label, href, image: banner } : undefined,
    };
  }
  return { menu, missing };
}
