/**
 * Floating Koleksiyonlar (FloatingCategoryRail) verisi.
 * ZIP "Next-Gen Ecommerce Website Design" birebir:
 *  - premiumCategories: components/CategoryCarousel.tsx (export)
 *  - categoryBadges:    pages/Homepage.tsx (rail rozet haritası)
 * Yeniden yorumlama yok; sadece Next tarafına taşındı.
 */

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
