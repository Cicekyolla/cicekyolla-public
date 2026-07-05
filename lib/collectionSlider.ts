import { isCategoryVisible, type CategoryNode } from "./api";
import type { CategoryItem } from "./catalog";

/* ============================================================================
   CICEKYOLLA — HOMEPAGE SALES COLLECTION SLIDER (sales-priority mapper)
   Rail, Hero'dan bagimsiz satis-odakli kesif alanidir. Root DEGIL; canli
   CategoryTree icinden (her derinlik) satis niyeti yuksek kategorileri secer.
   KALICI HARDCODED KATEGORI SISTEMI DEGIL: yalniz canli agactan eslesenleri filtreler.
   Slug/isim admin'den gelir; admin'de olmayan uydurulmaz.
   Oncelik: 1) admin featured/show_on_home alani (varsa) 2) satis-oncelik isim listesi.
   ============================================================================ */

// Satis-oncelik isim listesi (sira = gosterim onceligi). Koleksiyonlar dahil (kaybolmaz).
export const SALES_PRIORITY_NAMES: string[] = [
  "Sevgiliye", "Doğum Günü", "Anneler Günü", "Öğretmenler Günü",
  "Orkideler", "Güller", "Buketler", "Premium Çiçekler", "Kampanyalar",
  "Koleksiyonlar", "Saksı Bitkileri", "Yapay Dekorasyon", "Yapay Çiçekler",
  "Çikolata", "Hediye", "Kutuda Çiçekler", "Vazoda Çiçekler", "Teraryum",
  "Bonsai", "Kaktüs", "Sukulent", "Çelenk", "Açılış", "Düğün", "Nişan",
  "Kurumsal", "Geçmiş Olsun", "Tebrik", "Yeni İş", "Yeni Bebek", "Özür",
  "Aşk", "Romantik", "Beyaz Orkide", "Mor Orkide", "Kırmızı Gül", "Pembe Gül",
  "Lilyum", "Papatya", "Lale", "Krizantem", "Gerbera", "Mevsim Çiçekleri",
];

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

const nodeImage = (n: CategoryNode): string => {
  const r = n as { banner_image?: unknown; icon?: unknown; image?: unknown };
  return (typeof r.banner_image === "string" && r.banner_image) ||
    (typeof r.icon === "string" && r.icon) ||
    (typeof r.image === "string" && r.image) || "";
};

const toItem = (n: CategoryNode): CategoryItem => ({
  id: n.slug, name: n.name, href: `/kategori/${n.slug}`, image: nodeImage(n),
});

/** Agaci duzlestirir (gorunur dugumler). */
function flatVisible(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (list: CategoryNode[]) => {
    for (const n of list) {
      if (n?.name && n?.slug && isCategoryVisible(n)) out.push(n);
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);
  return out;
}

const featuredFlag = (n: CategoryNode): boolean => {
  const r = n as Record<string, unknown>;
  return r.show_on_home === true || r.is_featured === true || r.featured === true || r.homepage === true;
};

/** Satis-odakli slider itemlerini canli agactan uretir (<= max). */
export function buildCollectionSlider(tree: CategoryNode[] | null, max = 50): CategoryItem[] {
  if (!tree) return [];
  const all = flatVisible(tree);

  // Oncelik 1: admin featured/show_on_home alani (varsa).
  const flagged = all.filter(featuredFlag);
  if (flagged.length > 0) return flagged.slice(0, max).map(toItem);

  // Oncelik 2: satis-oncelik isim eslesme (sira korunur, slug ile dedupe).
  const byName = new Map<string, CategoryNode>();
  for (const n of all) {
    const key = norm(n.name);
    if (!byName.has(key)) byName.set(key, n); // ilk eslesme
  }
  const seen = new Set<string>();
  const items: CategoryItem[] = [];
  for (const name of SALES_PRIORITY_NAMES) {
    const node = byName.get(norm(name));
    if (node && !seen.has(node.slug)) { seen.add(node.slug); items.push(toItem(node)); }
    if (items.length >= max) break;
  }
  return items;
}
