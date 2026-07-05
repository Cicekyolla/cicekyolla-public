import { isCategoryVisible, type CategoryNode } from "./api";

export interface CategoryItem {
  id: string;
  name: string;
  href: string;
  image: string;
  count?: number;
  tag?: string;
}

export const CATEGORY_PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23faf5ff'/%3E%3Cstop offset='1' stop-color='%23f3e8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='1000' fill='url(%23g)'/%3E%3Ccircle cx='400' cy='430' r='150' fill='%23ffffff' opacity='.72'/%3E%3Cpath d='M400 270c-85 75-130 144-130 211 0 83 58 149 130 149s130-66 130-149c0-67-45-136-130-211Z' fill='%238b5cf6' opacity='.22'/%3E%3Cpath d='M400 350c-42 38-65 72-65 107 0 42 29 74 65 74s65-32 65-74c0-35-23-69-65-107Z' fill='%237c3aed' opacity='.22'/%3E%3Ctext x='400' y='720' text-anchor='middle' font-family='Arial' font-size='34' fill='%236d28d9' letter-spacing='6'%3ECICEKYOLLA%3C/text%3E%3C/svg%3E";

export interface MegaGroup {
  href: string;
  featured?: { label: string; title: string; href: string; image: string };
  categories: { name: string; sub?: string; href: string }[];
}

function readImage(node: CategoryNode): string {
  const raw = node as { banner_image?: unknown; icon?: unknown; image?: unknown; image_url?: unknown };
  return (
    (typeof raw.banner_image === "string" && raw.banner_image) ||
    (typeof raw.image_url === "string" && raw.image_url) ||
    (typeof raw.image === "string" && raw.image) ||
    (typeof raw.icon === "string" && raw.icon) ||
    CATEGORY_PLACEHOLDER_IMAGE
  );
}

function isValidVisible(node: CategoryNode): boolean {
  return !!node && typeof node.name === "string" && typeof node.slug === "string" && isCategoryVisible(node);
}

export function mapTreeToItems(nodes: CategoryNode[]): CategoryItem[] {
  return nodes
    .filter(isValidVisible)
    .map((n) => ({ id: n.slug, name: n.name, href: `/kategori/${n.slug}`, image: readImage(n) }));
}

export function getBreadcrumbTrailFromTree(
  nodes: CategoryNode[],
  slug: string,
): { name: string; slug: string }[] {
  const bySlug = new Map<string, CategoryNode>();
  const walk = (list: CategoryNode[]): void => {
    for (const n of list) {
      if (n && typeof n.slug === "string") bySlug.set(n.slug, n);
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);

  const trail: { name: string; slug: string }[] = [];
  const guard = new Set<string>();
  let cur = bySlug.get(slug);
  while (cur && typeof cur.name === "string" && !guard.has(cur.slug)) {
    guard.add(cur.slug);
    trail.unshift({ name: cur.name, slug: cur.slug });
    const parent = typeof cur.parent_slug === "string" ? cur.parent_slug : "";
    cur = parent ? bySlug.get(parent) : undefined;
  }
  return trail;
}

export function findCategoryIdBySlug(nodes: CategoryNode[], slug: string): number | null {
  let found: number | null = null;
  const walk = (list: CategoryNode[]): void => {
    for (const n of list) {
      if (found !== null) return;
      if (n?.slug === slug) {
        const num = Number((n as { id?: unknown }).id);
        if (Number.isFinite(num) && num > 0) {
          found = num;
          return;
        }
      }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);
  return found;
}

function flattenChildren(nodes: CategoryNode[], maxLinks: number): { name: string; sub?: string; href: string }[] {
  const out: { name: string; sub?: string; href: string }[] = [];
  const walk = (list: CategoryNode[], depth: number): void => {
    for (const n of list) {
      if (out.length >= maxLinks) return;
      if (isValidVisible(n)) {
        const desc = (n as { description?: unknown }).description;
        out.push({
          name: depth > 1 ? `— ${n.name}` : n.name,
          href: `/kategori/${n.slug}`,
          sub: typeof desc === "string" && desc ? desc.slice(0, 42) : undefined,
        });
      }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[], depth + 1);
    }
  };
  walk(nodes, 1);
  return out;
}

export function mapTreeToMegaMenu(nodes: CategoryNode[], maxGroups = 50, maxLinks = 24): Record<string, MegaGroup> {
  const out: Record<string, MegaGroup> = {};
  for (const n of nodes.filter(isValidVisible).slice(0, maxGroups)) {
    const href = `/kategori/${n.slug}`;
    const kids = Array.isArray(n.children) ? (n.children as CategoryNode[]) : [];
    const links = flattenChildren(kids, maxLinks);
    const img = readImage(n);
    out[n.name] = {
      href,
      categories: links.length > 0 ? links : [{ name: `Tüm ${n.name}`, href }],
      featured: { label: "Koleksiyon", title: n.name, href, image: img },
    };
  }
  return out;
}

export function findCategoryNodeBySlug(nodes: CategoryNode[], slug: string): CategoryNode | null {
  let found: CategoryNode | null = null;
  const walk = (list: CategoryNode[]): void => {
    for (const n of list) {
      if (found) return;
      if (n?.slug === slug && isCategoryVisible(n)) {
        found = n;
        return;
      }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);
  return found;
}
