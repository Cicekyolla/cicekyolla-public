import { fetchNeighborhoodUrlPage, fetchProductsPaged, fetchSeoInventory, type SeoInventoryItem } from "@/lib/api";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/site-config";
import { getIndexableBlogPosts } from "@/lib/blog";

// ---------------------------------------------------------------------------
// ADDITIVE — pages.xml için indexlenebilir statik kurumsal rotalar.
// Kaynak: app/ dizinindeki GERÇEK route dosyaları (canlıda robots "index,follow"
// doğrulandı). SEO envanterine girmeyen Next.js sayfalarıdır; envanter kayıtları
// (brand/delivery_info) index'e açıldıkça aynı listeye otomatik eklenir, çift
// kayıt urlNode aşamasında path bazında teklenir. /sss, /sik-sorulan-sorular'ın
// ince sarmalayıcısı olduğu için yalnız tam sayfa listeye alındı (duplicate önleme).
// ---------------------------------------------------------------------------
const STATIC_INDEXABLE_PAGES = [
  "/",
  "/hakkimizda",
  "/iletisim",
  "/sik-sorulan-sorular",
  "/kurumsal",
  "/dekorasyon",
  "/teslimat-bolgeleri",
  "/kvkk",
  "/mesafeli-satis-sozlesmesi",
] as const;

export const SITEMAP_TYPES = [
  "pages",
  "categories",
  "products",
  "occasions",
  "locations",
  "neighborhoods",
  "blog",
  "images",
] as const;

export type SitemapType = (typeof SITEMAP_TYPES)[number];

import { GLOBAL_LOCALES } from "@/lib/global/config";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function validDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function getIndexableInventory(): Promise<SeoInventoryItem[]> {
  if (!SITE_INDEXABLE) return [];
  const inventory = await fetchSeoInventory();
  return inventory.filter(
    (item) =>
      item.index_state === "index" &&
      // Mevcut API canonical motoru mahalleyi üst ilçeye canonical eder.
      // Self-canonical olmayan mahalle URL'leri XML/HTML dizine alınmaz.
      item.page_type !== "neighborhood" &&
      item.url_path.startsWith("/") &&
      !item.url_path.includes("?") &&
      !item.url_path.includes("#"),
  );
}

// ---------------------------------------------------------------------------
// ACİL ŞALTER — sitemap'te il kısıtı.
// BOŞ dizi = kısıt YOK; kural yürürlükte: "panelde yayınlandıysa sitemap'te".
// Envanter ucu (/api/public/seo/inventory) zaten YALNIZ status='published'
// kayıtları döndürür, bu yüzden ayrıca yayın kontrolü gerekmez.
// Bir sorun çıkarsa buraya il slug'ı yazmak yeterli (ör. ["istanbul"]) —
// GERİ ALMA TEK SATIR, başka hiçbir yere dokunmadan eski davranışa dönülür.
// ---------------------------------------------------------------------------
export const SITEMAP_PROVINCE_LOCK: string[] = [];

function passesProvinceLock(urlPath: string): boolean {
  if (SITEMAP_PROVINCE_LOCK.length === 0) return true;
  // Derinlik koşulu, kilidin eski startsWith("/istanbul/") davranışıyla
  // birebir aynı kalması için korunur: il-altı en az bir segment şart.
  const seg = urlPath.split("/"); // ["", il, ...]
  return seg.length > 2 && SITEMAP_PROVINCE_LOCK.includes(seg[1]);
}

// ADDITIVE: neighborhoods.xml — panelde yayınlanmış mahalleler (il ayrımı YOK).
// Envanteri bypass eder; doğrudan index_state='index' + page_type='neighborhood'
// çeker. Yayın anında index_state'i admin publish() yazar (seoApi.ts).
export async function getIndexableNeighborhoods(): Promise<SeoInventoryItem[]> {
  if (!SITE_INDEXABLE) return [];
  const inventory = await fetchSeoInventory();
  return inventory.filter(
    (item) =>
      item.index_state === "index" &&
      item.page_type === "neighborhood" &&
      passesProvinceLock(item.url_path) &&
      !item.url_path.includes("?") &&
      !item.url_path.includes("#"),
  );
}

// ---------------------------------------------------------------------------
// EK (MAHALLE SHARD) — ADDITIVE.
// Türkiye geneli lokasyon geri açılışıyla neighborhoods.xml 70 binin üzerine
// çıkıyor; Google'ın sitemap başına sınırı 50.000 URL / 50 MB. Tek dosya hem bu
// sınırı hem de bellek profilini kırar. Bu yüzden mahalleler deterministik
// shard'lara bölünür: neighborhoods-1.xml, neighborhoods-2.xml, ...
//
// Güvenlik payı: 20.000 (limitin %40'ı). Sıralama envanter sırasına sabittir,
// yani aynı veri için aynı URL hep aynı shard'a düşer.
//
// BUGÜN NO-OP: yayında 1.280 mahalle var → tek shard, içeriği bugünküyle
// birebir aynı. Çıplak /sitemaps/neighborhoods.xml adresi de çalışmaya devam
// eder (shard 1 ile aynı) — daha önce gönderilmiş olabileceği için kırılmaz.
// ---------------------------------------------------------------------------
export const NEIGHBORHOOD_SHARD_SIZE = 20_000;

