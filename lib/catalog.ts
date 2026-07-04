/**
 * CICEKYOLLA OS — CATALOG (tek kanonik frontend kaynağı)
 * ------------------------------------------------------------------
 * Category Center = TEK GERÇEK KAYNAK. Bu dosya, bugün canlıda dağınık olan
 * kategori/navigasyon verisini TEK yere konsolide eder (verbatim taşındı —
 * yeni kategori/slug/isim/sıra ÜRETİLMEZ, mevcut çalışan yapı korunur).
 *
 * Tüketiciler:
 *   - Mega Menu + Mobil Menu   → Header.tsx
 *   - Homepage Collections     → home/FloatingCategoryRail.tsx (via home/homeData.ts)
 *   - Related / Internal Links → category/CategoryLanding.tsx (getRelatedCategories)
 *
 * GELECEK: salt-okunur bir kategori endpoint'i geldiğinde YALNIZCA bu dosyanın
 * içi (export'ların kaynağı) fetch/transform ile değişir; export imzaları,
 * tüketici bileşenler ve UI/davranış AYNEN kalır. Bu, "yalnızca veri kaynağı
 * değişecek" sözleşmesini garanti eder.
 */

import type { CategoryNode } from "./api";

/* ═══════════════════════════════════════════════════════════════
   1) KOLEKSİYON VİTRİNİ (Homepage Collections / Featured)
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   2) MEGA MENU (Desktop) — küratörlü başlıklar
   ═══════════════════════════════════════════════════════════════ */
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



/* ═══════════════════════════════════════════════════════════════
   3) MOBİL MENU (drawer nav — verbatim, kategori + statik sayfalar)
   ═══════════════════════════════════════════════════════════════ */
export interface NavLink {
  label: string;
  href: string;
}


/* ═══════════════════════════════════════════════════════════════
   4) TÜRETME YARDIMCILARI (Related / Internal Linking)
   Tek kaynaktan üretir — bileşenlerde kategori HARDCODE edilmez.
   ═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════
   5) CANLI CATEGORY CENTER AĞACI → mevcut UI şekline eşleme
   fetchCategoryTree() düğümlerini, tasarımı bozmadan tüketici
   şekillerine çevirir. Slug/isim AYNEN korunur; uydurma/rename YOK.
   ═══════════════════════════════════════════════════════════════ */

/** Ağaç düğümlerini koleksiyon kartı şekline çevirir (image-güvenli).
 *  Görsel: düğümün kendi görseli → yoksa slug eşleşen mevcut catalog görseli →
 *  hiçbiri yoksa öğe atlanır (kartı görselsiz bozmamak için). */
export function mapTreeToItems(nodes: CategoryNode[]): CategoryItem[] {
  const items: CategoryItem[] = [];
  for (const n of nodes) {
    if (!n || typeof n.name !== "string" || typeof n.slug !== "string") continue;
    // Public yalnız yayında (active) kategoriyi vitrinde gösterir; draft/passive atlanır.
    if (typeof n.status === "string" && n.status !== "active") continue;
    const href = `/kategori/${n.slug}`;
    // TEK KAYNAK: yalnız node'un kendi görseli (banner_image/icon). Hardcoded eşleşme YOK.
    const raw = n as { banner_image?: unknown; icon?: unknown; image?: unknown };
    const image =
      (typeof raw.banner_image === "string" && raw.banner_image) ||
      (typeof raw.icon === "string" && raw.icon) ||
      (typeof raw.image === "string" && raw.image) ||
      "";
    // Görsel YOKSA bile kategori vitrine girer (placeholder ile) → hiçbir active
    // kategori kaybolmaz. Kabul kriteri: "no missing images" = zarif placeholder.
    items.push({ id: n.slug, name: n.name, href, image });
  }
  return items;
}

/** Verilen slug'ın kök→mevcut ata zincirini ağaçtan türetir (Breadcrumb için).
 *  Parent-child ilişkisi ağaçtan okunur; DEĞİŞTİRİLMEZ. */
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

/** Canlı ağaçta slug eşleşen kategorinin numerik id'sini bulur (ürün filtresi için).
 *  id BIGINT olabilir → Number() ile normalize edilir. Bulunamazsa null. */
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

/** Header Mega Menu'yü CANLI kategori ağacından türetir (TEK KAYNAK).
 *  Üst-seviye active kategoriler → nav grupları; çocukları → alt-linkler (gerçek slug).
 *  banner_image varsa featured kart; yoksa yalnız linkler. Hardcoded YOK. */
export interface MegaGroup {
  href: string;
  featured?: { label: string; title: string; href: string; image: string };
  categories: { name: string; sub?: string; href: string }[];
}
export function mapTreeToMegaMenu(nodes: CategoryNode[], maxGroups = 50, maxLinks = 24): Record<string, MegaGroup> {
  const out: Record<string, MegaGroup> = {};
  const isActive = (n: CategoryNode) =>
    n && typeof n.name === "string" && typeof n.slug === "string" &&
    (typeof n.status !== "string" || n.status === "active");
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

/** Canlı ağaçta slug eşleşen kategori DÜĞÜMÜNÜ bulur (sentetik sayfa üretimi için).
 *  Böylece SEO sayfası olmayan kategoriler de 404 yerine landing render eder. */
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
