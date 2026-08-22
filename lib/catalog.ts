import { isCategoryVisible } from "@/lib/api";
import { isLegacyPleskMedia, mediaUrl } from "@/lib/media";
/**
 * CICEKYOLLA OS — CATALOG (tek kanonik frontend kaynağı)
 * ------------------------------------------------------------------
 * Category Center = TEK GERÇEK KAYNAK. Bu dosya, bugün canlıda dağınık olan
 * kategori/navigasyon verisini TEK yere konsolide eder (verbatim taşındı —
 * yeni kategori/slug/isim/sıra ÜRETİLMEZ, mevcut çalışan yapı korunur).
 */

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
  c1:  { emoji: "🔥", label: "Çok Satan",  color: "#EF4444" },
  c3:  { emoji: "💎", label: "Premium",    color: "#8B5CF6" },
  c6:  { emoji: "❤️",  label: "Trend",      color: "#EC4899" },
  c9:  { emoji: "🆕", label: "Yeni",       color: "#3B82F6" },
  c11: { emoji: "🏗️", label: "Proje",      color: "#7C3AED" },
  c12: { emoji: "⭐", label: "Editör",     color: "#F59E0B" },
  c15: { emoji: "✨", label: "Özel",       color: "#6D28D9" },
  c16: { emoji: "🚚", label: "81 İl",      color: "#10B981" },
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

function normalizeCategoryImage(value: unknown): string {
  if (typeof value !== "string") return "";
  const image = value.trim();
  if (!image || isLegacyPleskMedia(image)) return "";
  // R2 (pub-*.r2.dev) URL'leri TR'de bloklu → same-origin /r2/ proxy (ürünlerle aynı yol).
  if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(image)) return mediaUrl(image);
  return `/${image.replace(/^\.\//, "").replace(/^\/+/, "")}`;
}

function categoryPlaceholder(name: string): string {
  const safeName = name.replace(/[<>&"']/g, "").slice(0, 42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#C084FC"/><stop offset="0.55" stop-color="#8B5CF6"/><stop offset="1" stop-color="#5B21B6"/></linearGradient></defs><rect width="800" height="800" rx="56" fill="url(#g)"/><circle cx="650" cy="145" r="180" fill="white" opacity=".08"/><circle cx="150" cy="690" r="220" fill="white" opacity=".06"/><text x="400" y="410" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial,sans-serif" font-size="44" font-weight="700">${safeName}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function mapTreeToItems(nodes: CategoryNode[]): CategoryItem[] {
  const items: CategoryItem[] = [];
  for (const n of nodes) {
    if (!n || typeof n.name !== "string" || typeof n.slug !== "string") continue;
    if (!isCategoryVisible(n)) continue;
    const href = `/kategori/${n.slug}`;
    const raw = n as { banner_image?: unknown; icon?: unknown; image?: unknown };
    const image =
      normalizeCategoryImage(raw.banner_image) ||
      normalizeCategoryImage(raw.icon) ||
      normalizeCategoryImage(raw.image) ||
      categoryPlaceholder(n.name);
    items.push({ id: n.slug, name: n.name, href, image });
  }
  return items;
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
    const banner = normalizeCategoryImage((n as { banner_image?: unknown }).banner_image);
    out[n.name] = {
      href,
      categories: links.length > 0 ? links : [{ name: `Tüm ${n.name}`, href }],
      featured: banner ? { label: "Koleksiyon", title: n.name, href, image: banner } : undefined,
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
