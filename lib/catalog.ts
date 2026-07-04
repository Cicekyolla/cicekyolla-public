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

export const premiumCategories: CategoryItem[] = [
  /* ── Taze Çiçekler ── */
  { id: "c1",  name: "Buket Çiçekler",     href: "/kategori/buketler",              image: "https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=400&h=400&fit=crop&auto=format&q=85", count: 78, tag: "Çok Satan" },
  { id: "c2",  name: "Gül Buketleri",      href: "/kategori/guller",                image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=400&h=400&fit=crop&auto=format&q=85", count: 45 },
  { id: "c3",  name: "Orkideler",           href: "/kategori/orkideler",             image: "https://images.unsplash.com/photo-1612968550885-5d1cf8a0c39f?w=400&h=400&fit=crop&auto=format&q=85", count: 24, tag: "Premium" },
  { id: "c4",  name: "Aranjman Çiçekler",  href: "/kategori/aranjman",              image: "https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=400&h=400&fit=crop&auto=format&q=85", count: 38 },
  { id: "c5",  name: "Saksı Bitkileri",    href: "/kategori/bitkiler",              image: "https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=400&h=400&fit=crop&auto=format&q=85", count: 56 },
  { id: "c6",  name: "Sevgiliye Çiçek",    href: "/kategori/sevgililer-gunu",       image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=400&h=400&fit=crop&auto=format&q=85", count: 89, tag: "Trend" },
  { id: "c7",  name: "Doğum Günü",         href: "/kategori/dogum-gunu",            image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=400&h=400&fit=crop&auto=format&q=85", count: 64 },
  { id: "c8",  name: "Anneler Günü",       href: "/kategori/anneler-gunu",          image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=85", count: 42 },
  /* ── Yapay & Peyzaj ── */
  { id: "c9",  name: "Yapay Çiçekler",     href: "/kategori/yapay-cicek",           image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&h=400&fit=crop&auto=format&q=85", count: 124, tag: "Yeni" },
  { id: "c10", name: "Yapay Ağaçlar",      href: "/kategori/yapay-agac",            image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop&auto=format&q=85", count: 48 },
  { id: "c11", name: "Yapay Çim Duvar",    href: "/kategori/cim-duvar",             image: "https://images.unsplash.com/photo-1487530811015-780f2f5a3f48?w=400&h=400&fit=crop&auto=format&q=85", count: 36, tag: "Proje" },
  /* ── Dekorasyon Projeleri ── */
  { id: "c12", name: "Kafe Dekorasyon",    href: "/dekorasyon/projeler?tur=kafe",   image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop&auto=format&q=85", count: 62, tag: "Editör" },
  { id: "c13", name: "Otel Dekorasyon",    href: "/dekorasyon/projeler?tur=otel",   image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=85", count: 47 },
  { id: "c14", name: "Ofis Dekorasyon",    href: "/dekorasyon/projeler?tur=ofis",   image: "https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=400&h=400&fit=crop&auto=format&q=85", count: 94 },
  { id: "c15", name: "Proje Uygulamaları", href: "/dekorasyon",                     image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&h=400&fit=crop&auto=format&q=85", count: 500, tag: "Özel" },
  /* ── Türkiye Kargo ── */
  { id: "c16", name: "Türkiye'ye Kargo",   href: "/kategori/turkiye-geneli-kargo",  image: "https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=400&h=400&fit=crop&auto=format&q=85", count: 200, tag: "81 İl" },
];

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

export const megaMenuData: Record<string, MegaMenuGroup> = {
  Güller: {
    featured: {
      image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&h=700&fit=crop&auto=format",
      label: "Editör Seçimi",
      title: "El Seçimi\nPremium Güller",
      href: "/urun/premium-kirmizi-guller",
    },
    categories: [
      { name: "Kırmızı Güller", sub: "En çok satılan", href: "/kategori/guller?renk=kirmizi" },
      { name: "Beyaz Güller", sub: "Zarafet simgesi", href: "/kategori/guller?renk=beyaz" },
      { name: "Pembe Güller", sub: "Sevgi ve nezaket", href: "/kategori/guller?renk=pembe" },
      { name: "Karma Güller", sub: "Renk dolu buketler", href: "/kategori/guller?renk=karma" },
      { name: "Siyah Kutu Güller", sub: "Premium hediye", href: "/kategori/guller?ambalaj=kutu" },
    ],
  },
  Buketler: {
    featured: {
      image: "https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=600&h=700&fit=crop&auto=format",
      label: "Mevsimlik",
      title: "Şakayık\nKoleksiyonu",
      href: "/urun/pembe-sakayik-buketi",
    },
    categories: [
      { name: "Mevsimlik Buketler", sub: "Taptaze sezon çiçekleri", href: "/kategori/buketler?tur=mevsimlik" },
      { name: "Premium Buketler", sub: "El seçimi aranjmanlar", href: "/kategori/buketler?tur=premium" },
      { name: "Doğum Günü", sub: "Kutlama aranjmanları", href: "/kategori/buketler?tur=dogum-gunu" },
      { name: "Romantik Buketler", sub: "Sevgililer için", href: "/kategori/buketler?tur=romantik" },
      { name: "Mini Buketler", sub: "Küçük ama özel", href: "/kategori/buketler?tur=mini" },
    ],
  },
  Orkideler: {
    featured: {
      image: "https://images.unsplash.com/photo-1612968550885-5d1cf8a0c39f?w=600&h=700&fit=crop&auto=format",
      label: "Uzun Ömürlü",
      title: "Orkide\nKoleksiyonu",
      href: "/kategori/orkideler",
    },
    categories: [
      { name: "Beyaz Orkide", sub: "Klasik zarafet", href: "/kategori/orkideler?renk=beyaz" },
      { name: "Pembe Orkide", sub: "Yumuşak tonlar", href: "/kategori/orkideler?renk=pembe" },
      { name: "Mor Orkide", sub: "Asil görünüm", href: "/kategori/orkideler?renk=mor" },
      { name: "Çift Dallı Orkide", sub: "Bol çiçekli", href: "/kategori/orkideler?tur=cift-dalh" },
      { name: "Saksı Aranjman", sub: "Ev hediyesi", href: "/kategori/orkideler?tur=saksi" },
    ],
  },
  "Özel Günler": {
    featured: {
      image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&h=700&fit=crop&auto=format",
      label: "Özel Koleksiyon",
      title: "Düğün &\nNişan",
      href: "/kategori/dugun",
    },
    categories: [
      { name: "Doğum Günü", sub: "Kutlama aranjmanları", href: "/kategori/dogum-gunu" },
      { name: "Sevgililer Günü", sub: "Aşk mesajları", href: "/kategori/sevgililer-gunu" },
      { name: "Anneler Günü", sub: "Anneye özel", href: "/kategori/anneler-gunu" },
      { name: "Düğün & Nişan", sub: "Özel gün koleksiyonu", href: "/kategori/dugun" },
      { name: "Mezuniyet", sub: "Başarı kutlaması", href: "/kategori/mezuniyet" },
    ],
  },
  "Kargo Gönderim": {
    featured: {
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=700&fit=crop&auto=format",
      label: "81 İle Teslimat",
      title: "Tüm Türkiye\nKargo Gönderim",
      href: "/kategori/turkiye-geneli-kargo",
    },
    categories: [
      { name: "Kuru Çiçekler", sub: "Sonsuz güzellik, kargoda güvenli", href: "/kategori/turkiye-geneli-kargo" },
      { name: "Sukulentler", sub: "Bakım gerektirmez, uzun ömürlü", href: "/kategori/turkiye-geneli-kargo" },
      { name: "Saksı Bitkileri", sub: "Özel korumalı paketleme", href: "/kategori/turkiye-geneli-kargo" },
      { name: "Yapay Çiçekler", sub: "Solmaz, kargoda mükemmel", href: "/kategori/turkiye-geneli-kargo" },
      { name: "Hediye Kutuları", sub: "Hazır paket, hızlı gönderim", href: "/kategori/turkiye-geneli-kargo" },
      { name: "Kurumsal Hediyeler", sub: "Logo baskılı, faturalı", href: "/kategori/turkiye-geneli-kargo" },
    ],
  },
  "Yapay & Peyzaj": {
    featured: {
      image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600&h=700&fit=crop&auto=format",
      label: "Solmayan Güzellik",
      title: "Yapay Çiçek\nKoleksiyonu",
      href: "/kategori/yapay-cicek",
    },
    categories: [
      { name: "Yapay Çiçekler", sub: "Solmaz, bakım gerektirmez", href: "/kategori/yapay-cicek" },
      { name: "Yapay Ağaçlar", sub: "İç & dış mekan", href: "/kategori/yapay-agac" },
      { name: "Şimşir Bitkisi", sub: "Top, konik, küp formlar", href: "/kategori/simsir" },
      { name: "Çim Duvar", sub: "Doğal görünüm, kolay bakım", href: "/kategori/cim-duvar" },
      { name: "Çim Çit", sub: "Bahçe sınırlandırma", href: "/kategori/cim-cit" },
      { name: "Peyzaj Hizmetleri", sub: "Proje bazlı bahçe düzenleme", href: "/kategori/peyzaj" },
    ],
  },
};

/** Mega menü başlık anahtarları (desktop nav sırası — verbatim). */
export type MenuKey = keyof typeof megaMenuData;
export const navItems: MenuKey[] = ["Güller", "Buketler", "Orkideler", "Özel Günler", "Kargo Gönderim", "Yapay & Peyzaj"];

/* ═══════════════════════════════════════════════════════════════
   3) MOBİL MENU (drawer nav — verbatim, kategori + statik sayfalar)
   ═══════════════════════════════════════════════════════════════ */
export interface NavLink {
  label: string;
  href: string;
}

export const mobileNavItems: NavLink[] = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Güller", href: "/kategori/guller" },
  { label: "Buketler", href: "/kategori/buketler" },
  { label: "Orkideler", href: "/kategori/orkideler" },
  { label: "Özel Günler", href: "/kategori/ozel-gunler" },
  { label: "Yapay Çiçekler", href: "/kategori/yapay-cicek" },
  { label: "Yapay Ağaçlar", href: "/kategori/yapay-agac" },
  { label: "Şimşir", href: "/kategori/simsir" },
  { label: "Çim Duvar", href: "/kategori/cim-duvar" },
  { label: "Çim Çit", href: "/kategori/cim-cit" },
  { label: "Peyzaj", href: "/kategori/peyzaj" },
  { label: "🌿 Dekorasyon & Peyzaj", href: "/dekorasyon" },
  { label: "🚚 Türkiye Geneli Kargo", href: "/kategori/turkiye-geneli-kargo" },
  { label: "Teslimat Bölgeleri", href: "/teslimat-bolgeleri" },
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "Blog", href: "/blog" },
  { label: "Kurumsal", href: "/kurumsal" },
  { label: "SSS", href: "/sss" },
  { label: "İletişim", href: "/iletisim" },
  { label: "Sepetim", href: "/sepet" },
];

/* ═══════════════════════════════════════════════════════════════
   4) TÜRETME YARDIMCILARI (Related / Internal Linking)
   Tek kaynaktan üretir — bileşenlerde kategori HARDCODE edilmez.
   ═══════════════════════════════════════════════════════════════ */

/** Verilen href hariç, koleksiyon vitrininden ilgili kategorileri döndürür. */
export function getRelatedCategories(currentHref: string, limit = 8): CategoryItem[] {
  return premiumCategories.filter((c) => c.href !== currentHref).slice(0, limit);
}

/* ═══════════════════════════════════════════════════════════════
   5) CANLI CATEGORY CENTER AĞACI → mevcut UI şekline eşleme
   fetchCategoryTree() düğümlerini, tasarımı bozmadan tüketici
   şekillerine çevirir. Slug/isim AYNEN korunur; uydurma/rename YOK.
   ═══════════════════════════════════════════════════════════════ */

/** Ağaç düğümlerini koleksiyon kartı şekline çevirir (image-güvenli).
 *  Görsel: düğümün kendi görseli → yoksa slug eşleşen mevcut catalog görseli →
 *  hiçbiri yoksa öğe atlanır (kartı görselsiz bozmamak için). */
export function mapTreeToItems(nodes: CategoryNode[]): CategoryItem[] {
  const byHref = new Map(premiumCategories.map((c) => [c.href, c] as const));
  const items: CategoryItem[] = [];
  for (const n of nodes) {
    if (!n || typeof n.name !== "string" || typeof n.slug !== "string") continue;
    const href = `/kategori/${n.slug}`;
    const nodeImage = typeof n.image === "string" ? n.image : "";
    const image = nodeImage || byHref.get(href)?.image || "";
    if (!image) continue;
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
