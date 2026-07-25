// ============================================================================
// lib/homepageShowcase.ts — Figma V61/V64 premium vitrin doldurma (server-side).
// Admin Homepage'deki BOŞ product_showcase bölümleri (ürün atanmamış) canlı
// katalogdan doldurulur. DTO'da ürün VARSA DTO kazanır (admin üstünlüğü) —
// bkz. HomepageRenderer. Mock YOK: tüm ürünler /api/products'tan gelir;
// hiç ürün bulunamazsa vitrin gizli kalır (boş kart/skeleton YOK).
// Sıra sözleşmesi: yayındaki boş vitrinler sırayla A) Orkide, B) Fırsat,
// C) Saksı, D) Premium olarak eşlenir.
// ============================================================================
import { fetchProducts, type CategoryNode, type PublicProductListItem } from "./api";
import { findCategoryIdBySlug } from "./catalog";
import type { HpProduct } from "./homepage";

export interface ShowcaseFill {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  products: HpProduct[];
}

interface ShowcaseSpec {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  /** Canlı ağaçta sırayla denenecek kategori slug'ları (doğrudan bağ arar). */
  categorySlugs: string[];
  /** Kategoriler yetersiz kalırsa güvenli tamamlama stratejisi. */
  topup?: "sale" | "plant" | "price_desc";
}

// Kullanıcı kuralı: 12 ürün = her cihazda tam satır (2/3/4 sütunun OKEK'i).
const LIMIT = 12;

const SPECS: ShowcaseSpec[] = [
  {
    title: "Zarafetin En Saf Hali: Orkideler",
    subtitle: "Kalıcı, asil ve etkileyici orkide aranjmanlarıyla özel anlara değer katın.",
    ctaLabel: "Orkideleri Keşfet",
    ctaHref: "/kategori/orkideler",
    categorySlugs: ["orkideler", "beyaz-orkide", "mor-orkide", "pembe-orkide", "saksida-orkide", "premium-orkide"],
  },
  {
    title: "Bugüne Özel Seçili Fırsatlar",
    subtitle: "Premium çiçekleri özel fiyatlarla bugün teslim avantajıyla gönderin.",
    ctaLabel: "Fırsatları Gör",
    ctaHref: "/kategori/kampanyalar",
    categorySlugs: ["kampanyalar", "indirimli-urunler", "haftanin-firsatlari"],
    topup: "sale",
  },
  {
    title: "Yaşayan Hediyeler: Saksı Çiçekleri",
    subtitle: "Ev, ofis ve özel alanlar için uzun ömürlü, şık ve bakımı kolay çiçekler.",
    ctaLabel: "Saksı Çiçeklerini İncele",
    ctaHref: "/kategori/saksi-bitkileri",
    categorySlugs: ["saksi-bitkileri", "cicekli-saksi-bitkileri", "salon-bitkileri", "saksida-orkide"],
    topup: "plant",
  },
  {
    title: "Premium Çiçek Koleksiyonu",
    subtitle: "Özel tasarım buketler, lüks aranjmanlar ve unutulmaz hediye seçenekleri.",
    ctaLabel: "Premium Koleksiyonu Keşfet",
    ctaHref: "/kategori/premium-koleksiyon",
    categorySlugs: ["premium-koleksiyon", "luks-koleksiyon", "premium-buketler", "luks-aranjmanlar", "koleksiyonlar"],
    topup: "price_desc",
  },
];

// toCardProduct/ProductShowcase ile AYNI indirim geçerlilik kuralı.
function hasValidSale(p: PublicProductListItem): boolean {
  return p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
}

function toHpProduct(p: PublicProductListItem): HpProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price_minor: Number(p.price_minor),
    sale_price_minor: hasValidSale(p) ? Number(p.sale_price_minor) : null,
    is_new: p.is_new,
    cover_image_url: p.cover_image_url,
    pinned: false,
  };
}

async function buildFill(spec: ShowcaseSpec, tree: CategoryNode[] | null): Promise<ShowcaseFill> {
  const seen = new Set<number>();
  const rows: PublicProductListItem[] = [];
  const push = (list: PublicProductListItem[]) => {
    for (const p of list) {
      if (rows.length >= LIMIT) break;
      if (!p.cover_image_url || seen.has(p.id)) continue; // görselsiz ürün vitrine çıkmaz
      seen.add(p.id);
      rows.push(p);
    }
  };

  for (const slug of spec.categorySlugs) {
    if (rows.length >= LIMIT) break;
    const categoryId = tree ? findCategoryIdBySlug(tree, slug) : null;
    if (!categoryId) continue; // slug canlı ağaçta yoksa sessizce sıradakine geç
    push(await fetchProducts({ category_id: categoryId, page_size: LIMIT * 2, sort: "created_at_desc" }));
  }

  if (rows.length < LIMIT && spec.topup === "sale") {
    // Backend'de indirim filtresi yok → geniş liste çekilip sale_price_minor
    // GERÇEKTEN geçerli olanlar (0 < sale < price) sunucu tarafında süzülür.
    push((await fetchProducts({ page_size: 60, sort: "created_at_desc" })).filter(hasValidSale));
  } else if (rows.length < LIMIT && spec.topup === "plant") {
    push(await fetchProducts({ product_type: "plant", page_size: 60, sort: "created_at_desc" }));
  } else if (rows.length < LIMIT && spec.topup === "price_desc") {
    // Premium fallback (kullanıcı şartı): koleksiyon kategorisi yetersizse
    // yüksek fiyatlı gerçek ürünler gösterilir.
    push(await fetchProducts({ page_size: 60, sort: "price_desc" }));
  }

  return { title: spec.title, subtitle: spec.subtitle, ctaLabel: spec.ctaLabel, ctaHref: spec.ctaHref, products: rows.map(toHpProduct) };
}

/** 4 vitrini paralel doldurur. API hatasında ilgili vitrin boş kalır → gizlenir. */
export async function buildShowcaseFills(tree: CategoryNode[] | null): Promise<ShowcaseFill[]> {
  return Promise.all(SPECS.map((spec) => buildFill(spec, tree)));
}
