// EK (2 Kas 2026): İLÇE + ETİKET sayfası (Kadıköy pilotu: /kadikoy/orkideler). Saf modül, düz `node --test`.
// Veri sözleşmesi — seo_page_content.body_blocks (yeni tablo / uç YOK):
//   { type:"tag", city:"istanbul", district:"kadikoy", district_name:"Kadıköy",
//     category_slug:"orkideler", category_name:"Orkideler" }
//   { type:"showcase", mode:"auto", source:{ kind:"category", category_id:N } }   (vitrin: mevcut listeleme motoru)
// Etiket görünümü YALNIZ şu hâlde açılır: page_type=category_location + geçerli tag bloğu + "location" bloğu YOK +
// adres birebir /{district}/{category_slug}. Aksi hâlde null → bugünkü akış birebir (pillar / mahalle / genel).
// "location" bloğu taşıyan sayfa pillar/mahalle şablonuna gider; etiket sayfası onu TAŞIMAMALI.

type WithBlocks = { page_type?: string | null; body_blocks?: unknown } | null | undefined;

export type TagPageInfo = {
  city: string;
  district: string;
  districtName: string;
  categorySlug: string;
  categoryName: string;
  /** İlçe ana ticari sayfası (üst basamak): /kadikoy-cicek-siparisi */
  pillarPath: string;
  /** Genel kategori sayfası: /kategori/orkideler */
  categoryPath: string;
  /** Yalnız İstanbul aynı gün; diğer iller kargo (bağlayıcı iş kuralı). */
  sameDay: boolean;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME = 60;

function blocks(page: WithBlocks): Record<string, unknown>[] {
  const b = page?.body_blocks;
  return Array.isArray(b) ? b.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
}

function slugField(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return SLUG.test(s) ? s : null;
}

function nameField(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s && s.length <= MAX_NAME ? s : null;
}

/** Sayfa etiket sayfası mı? Öyleyse çözülmüş bilgi; değilse null. */
export function getTagPage(page: WithBlocks, path: string): TagPageInfo | null {
  if (!page || page.page_type !== "category_location") return null;
  const all = blocks(page);
  if (all.some((x) => x.type === "location")) return null;
  const tag = all.find((x) => x.type === "tag");
  if (!tag) return null;
  const city = slugField(tag.city);
  const district = slugField(tag.district);
  const categorySlug = slugField(tag.category_slug);
  const districtName = nameField(tag.district_name);
  const categoryName = nameField(tag.category_name);
  if (!city || !district || !categorySlug || !districtName || !categoryName) return null;
  // Mahalle adresleriyle (/{ilçe}/{mahalle}-cicek-siparisi) karışmasın.
  if (categorySlug.endsWith("-cicek-siparisi")) return null;
  if (path !== `/${district}/${categorySlug}`) return null;
  return {
    city, district, districtName, categorySlug, categoryName,
    pillarPath: `/${district}-cicek-siparisi`,
    categoryPath: `/kategori/${categorySlug}`,
    sameDay: city === "istanbul",
  };
}

/** Kırıntı yolu JSON-LD: Ana Sayfa → {İlçe} Çiçekçi (pillar) → sayfa. */
export function tagBreadcrumbJsonLd(info: TagPageInfo, pageName: string, path: string, absoluteUrl: (p: string) => string): string {
  const items = [
    { name: "Ana Sayfa", path: "/" },
    { name: `${info.districtName} Çiçekçi`, path: info.pillarPath },
    { name: pageName || `${info.districtName} ${info.categoryName}`, path },
  ];
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  });
}
