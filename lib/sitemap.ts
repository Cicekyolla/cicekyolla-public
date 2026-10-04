import {
  fetchCategoryUrls,
  fetchNeighborhoodUrlPage,
  fetchNeighborhoodUrlPageChecked,
  fetchProductsPaged,
  fetchProductUrls,
  fetchSeoInventory,
  fetchSeoInventoryChecked,
  type SeoInventoryItem,
} from "@/lib/api";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/site-config";
import { getIndexableBlogPosts } from "@/lib/blog";
import { isFailedProductPage, isIndexWorthyCategoryRow, type CategoryUrlRow, type ProductUrlRow } from "@/lib/sitemapSources";
import { TR_CATEGORY_DEDICATED_ROUTES } from "@/lib/global/hreflangFamily";
// EK (TEK GÖRSEL KAYNAĞI): <image:loc> görünür ürün görseliyle AYNI karardan gelir.
import { servedProductImageUrl } from "@/lib/productImageUrl";

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
  "/abonelik",
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

function isIndexableInventoryItem(item: SeoInventoryItem): boolean {
  return (
    item.index_state === "index" &&
    // Mevcut API canonical motoru mahalleyi üst ilçeye canonical eder.
    // Self-canonical olmayan mahalle URL'leri XML/HTML dizine alınmaz.
    item.page_type !== "neighborhood" &&
    item.url_path.startsWith("/") &&
    !item.url_path.includes("?") &&
    !item.url_path.includes("#")
  );
}

export async function getIndexableInventory(): Promise<SeoInventoryItem[]> {
  if (!SITE_INDEXABLE) return [];
  const inventory = await fetchSeoInventory();
  return inventory.filter(isIndexableInventoryItem);
}

// ---------------------------------------------------------------------------
// EK (SEO YAYIN ZİNCİRİ) — ADDITIVE: "upstream hatası boş 200 üretmez".
// Yukarıdaki getIndexableInventory() hata hâlinde boş liste döndürür; sitemap
// bunu "kayıt yok" sanıp BOŞ bir 200 urlset basıyor, CDN de 5 dk saklıyordu.
// Aşağıdaki okumalar aynı süzgeci kullanır ama hatayı `failed` ile bildirir;
// rota bunu 503'e çevirir (lib/sitemapSources.ts → sitemapResponse).
// MEŞRU boşluk (önizleme: SITE_INDEXABLE=false) hata DEĞİLDİR — upstream'e hiç
// gidilmez, çıktı bugünküyle aynı kalır.
// ---------------------------------------------------------------------------
type InventoryRead = { items: SeoInventoryItem[]; failed: boolean };
type NodeRead = { nodes: string[]; failed: boolean };

async function readIndexableInventory(): Promise<InventoryRead> {
  if (!SITE_INDEXABLE) return { items: [], failed: false };
  const result = await fetchSeoInventoryChecked();
  return { items: result.items.filter(isIndexableInventoryItem), failed: !result.ok };
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
function isIndexableNeighborhoodItem(item: SeoInventoryItem): boolean {
  return (
    item.index_state === "index" &&
    item.page_type === "neighborhood" &&
    passesProvinceLock(item.url_path) &&
    !item.url_path.includes("?") &&
    !item.url_path.includes("#")
  );
}

export async function getIndexableNeighborhoods(): Promise<SeoInventoryItem[]> {
  if (!SITE_INDEXABLE) return [];
  const inventory = await fetchSeoInventory();
  return inventory.filter(isIndexableNeighborhoodItem);
}

// EK (SEO YAYIN ZİNCİRİ): acil şalter yolunun hatayı bildiren okuması (bkz. readIndexableInventory).
async function readIndexableNeighborhoods(): Promise<InventoryRead> {
  if (!SITE_INDEXABLE) return { items: [], failed: false };
  const result = await fetchSeoInventoryChecked();
  return { items: result.items.filter(isIndexableNeighborhoodItem), failed: !result.ok };
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
  const { nodes } = await neighborhoodShardNodes(shard);
  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes.join("")}</urlset>`;
}

/** EK (SEO YAYIN ZİNCİRİ): null = shard'ın bir sayfası OKUNAMADI → rota 503 (eksik shard 200 ile verilmez). */
export async function renderNeighborhoodShardOrNull(shard: number): Promise<string | null> {
  const { nodes, failed } = await neighborhoodShardNodes(shard);
  if (failed) return null;
  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes.join("")}</urlset>`;
}

