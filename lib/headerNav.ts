import { isCategoryVisible, type CategoryNode } from "./api";
import { mediaUrl } from "./media";
import { HEADER_NAV_CONFIG, balanceMegaColumns, type HeaderNavItem, type MegaColumn } from "./megaMenuLayout";

/* ============================================================================
   CICEKYOLLA — HEADER CURATION (Sales First)
   Header, ham DB root'larini degil, satis niyetini artiran CURATED bir seti gosterir.
   Config yalniz "hangi kategori header'da + sira + etiket" belirler (megaMenuLayout.ts).
   VERI (isim/cocuk/torun/link/gorsel) CANLI CategoryTree'den gelir -> tek kaynak.
   Bulunamayan oge atlanir ve `missing`'te raporlanir (uydurma YOK).
   ============================================================================ */

export { HEADER_NAV_CONFIG, balanceMegaColumns };
export type { HeaderNavItem, MegaColumn };

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
      // R2 URL'i TR'de bloklu → /r2/ proxy (ürün görselleriyle aynı yol).
      featured: { title: item.label, href, image: typeof banner === "string" && banner ? mediaUrl(banner) : null },
    };
  }
  return { menu, missing };
}
