import { isCategoryVisible, type CategoryNode } from "./api";
import type { CategoryItem } from "./catalog";

/* ============================================================================
   CICEKYOLLA — HOMEPAGE SALES COLLECTION SLIDER (Admin First)
   Rail, Hero'dan bagimsiz satis-odakli kesif alanidir. Root DEGIL; canli
   CategoryTree icinden (her derinlik) admin tarafinda vitrine alinan kategorileri
   secer. Admin alanlari yoksa/aktif degilse eski satis-oncelik fallback korunur.

   TEK KAYNAK:
   Admin Category Center -> API/DB CategoryTree -> Public collection rail.
   Burada mock/hardcoded kategori uretilmez; slug/isim/gorsel admin/API'den gelir.
   ============================================================================ */

// Satis-oncelik isim listesi sadece fallback'tir. Admin slider alani doluysa kullanilmaz.
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

const SLIDER_BADGE_LABELS: Record<string, string> = {
  new: "Yeni",
  bestseller: "Çok Satan",
  premium: "Premium",
  campaign: "Kampanya",
  trend: "Trend",
};

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

const numberValue = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const dateValue = (value: unknown): number | null => {
  if (typeof value !== "string" || !value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const isWithinSliderWindow = (n: CategoryNode, now = Date.now()): boolean => {
  const r = n as Record<string, unknown>;
  const start = dateValue(r.homepage_slider_start_at);
  const end = dateValue(r.homepage_slider_end_at);
  if (start !== null && now < start) return false;
  if (end !== null && now > end) return false;
  return true;
};

const nodeImage = (n: CategoryNode): string => {
  const r = n as {
    homepage_slider_image?: unknown;
    homepage_slider_mobile_image?: unknown;
    banner_image?: unknown;
    icon?: unknown;
    image?: unknown;
    image_url?: unknown;
  };
  return (typeof r.homepage_slider_image === "string" && r.homepage_slider_image) ||
    (typeof r.homepage_slider_mobile_image === "string" && r.homepage_slider_mobile_image) ||
    (typeof r.banner_image === "string" && r.banner_image) ||
    (typeof r.image_url === "string" && r.image_url) ||
    (typeof r.icon === "string" && r.icon) ||
    (typeof r.image === "string" && r.image) || "";
};

const toItem = (n: CategoryNode): CategoryItem => {
  const r = n as Record<string, unknown>;
  const badge = typeof r.homepage_slider_badge === "string" ? SLIDER_BADGE_LABELS[r.homepage_slider_badge] : undefined;
  return {
    id: n.slug,
    name: n.name,
    href: `/kategori/${n.slug}`,
    image: nodeImage(n),
    tag: badge,
  };
};

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

const adminSliderFlag = (n: CategoryNode): boolean => {
  const r = n as Record<string, unknown>;
  return r.show_on_homepage_slider === true && isWithinSliderWindow(n);
};

const legacyFeaturedFlag = (n: CategoryNode): boolean => {
  const r = n as Record<string, unknown>;
  return r.show_on_home === true || r.is_featured === true || r.featured === true || r.homepage === true;
};

function sortAdminSlider(nodes: CategoryNode[]): CategoryNode[] {
  return [...nodes].sort((a, b) => {
    const ar = a as Record<string, unknown>;
    const br = b as Record<string, unknown>;
    const priorityDiff = numberValue(br.homepage_slider_priority, 0) - numberValue(ar.homepage_slider_priority, 0);
    if (priorityDiff !== 0) return priorityDiff;

    const ao = ar.homepage_slider_order == null ? Number.POSITIVE_INFINITY : numberValue(ar.homepage_slider_order, Number.POSITIVE_INFINITY);
    const bo = br.homepage_slider_order == null ? Number.POSITIVE_INFINITY : numberValue(br.homepage_slider_order, Number.POSITIVE_INFINITY);
    if (ao !== bo) return ao - bo;

    const sortDiff = numberValue(ar.sort_order, 0) - numberValue(br.sort_order, 0);
    if (sortDiff !== 0) return sortDiff;

    return a.name.localeCompare(b.name, "tr");
  });
}

/** Satis-odakli slider itemlerini canli agactan uretir (<= max). */
export function buildCollectionSlider(tree: CategoryNode[] | null, max = 50): CategoryItem[] {
  if (!tree) return [];
  const all = flatVisible(tree);

  // Oncelik 1: yeni Admin Homepage Slider alani.
  const adminSliderItems = sortAdminSlider(all.filter(adminSliderFlag));
  if (adminSliderItems.length > 0) return adminSliderItems.slice(0, max).map(toItem);

  // Oncelik 2: eski geriye-uyumlu featured/show_on_home alanlari.
  const flagged = all.filter(legacyFeaturedFlag);
  if (flagged.length > 0) return flagged.slice(0, max).map(toItem);

  // Oncelik 3: satis-oncelik isim eslesme (sira korunur, slug ile dedupe).
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
