import { isCategoryVisible, type CategoryNode } from "./api";

/* ============================================================================
   CICEKYOLLA — HEADER CURATION (Sales First)
   Header, ham DB root'larini degil, satis niyetini artiran CURATED bir seti gosterir.
   Config yalniz "hangi kategori header'da + sira + etiket" belirler.
   VERI (isim/cocuk/torun/link/gorsel) CANLI CategoryTree'den gelir -> tek kaynak.
   Bulunamayan oge atlanir ve `missing`'te raporlanir (uydurma YOK).
   ============================================================================ */

export interface HeaderNavItem { match: string; label: string }

export const HEADER_NAV_CONFIG: HeaderNavItem[] = [
  { match: "Çiçekler", label: "Çiçekler" },
  { match: "Gönderim Amacına Göre", label: "Gönderim Amacına Göre" },
  { match: "Buketler", label: "Buketler" },
  { match: "Güller", label: "Güller" },
  { match: "Premium Çiçekler", label: "Premium Çiçekler" },
  { match: "Doğum Günü", label: "Doğum Günü" },
  { match: "Orkideler", label: "Orkideler" },
  { match: "Saksı Bitkileri", label: "Saksı Bitkileri" },
  { match: "Kampanyalar", label: "Kampanyalar" },
  { match: "Koleksiyonlar", label: "Koleksiyonlar" },
];

export interface MegaColumn { title: string; href: string; links: { name: string; href: string }[] }
export interface MegaGroup {
  href: string;
  featured: { title: string; href: string; image: string | null };
  columns: MegaColumn[];
  categories: { name: string; href: string; sub?: string }[];
}

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

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

const visibleChildren = (n: CategoryNode): CategoryNode[] =>
  (Array.isArray(n.children) ? (n.children as CategoryNode[]) : []).filter(
    (c) => c?.name && c?.slug && isCategoryVisible(c),
  );

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
    const kids = visibleChildren(node);
    const columns: MegaColumn[] = kids.map((c) => ({
      title: c.name,
      href: `/kategori/${c.slug}`,
      links: visibleChildren(c).map((g) => ({ name: g.name, href: `/kategori/${g.slug}` })),
    }));
    const cols = columns.length > 0 ? columns : [{ title: `Tüm ${item.label}`, href, links: [] }];
    const banner = (node as { banner_image?: unknown }).banner_image;
    menu[item.label] = {
      href,
      columns: cols,
      categories: kids.map((c) => ({ name: c.name, href: `/kategori/${c.slug}` })),
      featured: { title: item.label, href, image: typeof banner === "string" && banner ? banner : null },
    };
  }
  return { menu, missing };
}