// Tek fetch yanıtının boyutu. 10.000 kayıt ≈ 0,62 MB (gerçek production verisiyle
// ölçüldü) — tüm envanteri (~10,8 MB) çekmeye kıyasla ~17× küçük. SHARD_SIZE bunun
// TAM KATI olmalı (20.000 / 10.000 = 2 sayfa), yoksa shard sınırları kayar.
export const NEIGHBORHOOD_PAGE_SIZE = 10_000;

/** "neighborhoods-3" -> 3 ; "neighborhoods" -> 1 ; eşleşmezse null. */
export function parseNeighborhoodShard(type: string): number | null {
  if (type === "neighborhoods") return 1;
  const m = type.match(/^neighborhoods-(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Saf: toplam URL sayısından shard adedi (en az 1). */
export function shardCountOf(total: number): number {
  return Math.max(1, Math.ceil(total / NEIGHBORHOOD_SHARD_SIZE));
}

/** Saf: 1 tabanlı shard dilimi; aralık dışıysa boş dizi. */
export function shardSliceOf<T>(items: readonly T[], shard: number): T[] {
  const start = (shard - 1) * NEIGHBORHOOD_SHARD_SIZE;
  return start < 0 ? [] : items.slice(start, start + NEIGHBORHOOD_SHARD_SIZE);
}

export async function neighborhoodShardCount(): Promise<number> {
  if (!SITE_INDEXABLE) return 1;
  // Acil şalter aktifse kilit TAM liste üzerinde uygulanmalı — eski yol korunur.
  if (SITEMAP_PROVINCE_LOCK.length > 0) {
    return shardCountOf((await getIndexableNeighborhoods()).length);
  }
  return shardCountOf((await fetchNeighborhoodUrlPage(1, 0)).total);
}

/** 1 tabanlı shard; aralık dışıysa boş urlset (geçerli XML). */
export async function renderNeighborhoodShard(shard: number): Promise<string> {
  const nodes = await neighborhoodShardNodes(shard);
  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes.join("")}</urlset>`;
}

/** Bir shard'ın URL düğümleri — yalnız o pencereyi çeker, tam envanteri DEĞİL. */
async function neighborhoodShardNodes(shard: number): Promise<string[]> {
  if (!SITE_INDEXABLE || shard < 1) return [];
  if (SITEMAP_PROVINCE_LOCK.length > 0) {
    return shardSliceOf(await getIndexableNeighborhoods(), shard).map(urlNode);
  }
  const start = (shard - 1) * NEIGHBORHOOD_SHARD_SIZE;
  const nodes: string[] = [];
  for (let off = start; off < start + NEIGHBORHOOD_SHARD_SIZE; off += NEIGHBORHOOD_PAGE_SIZE) {
    const page = await fetchNeighborhoodUrlPage(NEIGHBORHOOD_PAGE_SIZE, off);
    for (const row of page.items) nodes.push(neighborhoodUrlNode(row));
    if (page.items.length < NEIGHBORHOOD_PAGE_SIZE) break;
  }
  return nodes;
}

/** Kompakt [url_path, updated_at] çiftinden <url> düğümü. */
function neighborhoodUrlNode(row: readonly [string, string]): string {
  const lastmod = row[1] ? validDate(row[1]) : null;
  return [
    "<url>",
    `<loc>${escapeXml(absoluteUrl(row[0]))}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    "</url>",
  ].join("");
}

function matchesType(item: SeoInventoryItem, type: SitemapType): boolean {
  switch (type) {
    case "pages":
      return item.page_type === "brand" || item.page_type === "delivery_info";
    case "categories":
      return item.page_type === "category" || item.page_type === "category_location";
    case "products":
      return item.page_type === "product" || item.page_type === "product_location";
    case "occasions":
      return item.page_type === "special_day";
    case "locations":
      return ["city", "district"].includes(item.page_type);
    case "neighborhoods":
      return item.page_type === "neighborhood";
    case "blog":
      return item.url_path === "/blog" || item.url_path.startsWith("/blog/");
    case "images":
      return false;
  }
}

function urlNode(item: SeoInventoryItem): string {
  const lastmod = validDate(item.updated_at);
  return [
    "<url>",
    `<loc>${escapeXml(absoluteUrl(item.url_path))}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    "</url>",
  ].join("");
}

// ADDITIVE: envanter dışı gerçek rotalar için path bazlı node (lastmod'suz).
function pathNode(path: string): string {
  return `<url><loc>${escapeXml(absoluteUrl(path))}</loc></url>`;
}

// ADDITIVE: pages.xml — statik kurumsal rotalar + envanterdeki index brand/
// delivery_info kayıtları (path bazında teklenir; envanter kaydı lastmod taşır).
function pageNodes(inventory: SeoInventoryItem[]): string[] {
  const invItems = inventory.filter((item) => matchesType(item, "pages"));
  const invPaths = new Set(invItems.map((item) => item.url_path));
  return [
    ...invItems.map(urlNode),
    ...STATIC_INDEXABLE_PAGES.filter((p) => !invPaths.has(p)).map(pathNode),
  ];
}

// ADDITIVE: blog.xml — tek kaynak Admin/DB'deki /blog SEO sayfası
// (getBlogPosts: body_blocks "blog-post" kayıtları; boşsa küratörlü fallback).
// Envanterde /blog path'leri varsa lastmod'larıyla önceliklidir.
async function blogNodes(inventory: SeoInventoryItem[]): Promise<string[]> {
  const invItems = inventory.filter((item) => matchesType(item, "blog"));
  const invPaths = new Set(invItems.map((item) => item.url_path));
  const nodes = invItems.map(urlNode);
  if (!invPaths.has("/blog")) nodes.push(pathNode("/blog"));
  try {
    const posts = await getIndexableBlogPosts();
    for (const post of posts) {
      const slug = typeof post.slug === "string" ? post.slug.trim() : "";
      if (!slug || /[^a-z0-9-]/.test(slug)) continue;
      const path = `/blog/${slug}`;
      if (!invPaths.has(path)) nodes.push(pathNode(path));
    }
  } catch {
    // Blog kaynağına ulaşılamazsa envanter + /blog kökü ile yetinilir.
  }
  return nodes;
}

// ADDITIVE: neighborhoods.xml — İstanbul mahalleleri (getIndexableNeighborhoods).
async function neighborhoodNodes(): Promise<string[]> {
  const neighborhoods = await getIndexableNeighborhoods();
  return neighborhoods.map(urlNode);
}

async function imageNodes(inventory: SeoInventoryItem[]): Promise<string[]> {
  const productItems = inventory.filter(
    (item) => item.page_type === "product" && item.url_path.startsWith("/urun/"),
  );
  if (productItems.length === 0) return [];

  const wanted = new Map(productItems.map((item) => [item.url_path.replace(/^\/urun\//, ""), item]));
  const nodes: string[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await fetchProductsPaged({ page, page_size: 100 });
    totalPages = Math.max(1, result.pagination.total_pages);
    for (const product of result.items) {
      const seoItem = wanted.get(product.slug);
      if (!seoItem?.url_path || !product.cover_image_url) continue;
      const lastmod = validDate(seoItem.updated_at);
      // Sitemap standardı MUTLAK URL ister; DB'deki "/r2/..." proxy yolları
      // aynen basılınca GSC "Geçersiz URL" veriyordu (1294 örnek, 3 Ağu 2026).
      const imageLoc = product.cover_image_url.startsWith("http")
        ? product.cover_image_url
        : absoluteUrl(product.cover_image_url);
      nodes.push(
        [
          "<url>",
          `<loc>${escapeXml(absoluteUrl(seoItem.url_path))}</loc>`,
          lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
          "<image:image>",
          `<image:loc>${escapeXml(imageLoc)}</image:loc>`,
          `<image:title>${escapeXml(product.name)}</image:title>`,
          "</image:image>",
          "</url>",
        ].join(""),
      );
    }
    page += 1;
  } while (page <= totalPages && page <= 500);

  return nodes;
}

export async function renderSitemap(type: SitemapType): Promise<string> {
  const inventory = await getIndexableInventory();
  const nodes =
    type === "images"
      ? await imageNodes(inventory)
      : type === "pages"
        ? pageNodes(inventory)
        : type === "neighborhoods"
          ? await neighborhoodNodes()
          : type === "blog"
            ? await blogNodes(inventory)
            : inventory.filter((item) => matchesType(item, type)).map(urlNode);
  const imageNamespace =
    type === "images" ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "";
  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNamespace}>${nodes.join("")}</urlset>`;
}

export async function renderSitemapIndex(): Promise<string> {
  if (!SITE_INDEXABLE) {
    return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
  }
  // GLOBAL Faz 2 (ADDITIVE): locale sitemap discovery — TR tip listesi ve
  // envanteri DEĞİŞMEDİ; index'e yalnız locale-de/locale-en girişleri eklenir.
  // Bu dosyalar sadece approved+indexable Global URL'leri taşır (boşsa boş urlset).
  // EK (MAHALLE SHARD): index'te tekil "neighborhoods" yerine gerçek shard
  // sayısı kadar neighborhoods-N girişi listelenir. Bugün shard sayısı 1 olduğu
  // için index'e giren tek satır "neighborhoods-1.xml" olur; içeriği bugünkü
  // neighborhoods.xml ile birebir aynıdır.
  const shardCount = await neighborhoodShardCount();
  const neighborhoodTypes = Array.from({ length: shardCount }, (_, i) => `neighborhoods-${i + 1}`);
  const allTypes: string[] = [
    ...SITEMAP_TYPES.filter((t) => t !== "neighborhoods"),
    ...neighborhoodTypes,
    ...GLOBAL_LOCALES.map((l) => `locale-${l}`),
  ];
  const nodes = allTypes.map(
    (type) => `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${type}.xml`))}</loc></sitemap>`,
  ).join("");
  return `${XML_HEADER}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes}</sitemapindex>`;
}
