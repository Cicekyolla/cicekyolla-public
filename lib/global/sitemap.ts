// ============================================================================
// GLOBAL Faz 1 — locale sitemap'leri (ADDITIVE; lib/sitemap.ts TR davranışı
// DEĞİŞMEZ). /sitemaps/locale-de.xml, /sitemaps/locale-en.xml.
// Envanter = API surface/inventory (yalnız approved + indexable + slug'lı).
// sitemap.xml TR index'ine BİLEREK eklenmedi: kontrollü index açılışı (Faz 11)
// GSC'ye elle submit ile yapılır; TR index dosyası birebir aynı kalır.
// ============================================================================
import { absoluteUrl } from "@/lib/site-config";
import { GLOBAL_LOCALES, SEGMENTS, type GlobalLocale } from "./config";
import { fetchLocaleInventory } from "./api";

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

export async function renderLocaleSitemap(locale: GlobalLocale): Promise<string> {
  const inv = await fetchLocaleInventory(locale);
  const seg = SEGMENTS[locale];
  const nodes = [
    ...inv.products.map((p) => node(`/${locale}/${seg.product}/${p.slug}`, p.updated_at)),
    ...inv.categories.map((c) => node(`/${locale}/${seg.category}/${c.slug}`, c.updated_at)),
  ];
  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes.join("")}</urlset>`;
}