/** Bir shard'ın URL düğümleri — yalnız o pencereyi çeker, tam envanteri DEĞİL. */
async function neighborhoodShardNodes(shard: number): Promise<NodeRead> {
  if (!SITE_INDEXABLE || shard < 1) return { nodes: [], failed: false };
  if (SITEMAP_PROVINCE_LOCK.length > 0) {
    const locked = await readIndexableNeighborhoods();
    return { nodes: shardSliceOf(locked.items, shard).map(urlNode), failed: locked.failed };
  }
  const start = (shard - 1) * NEIGHBORHOOD_SHARD_SIZE;
  const nodes: string[] = [];
  for (let off = start; off < start + NEIGHBORHOOD_SHARD_SIZE; off += NEIGHBORHOOD_PAGE_SIZE) {
    // EK (SEO YAYIN ZİNCİRİ): sayfa okunamazsa (null) o ana kadarki düğümlerle
    // çıkılır — eski çıktıyla aynı — ama `failed` işaretlenir; rota eksik shard
    // yerine 503 döner.
    const page = await fetchNeighborhoodUrlPageChecked(NEIGHBORHOOD_PAGE_SIZE, off);
    if (!page) return { nodes, failed: true };
    for (const row of page.items) nodes.push(neighborhoodUrlNode(row));
    if (page.items.length < NEIGHBORHOOD_PAGE_SIZE) break;
  }
  return { nodes, failed: false };
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
// EK (SEO YAYIN ZİNCİRİ): kendi statik rotasından sunulan kategori sayfaları
// (TR_CATEGORY_DEDICATED_ROUTES — ör. /kategori/turkiye-geneli-kargo) index,follow yayınlanır ama
// envanterde kaydı olmadığında HİÇBİR sitemap'te yer almıyordu (kategori ucu da bu yolu kapsamaz).
// Envanterde index kaydı yoksa burada, statik rotalarla aynı biçimde (lastmod'suz) listelenir;
// kayıt yayınlanınca satır categories.xml'e envanterden girer ve buradan kendiliğinden çıkar
// (aynı URL iki sitemap'e yazılmaz). Liste tek kaynaktan: app/kategori altındaki statik rota
// klasörleriyle eşitliği lib/hreflangFamily.test.ts sabitler.
function pageNodes(inventory: SeoInventoryItem[]): string[] {
  const invItems = inventory.filter((item) => matchesType(item, "pages"));
  const invPaths = new Set(invItems.map((item) => item.url_path));
  const allPaths = new Set(inventory.map((item) => item.url_path));
  return [
    ...invItems.map(urlNode),
    ...STATIC_INDEXABLE_PAGES.filter((p) => !invPaths.has(p)).map(pathNode),
    ...[...DEDICATED_CATEGORY_PATHS].filter((p) => !allPaths.has(p)).map(pathNode),
  ];
}

// ADDITIVE: blog.xml — tek kaynak Admin/DB'deki /blog SEO sayfası
// (getBlogPosts: body_blocks "blog-post" kayıtları; boşsa küratörlü fallback).
// Envanterde /blog path'leri varsa lastmod'larıyla önceliklidir.
async function blogNodes(inventory: SeoInventoryItem[]): Promise<NodeRead> {
  const invItems = inventory.filter((item) => matchesType(item, "blog"));
  const invPaths = new Set(invItems.map((item) => item.url_path));
  const nodes = invItems.map(urlNode);
  let failed = false;
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
    failed = true;
  }
  return { nodes, failed };
}

// ADDITIVE: neighborhoods.xml — İstanbul mahalleleri (getIndexableNeighborhoods).
async function neighborhoodNodes(): Promise<string[]> {
  const neighborhoods = await getIndexableNeighborhoods();
  return neighborhoods.map(urlNode);
}

