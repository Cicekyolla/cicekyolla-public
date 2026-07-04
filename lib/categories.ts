import { cache } from "react";
import { fetchCategoryTree, type CategoryNode } from "./api";

/* ============================================================================
   CICEKYOLLA PUBLIC — TEK KATEGORİ KAYNAĞI (CategoryTree single source)
   CTO Final Audit: Hiçbir bileşen ikinci bir kategori listesi kullanmaz.
   getCategoryTree() React cache() ile sarılıdır → aynı request içinde TEK fetch
   yapılır, TÜM server component'ler (layout/Header/Footer/Homepage/CategoryLanding/
   sitemap) aynı sonucu paylaşır. Admin Category Center → /api/categories → burası.
   ============================================================================ */

export const getCategoryTree = cache(async (): Promise<CategoryNode[] | null> => {
  return fetchCategoryTree();
});

const isActive = (n: CategoryNode) =>
  n && typeof n.name === "string" && typeof n.slug === "string" &&
  (typeof n.status !== "string" || n.status === "active");

export interface NavCategory { name: string; href: string; slug: string }

/** Üst-seviye active kategoriler → düz nav listesi (Header mobil + Footer). */
export function getCategoryNav(tree: CategoryNode[] | null, limit = 50): NavCategory[] {
  if (!tree) return [];
  return tree.filter(isActive).slice(0, limit).map((n) => ({
    name: n.name, slug: n.slug, href: `/kategori/${n.slug}`,
  }));
}

/** Ağacı düz listeye indirger (sitemap: tüm kategori URL'leri, derinlik dahil). */
export function flattenCategories(tree: CategoryNode[] | null): NavCategory[] {
  const out: NavCategory[] = [];
  const walk = (list: CategoryNode[]) => {
    for (const n of list) {
      if (isActive(n)) out.push({ name: n.name, slug: n.slug, href: `/kategori/${n.slug}` });
      if (Array.isArray(n.children)) walk(n.children as CategoryNode[]);
    }
  };
  if (tree) walk(tree);
  return out;
}
