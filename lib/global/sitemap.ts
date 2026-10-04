// ============================================================================
// GLOBAL Faz 1 — locale sitemap'leri (ADDITIVE; lib/sitemap.ts TR davranışı
// DEĞİŞMEZ). /sitemaps/locale-de.xml, /sitemaps/locale-en.xml.
// Envanter = API surface/inventory (yalnız approved + indexable + slug'lı).
// sitemap.xml TR index'ine BİLEREK eklenmedi: kontrollü index açılışı (Faz 11)
// GSC'ye elle submit ile yapılır; TR index dosyası birebir aynı kalır.
// ============================================================================
import { absoluteUrl } from "@/lib/site-config";
import { GLOBAL_LOCALES, SEGMENTS, type GlobalLocale } from "./config";
import {
  fetchLocaleInventory,
  fetchGlobalPagesInventory,
  fetchLocaleInventoryChecked,
  fetchGlobalPagesInventoryChecked,
  type LocaleInventory,
} from "./api";
// EK (TEK GÖRSEL KAYNAĞI): <image:loc> görünür ürün görseliyle AYNI karardan gelir.
import { servedProductImageUrl } from "@/lib/productImageUrl";

export const LOCALE_SITEMAP_TYPES = GLOBAL_LOCALES.map((l) => `locale-${l}`);

export function localeOfSitemapType(type: string): GlobalLocale | null {
  const m = /^locale-([a-z]{2})$/.exec(type);
  const l = m?.[1];
  return l && (GLOBAL_LOCALES as readonly string[]).includes(l) ? (l as GlobalLocale) : null;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function node(path: string, updatedAt: string | null): string {
  const lastmod = updatedAt && !Number.isNaN(Date.parse(updatedAt))
    ? `<lastmod>${new Date(updatedAt).toISOString()}</lastmod>`
    : "";
  return `<url><loc>${escapeXml(absoluteUrl(path))}</loc>${lastmod}</url>`;
}

// EK (SEO YAYIN ZİNCİRİ) — ADDITIVE: ürün URL'sine kapak görseli.
// Yeni API envanter satırında `image` verir; alan yoksa (eski API) düğüm bugünkü
// `node()` çıktısıyla BİREBİR aynıdır. <image:loc> mutlak URL'dir (r2.dev → /r2
// normalizasyonu + kanonik host; TR images.xml ile aynı kural).
// EK (TEK GÖRSEL KAYNAĞI): adres lib/productImageUrl.ts'ten — stüdyo kopyası olan görsel
// /studio/… adresiyle basılır, kopyası olmayan ölü eski yol hiç basılmaz (PDP'nin gösterdiği dosya).
const IMAGE_NAMESPACE = ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

function productNode(path: string, updatedAt: string | null, image: string | null | undefined): string {
  const imageLoc = servedProductImageUrl(image);
  const base = node(path, updatedAt);
  if (!imageLoc) return base;
  // Görsel etiketi kapanış </url>'den hemen önce eklenir (dilimleme: URL'deki "$" güvenli).
  return `${base.slice(0, -"</url>".length)}<image:image><image:loc>${escapeXml(imageLoc)}</image:loc></image:image></url>`;
}

function localeSitemapXml(
  locale: GlobalLocale,
  inv: LocaleInventory,
  pages: { page_key: string; updated_at: string }[] | null
): string {
  const seg = SEGMENTS[locale];
  const nodes = [
    // global_pages (yalnız approved+indexable döner): home → /de, diğerleri → /de/<page_key>
    ...(pages ?? []).map((g) =>
      node(g.page_key === "home" ? `/${locale}` : `/${locale}/${g.page_key}`, g.updated_at)
    ),
    ...inv.products.map((p) => productNode(`/${locale}/${seg.product}/${p.slug}`, p.updated_at, p.image)),
    ...inv.categories.map((c) => node(`/${locale}/${seg.category}/${c.slug}`, c.updated_at)),
  ];
  // Görsel ad alanı yalnız en az bir görsel düğümü varken bildirilir → API henüz
  // `image` vermiyorken çıktı bugünküyle bayt bayt aynı kalır.
  const imageNamespace = nodes.some((n) => n.includes("<image:image>")) ? IMAGE_NAMESPACE : "";
  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNamespace}>${nodes.join("")}</urlset>`;
}

export async function renderLocaleSitemap(locale: GlobalLocale): Promise<string> {
  const [inv, pages] = await Promise.all([
    fetchLocaleInventory(locale),
    fetchGlobalPagesInventory(locale),
  ]);
  return localeSitemapXml(locale, inv, pages);
}

/**
 * EK (SEO YAYIN ZİNCİRİ): "upstream hatası boş 200 üretmez" — null = iki kaynaktan
 * (yüzey envanteri, global_pages envanteri) biri OKUNAMADI → rota 503. İki uç da
 * tamamlayıcıdır (biri ürün+kategori, diğeri sayfalar): biri eksikse sitemap
 * eksik olur. Yanıt geldi ama liste boşsa bu MEŞRU boşluktur (200 boş urlset).
 */
export async function renderLocaleSitemapOrNull(locale: GlobalLocale): Promise<string | null> {
  const [inv, pages] = await Promise.all([
    fetchLocaleInventoryChecked(locale),
    fetchGlobalPagesInventoryChecked(locale),
  ]);
  if (!inv.ok || !pages.ok) return null;
  // 200 geldi ama zarf beklenen biçimde değilse (liste yok) bu da "okunamadı"dır.
  if (!inv.data || !Array.isArray(inv.data.products) || !Array.isArray(inv.data.categories)) return null;
  if (!Array.isArray(pages.data)) return null;
  return localeSitemapXml(locale, inv.data, pages.data);
}