async function imageNodes(inventory: SeoInventoryItem[]): Promise<NodeRead> {
  const productItems = inventory.filter(
    (item) => item.page_type === "product" && item.url_path.startsWith("/urun/"),
  );
  if (productItems.length === 0) return { nodes: [], failed: false };

  const wanted = new Map(productItems.map((item) => [item.url_path.replace(/^\/urun\//, ""), item]));
  const nodes: string[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await fetchProductsPaged({ page, page_size: 100 });
    // EK (SEO YAYIN ZİNCİRİ): fetchProductsPaged hata hâlinde boş sayfa (total 0)
    // döndürür; envanterde ürün varken bu "ürün yok" değil "okunamadı" demektir →
    // eksik images.xml 200 ile verilmez (rota 503 döner).
    if (isFailedProductPage(result.pagination)) return { nodes, failed: true };
    totalPages = Math.max(1, result.pagination.total_pages);
    for (const product of result.items) {
      const seoItem = wanted.get(product.slug);
      if (!seoItem?.url_path || !product.cover_image_url) continue;
      const lastmod = validDate(seoItem.updated_at);
      // Sitemap standardı MUTLAK URL ister; DB'deki "/r2/..." proxy yolları
      // aynen basılınca GSC "Geçersiz URL" veriyordu (1294 örnek, 3 Ağu 2026).
      // EK (TEK GÖRSEL KAYNAĞI): adres vitrinin GERÇEKTEN sunduğu dosyadır (stüdyo kopyası →
      // medya normalizasyonu; "/r2/…" çıktısı bugünküyle aynı). Sunulamayan kapak (stüdyo
      // kopyası olmayan eski yol) için satır basılmaz — yeni yoldaki (productRowNode) kuralla aynı.
      const imageLoc = servedProductImageUrl(product.cover_image_url);
      if (!imageLoc) continue;
      nodes.push(
        [
          "<url>",
          `<loc>${escapeXml(absoluteUrl(seoItem.url_path))}</loc>`,
          lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
          "<image:image>",
          `<image:loc>${escapeXml(imageLoc)}</image:loc>`,
          // <image:title> KALDIRILDI: Google bu etiketi kullanımdan kaldırdı (yok sayıyor).
          "</image:image>",
          "</url>",
        ].join(""),
      );
    }
    page += 1;
  } while (page <= totalPages && page <= 500);

  return { nodes, failed: false };
}

// ---------------------------------------------------------------------------
// EK (SEO YAYIN ZİNCİRİ) — ADDITIVE: products.xml / images.xml TEK KAYNAĞI.
// Sahip kuralı: AKTİF ÜRÜN SİTEMAP DIŞINDA KALAMAZ. Envanter (seo_page) kaydı
// olmayan yeni ürünler products.xml'e giremiyordu (10 Eyl 2026: 205 aktif ürün).
// Kaynak artık GET /api/public/seo/product-urls (aktif ürün başına tek satır).
// Uç yayında değilse (404), hata verirse ya da boş dönerse null → çağıran
// BUGÜNKÜ envanter yoluna düşer (vitrin API'den önce de sonra da yayınlanabilir).
// EK: yanıt EKSİKSE (`incomplete`: yolu geçersiz satır atıldı ya da `total` satır
// sayısından büyük) satırlar yine kullanılır ama çağıran eksikleri envanterle
// TAMAMLAR (readSitemapNodes) → çıktı iki kaynağın hiçbirinden dar olmaz.
// ---------------------------------------------------------------------------
type ActiveProductRows = { rows: ProductUrlRow[]; incomplete: boolean };

async function readActiveProductRows(): Promise<ActiveProductRows | null> {
  if (!SITE_INDEXABLE) return null;
  const result = await fetchProductUrls();
  return result.state === "ok" ? { rows: result.rows, incomplete: result.incomplete === true } : null;
}

/**
 * Aktif ürün satırından <url>; withImage ise kapak görseli <image:image><image:loc> olarak eklenir.
 * withImage iken basılabilir görsel adresi yoksa (boş, `data:`, stüdyo kopyası olmayan eski medya yolu)
 * boş string döner → satır images.xml'e girmez.
 */
function productRowNode(row: ProductUrlRow, withImage: boolean): string {
  const lastmod = row.updated_at ? validDate(row.updated_at) : null;
  // EK (TEK GÖRSEL KAYNAĞI): lib/productImageUrl.ts — görünür <img> ile aynı karar (stüdyo kopyası
  // olan eski yol artık çalışan /studio/… adresiyle basılır; kopyası olmayan ölü yol basılmaz).
  const imageLoc = withImage ? servedProductImageUrl(row.image) : null;
  if (withImage && !imageLoc) return "";
  return [
    "<url>",
    `<loc>${escapeXml(absoluteUrl(row.url_path))}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    imageLoc ? `<image:image><image:loc>${escapeXml(imageLoc)}</image:loc></image:image>` : "",
    "</url>",
  ].join("");
}

// ---------------------------------------------------------------------------
// EK (SEO YAYIN ZİNCİRİ — KATEGORİ YASASI) — ADDITIVE: categories.xml.
// Yasa: "bir kategori sayfası yalnız en az bir aktif ürün listelediği sürece index'e
// değerdir." Ürün kategorisi satırları GET /api/public/seo/category-urls yanıtından gelir ve
// yalnız ürün LİSTELEYENLER (visible_products, yoksa active_products > 0) listelenir (lastmod = updated_at). Uç yayında değilse
// (404), hata verirse ya da yanıt eksik / kullanılamazsa null → BUGÜNKÜ envanter mantığı
// aynen (karar: lib/sitemapSources.ts categoryUrlsResultOf).
// Ucun KAPSAMADIĞI satırlar envanterden bugünkü gibi eklenir:
//   • category_location (konum + kategori sayfaları — ürün kategorisi değildir),
//   • kendi statik rotasından sunulan kategori (ör. /kategori/turkiye-geneli-kargo): listesi
//     kategori bağından değil teslimat profilinden gelir; ucun saydığı "kategoriye bağlı ürün"
//     o sayfanın listelediği ürün sayısı DEĞİLDİR → o URL için envanter kararı geçerli kalır:
//     envanterde index kaydı VARSA burada listelenir; YOKSA pages.xml'de (pageNodes) listelenir.
// ---------------------------------------------------------------------------
const DEDICATED_CATEGORY_PATHS: ReadonlySet<string> = new Set(TR_CATEGORY_DEDICATED_ROUTES.map((slug) => `/kategori/${slug}`));

async function readActiveCategoryRows(): Promise<CategoryUrlRow[] | null> {
  if (!SITE_INDEXABLE) return null;
  const result = await fetchCategoryUrls();
  return result.state === "ok" ? result.rows : null;
}

/** Envanter satırı kategori ucunun kapsamı DIŞINDA mı? (dışındaysa bugünkü gibi envanterden listelenir) */
function isOutsideCategoryUrls(item: SeoInventoryItem): boolean {
  return item.page_type !== "category" || DEDICATED_CATEGORY_PATHS.has(item.url_path);
}

function categoryRowNode(row: CategoryUrlRow): string {
  const lastmod = row.updated_at ? validDate(row.updated_at) : null;
  return ["<url>", `<loc>${escapeXml(absoluteUrl(row.url_path))}</loc>`, lastmod ? `<lastmod>${lastmod}</lastmod>` : "", "</url>"].join("");
}

/** Bir sitemap tipinin düğümleri + "kaynak okunamadı" bilgisi (tek uygulama; iki render da bunu kullanır). */
async function readSitemapNodes(type: SitemapType): Promise<NodeRead> {
  if (type === "categories") {
    // İki okuma PARALEL (ek bekleme yok); envanter iki yolda da gerekir (category_location satırları).
    const [rows, inv] = await Promise.all([readActiveCategoryRows(), readIndexableInventory()]);
    const fromInventory = inv.items.filter((item) => matchesType(item, type));
    // Uç yok / kullanılamadı → bugünkü envanter mantığı birebir.
    if (!rows) return { nodes: fromInventory.map(urlNode), failed: inv.failed };
    // Envanter OKUNAMADIYSA ucun kapsamadığı satırlar eksik kalırdı → eksik sitemap 200 ile
    // verilmez (`failed` → rota 503; bugünkü kuralın aynısı).
    const outside = fromInventory.filter(isOutsideCategoryUrls);
    const outsidePaths = new Set(outside.map((item) => item.url_path));
    const nodes = [
      ...rows.filter((row) => isIndexWorthyCategoryRow(row) && !outsidePaths.has(row.url_path)).map(categoryRowNode),
      ...outside.map(urlNode),
    ];
    return { nodes, failed: inv.failed };
  }
  if (type === "products" || type === "images") {
    const active = await readActiveProductRows();
    if (active) {
      const nodes =
        type === "images"
          ? active.rows.map((row) => productRowNode(row, true)).filter((node) => node !== "")
          : active.rows.map((row) => productRowNode(row, false));
      if (!active.incomplete) return { nodes, failed: false };
      // EK — EKSİK YANIT: ürün ucunun KAPSAMADIĞI yollar bugünkü envanter mantığıyla eklenir
      // (birleşim). Envanter yalnız bu olağan dışı durumda okunur; okunamazsa eldeki aktif
      // satırlarla yetinilir (kaynak ucu yanıt verdi → 503 değil; eksik zaten günlüğe yazıldı).
      const covered = new Set(active.rows.map((row) => row.url_path));
      const rest = (await readIndexableInventory()).items.filter((item) => !covered.has(item.url_path));
      if (type === "images") return { nodes: [...nodes, ...(await imageNodes(rest)).nodes], failed: false };
      return { nodes: [...nodes, ...rest.filter((item) => matchesType(item, "products")).map(urlNode)], failed: false };
    }
  }
  const { items: inventory, failed } = await readIndexableInventory();
  if (type === "images") {
    const legacy = await imageNodes(inventory);
    return { nodes: legacy.nodes, failed: failed || legacy.failed };
  }
  if (type === "pages") return { nodes: pageNodes(inventory), failed };
  if (type === "neighborhoods") return { nodes: await neighborhoodNodes(), failed };
  if (type === "blog") {
    // Blog'un URL kümesi yazı listesinden gelir (envanter yalnız lastmod katar):
    // yalnız İKİ kaynak da okunamadıysa "üretilemedi" sayılır.
    const blog = await blogNodes(inventory);
    return { nodes: blog.nodes, failed: failed && blog.failed };
  }
  return { nodes: inventory.filter((item) => matchesType(item, type)).map(urlNode), failed };
}

function sitemapXml(type: SitemapType, nodes: string[]): string {
  const imageNamespace =
    type === "images" ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "";
  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNamespace}>${nodes.join("")}</urlset>`;
}

export async function renderSitemap(type: SitemapType): Promise<string> {
  return sitemapXml(type, (await readSitemapNodes(type)).nodes);
}

/** EK (SEO YAYIN ZİNCİRİ): null = bu tipin kaynağı OKUNAMADI → rota 503 (boş/eksik sitemap 200 ile verilmez). */
export async function renderSitemapOrNull(type: SitemapType): Promise<string | null> {
  const { nodes, failed } = await readSitemapNodes(type);
  return failed ? null : sitemapXml(type, nodes);
}

export async function renderSitemapIndex(): Promise<string> {
  if (!SITE_INDEXABLE) {
    return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
  }
  return sitemapIndexXml(await neighborhoodShardCount());
}

/**
 * EK (SEO YAYIN ZİNCİRİ): null = mahalle shard sayısı OKUNAMADI → rota 503.
 * Aksi hâlde index yalnız neighborhoods-1 ile (diğer shard'lar eksik) 200 dönüyor
 * ve CDN bu eksik index'i 5 dk saklıyordu.
 */
export async function renderSitemapIndexOrNull(): Promise<string | null> {
  if (!SITE_INDEXABLE) return renderSitemapIndex();
  if (SITEMAP_PROVINCE_LOCK.length > 0) {
    // Acil şalter aktifse kilit TAM liste üzerinde uygulanır (neighborhoodShardCount ile aynı kural).
    const locked = await readIndexableNeighborhoods();
    return locked.failed ? null : sitemapIndexXml(shardCountOf(locked.items.length));
  }
  const first = await fetchNeighborhoodUrlPageChecked(1, 0);
  return first ? sitemapIndexXml(shardCountOf(first.total)) : null;
}

function sitemapIndexXml(shardCount: number): string {
  // GLOBAL Faz 2 (ADDITIVE): locale sitemap discovery — TR tip listesi ve
  // envanteri DEĞİŞMEDİ; index'e yalnız locale-de/locale-en girişleri eklenir.
  // Bu dosyalar sadece approved+indexable Global URL'leri taşır (boşsa boş urlset).
  // EK (MAHALLE SHARD): index'te tekil "neighborhoods" yerine gerçek shard
  // sayısı kadar neighborhoods-N girişi listelenir. Bugün shard sayısı 1 olduğu
  // için index'e giren tek satır "neighborhoods-1.xml" olur; içeriği bugünkü
  // neighborhoods.xml ile birebir aynıdır.
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
