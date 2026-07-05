import { isCategoryVisible } from "@/lib/api";
import type { CategoryNode } from "./api";

export interface CategoryItem {
  id: string;
  name: string;
  href: string;
  image: string;
  count?: number;
  tag?: string;
}

export const categoryBadges: Record<string, { emoji: string; label: string; color: string }> = {
  c1: { emoji: "🔥", label: "Çok Satan", color: "#EF4444" },
  c3: { emoji: "💎", label: "Premium", color: "#8B5CF6" },
  c6: { emoji: "❤️", label: "Trend", color: "#EC4899" },
  c9: { emoji: "🆕", label: "Yeni", color: "#3B82F6" },
  c11: { emoji: "🏗️", label: "Proje", color: "#7C3AED" },
  c12: { emoji: "⭐", label: "Editör", color: "#F59E0B" },
  c15: { emoji: "✨", label: "Özel", color: "#6D28D9" },
  c16: { emoji: "🚚", label: "81 İl", color: "#10B981" },
};

export interface MegaMenuLink {
  name: string;
  sub: string;
  href: string;
}
export interface MegaMenuFeatured {
  image: string;
  label: string;
  title: string;
  href: string;
}
export interface MegaMenuGroup {
  featured: MegaMenuFeatured;
  categories: MegaMenuLink[];
}
export interface NavLink {
  label: string;
  href: string;
}

const salesPriorityWords = [
  "anneler günü",
  "öğretmenler günü",
  "sevgili",
  "doğum günü",
  "özel gün",
  "orkide",
  "gül",
  "buket",
  "kampanya",
  "koleksiyon",
  "saksı",
  "yapay dekorasyon",
  "yapay çiçek",
  "kutuda",
  "vazoda",
  "bonsai",
  "kaktüs",
  "sukulent",
  "teraryum",
  "lilyum",
  "papatya",
  "lale",
  "krizantem",
  "gerbera",
  "mevsim",
  "çelenk",
  "açılış",
  "düğün",
  "nişan",
  "kurumsal",
  "geçmiş olsun",
  "tebrik",
  "yeni iş",
  "yeni bebek",
  "özür",
  "aşk",
  "romantik",
  "hediye",
  "premium",
  "dekorasyon",
];

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

function readImage(n: CategoryNode): string {
  const raw = n as { banner_image?: unknown; icon?: unknown; image?: unknown; image_url?: unknown };
  return (
    (typeof raw.banner_image === "string" && raw.banner_image) ||
    (typeof raw.image_url === "string" && raw.image_url) ||
    (typeof raw.icon === "string" && raw.icon) ||
    (typeof raw.image === "string" && raw.image) ||
    ""
  );
}

function toItem(n: CategoryNode): CategoryItem {
  return { id: n.slug, name: n.name, href: `/kategori/${n.slug}`, image: readImage(n) };
}

function walkVisible(nodes: CategoryNode[], out: CategoryNode[]): void {
  for (const n of nodes) {
    if (!n || typeof n.name !== "string" || typeof n.slug !== "string") continue;
    if (isCategoryVisible(n)) out.push(n);
    if (Array.isArray(n.children)) walkVisible(n.children as CategoryNode[], out);
  }
}

export function mapTreeToItems(nodes: CategoryNode[]): CategoryItem[] {
  const all: CategoryNode[] = [];
  walkVisible(nodes, all);

  const bySlug = new Map<string, CategoryNode>();
  for (const n of all) bySlug.set(n.slug, n);

  const scored = [...bySlug.values()].map((n, index) => {
    const name = norm(n.name);
    const priority = salesPriorityWords.findIndex((word) => name.includes(word));
    return { node: n, index, score: priority === -1 ? 999 + index : priority };
  });

  scored.sort((a, b) => a.score - b.score || a.index - b.index);

  return scored.slice(0, 50).map(({ node }) => toItem(node));
}

export function getBreadcrumbTrailFromTree(
  nodes: CategoryNode[],
  slug: string
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
        if (Number.isFinite(num) && num > 0) { found = num; return; }
      }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);
  return found;
}

export interface MegaGroup {
  href: string;
  featured?: { label: string; title: string; href: string; image: string };
  categories: { name: string; sub?: string; href: string }[];
}
export function mapTreeToMegaMenu(nodes: CategoryNode[], maxGroups = 50, maxLinks = 24): Record<string, MegaGroup> {
  const out: Record<string, MegaGroup> = {};
  const isActive = (n: CategoryNode) =>
    n && typeof n.name === "string" && typeof n.slug === "string" &&
    isCategoryVisible(n);
  for (const n of nodes.filter(isActive).slice(0, maxGroups)) {
    const href = `/kategori/${n.slug}`;
    const kids = Array.isArray(n.children) ? (n.children as CategoryNode[]) : [];
    const links = kids.filter(isActive).slice(0, maxLinks).map((c) => {
      const desc = (c as { description?: unknown }).description;
      return { name: c.name, href: `/kategori/${c.slug}`, sub: typeof desc === "string" && desc ? desc.slice(0, 42) : undefined };
    });
    const banner = (n as { banner_image?: unknown }).banner_image;
    out[n.name] = {
      href,
      categories: links.length > 0 ? links : [{ name: `Tüm ${n.name}`, href }],
      featured: typeof banner === "string" && banner ? { label: "Koleksiyon", title: n.name, href, image: banner } : undefined,
    };
  }
  return out;
}

export function findCategoryNodeBySlug(nodes: CategoryNode[], slug: string): CategoryNode | null {
  let found: CategoryNode | null = null;
  const walk = (list: CategoryNode[]): void => {
    for (const n of list) {
      if (found) return;
      if (n?.slug === slug) { found = n; return; }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);
  return found;
}
