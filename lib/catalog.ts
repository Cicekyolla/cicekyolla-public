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

export interface MegaMenuLink { name: string; sub: string; href: string }
export interface MegaMenuFeatured { image: string; label: string; title: string; href: string }
export interface MegaMenuGroup { featured: MegaMenuFeatured; categories: MegaMenuLink[] }
export interface NavLink { label: string; href: string }

const salesPriorityWords = [
  "anneler günü", "öğretmenler günü", "sevgili", "doğum günü", "özel gün",
  "orkide", "gül", "buket", "kampanya", "koleksiyon", "saksı",
  "yapay dekorasyon", "yapay çiçek", "kutuda", "vazoda", "bonsai", "kaktüs",
  "sukulent", "teraryum", "lilyum", "papatya", "lale", "krizantem", "gerbera",
  "mevsim", "çelenk", "açılış", "düğün", "nişan", "kurumsal", "geçmiş olsun",
  "tebrik", "yeni iş", "yeni bebek", "özür", "aşk", "romantik", "hediye",
  "premium", "dekorasyon",
];

const badgeLabels: Record<string, string> = {
  new: "Yeni",
  bestseller: "Çok Satan",
  premium: "Premium",
  campaign: "Kampanya",
  trend: "Trend",
};

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

function numberValue(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readImage(n: CategoryNode): string {
  const raw = n as {
    homepage_slider_image?: unknown;
    homepage_slider_mobile_image?: unknown;
    banner_image?: unknown;
    icon?: unknown;
    image?: unknown;
    image_url?: unknown;
  };
  return (
    (typeof raw.homepage_slider_image === "string" && raw.homepage_slider_image) ||
    (typeof raw.homepage_slider_mobile_image === "string" && raw.homepage_slider_mobile_image) ||
    (typeof raw.banner_image === "string" && raw.banner_image) ||
    (typeof raw.image_url === "string" && raw.image_url) ||
    (typeof raw.icon === "string" && raw.icon) ||
    (typeof raw.image === "string" && raw.image) ||
    ""
  );
}

function readTag(n: CategoryNode): string | undefined {
  const raw = n as Record<string, unknown>;
  if (typeof raw.homepage_slider_badge === "string" && badgeLabels[raw.homepage_slider_badge]) {
    return badgeLabels[raw.homepage_slider_badge];
  }
  if (raw.is_bestseller === true) return "Çok Satan";
  if (raw.is_featured === true || raw.featured === true) return "Öne Çıkan";
  if (raw.is_new === true) return "Yeni";
  return undefined;
}

function readCount(n: CategoryNode): number | undefined {
  const raw = n as Record<string, unknown>;
  const productCount = numberValue(raw.product_count, 0);
  if (productCount > 0) return productCount;
  const directChildren = numberValue(raw.child_count, 0);
  const descendants = numberValue(raw.descendant_count, 0);
  const total = Math.max(descendants, directChildren);
  return total > 0 ? total : undefined;
}

function toItem(n: CategoryNode): CategoryItem {
  return {
    id: n.slug,
    name: n.name,
    href: `/kategori/${n.slug}`,
    image: readImage(n),
    count: readCount(n),
    tag: readTag(n),
  };
}

function walkVisible(nodes: CategoryNode[], out: CategoryNode[]): void {
  for (const n of nodes) {
    if (!n || typeof n.name !== "string" || typeof n.slug !== "string") continue;
    if (isCategoryVisible(n)) out.push(n);
    if (Array.isArray(n.children)) walkVisible(n.children as CategoryNode[], out);
  }
}

function scoreNodes(nodes: CategoryNode[]): CategoryNode[] {
  const bySlug = new Map<string, CategoryNode>();
  for (const n of nodes) bySlug.set(n.slug, n);
  const scored = [...bySlug.values()].map((n, index) => {
    const raw = n as Record<string, unknown>;
    const name = norm(n.name);
    const priority = salesPriorityWords.findIndex((word) => name.includes(word));
    const adminPriority = numberValue(raw.homepage_slider_priority, 0);
    const adminOrder = raw.homepage_slider_order == null ? Number.POSITIVE_INFINITY : numberValue(raw.homepage_slider_order, Number.POSITIVE_INFINITY);
    return {
      node: n,
      index,
      adminPriority,
      adminOrder,
      score: priority === -1 ? 999 + index : priority,
    };
  });
  scored.sort((a, b) => {
    if (a.adminPriority !== b.adminPriority) return b.adminPriority - a.adminPriority;
    if (a.adminOrder !== b.adminOrder) return a.adminOrder - b.adminOrder;
    return a.score - b.score || a.index - b.index;
  });
  return scored.map(({ node }) => node);
}

export function mapTreeToItems(nodes: CategoryNode[]): CategoryItem[] {
  const all: CategoryNode[] = [];
  walkVisible(nodes, all);
  return scoreNodes(all).map(toItem);
}

export function mapCategoryChildrenToItems(node: CategoryNode | null, limit = 50): CategoryItem[] {
  if (!node || !Array.isArray(node.children)) return [];
  const all: CategoryNode[] = [];
  walkVisible(node.children as CategoryNode[], all);
  return scoreNodes(all).slice(0, limit).map(toItem);
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
