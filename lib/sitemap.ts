import { fetchProductsPaged, fetchSeoInventory, type SeoInventoryItem } from "@/lib/api";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/site-config";
import { getBlogPosts } from "@/lib/blog";

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

// ADDITIVE: neighborhoods.xml — SADECE İstanbul mahalleleri, ayrı filtre.
// Envanteri bypass eder; doğrudan index_state='index' + page_type='neighborhood'
// + İstanbul URL'leri çeker. 974 İstanbul mahallesi beklenir (db doğrulaması).
export async function getIndexableNeighborhoods(): Promise<SeoInventoryItem[]> {
  if (!SITE_INDEXABLE) return [];
  const inventory = await fetchSeoInventory();
  return inventory.filter(
    (item) =>
      item.index_state === "index" &&
      item.page_type === "neighborhood" &&
      item.url_path.startsWith("/istanbul/") &&
      !item.url_path.includes("?") &&
      !item.url_path.includes("#"),
  );
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
    const posts = await getBlogPosts();
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

export function renderSitemapIndex(): string {
  if (!SITE_INDEXABLE) {
    return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
  }
  const nodes = SITEMAP_TYPES.map(
    (type) => `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${type}.xml`))}</loc></sitemap>`,
  ).join("");
  return `${XML_HEADER}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes}</sitemapindex>`;
}
