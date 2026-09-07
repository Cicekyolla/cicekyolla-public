// ============================================================================
// GLOBAL VERSION 80 — sunucu veri yükleyicisi.
//
// Tek gerçek: production motoru.
//   • Yapılandırma  → global_pages (locale, 'storefront') approved satırı
//   • SEO içeriği   → global_pages (locale, 'home') approved satırı
//   • Ürün/kategori → API /api/public/global/storefront?locale= (tek sorguda
//     çözülmüş kartlar: o dilde approved+slug ∧ active ∧ gerçek fiyat/görsel)
//     — uç henüz yayında değilse (deploy sırası) mevcut katalog uçlarıyla
//     aynı sonuca düşer (surface/catalog + core detay), sayfa asla kırılmaz.
// Cache YOK (no-store): yayından kaldırma anında yansımalı (23 Ağu #161).
// ============================================================================
import type { GlobalLocale } from "../config";
import { V80_DESTINATIONS, type V80Destination } from "./schema";
import { fetchGlobalPage, fetchLocaleCatalog, fetchGlobalPagesInventory, type LocaleCatalog } from "../api";
import { fetchProductBySlug, type PublicProductDetail } from "@/lib/api";
import { mediaUrlOrNull, mediaDerivatives } from "@/lib/media";
import { parseStorefrontConfig, referencedProductIds, type V80Config } from "./schema";
import { resolveV80, WHATSAPP_URL, type V80SourceCategory, type V80SourceProduct, type V80View } from "./view";
import { mergedTexts } from "./copy";
import { SEGMENTS } from "../config";
import type { V80HeaderProps } from "@/components/global/v80/V80Header";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

interface StorefrontBundle {
  config: unknown;
  products: V80SourceProduct[];
  auto_product_ids?: number[];
  categories: V80SourceCategory[];
  pages: string[];
  /** Şehir başına ilçe sayısı (location core) — kartta "N ilçe". */
  destinations?: { slug: string; districts: number }[];
}

async function fetchBundle(locale: GlobalLocale): Promise<StorefrontBundle | null> {
  try {
    const resp = await fetch(`${API_ORIGIN}/api/public/global/storefront?locale=${locale}`, { cache: "no-store" });
    if (!resp.ok) return null;
    const body = (await resp.json()) as { data?: StorefrontBundle };
    const d = body.data;
    if (!d || !Array.isArray(d.products) || !Array.isArray(d.categories)) return null;
    return d;
  } catch {
    return null;
  }
}

function normalizeProduct(p: V80SourceProduct): V80SourceProduct {
  return { ...p, image: mediaUrlOrNull(p.image), derivatives: mediaDerivatives(p.derivatives ?? null) };
}
function normalizeCategory(c: V80SourceCategory): V80SourceCategory {
  return { ...c, image: mediaUrlOrNull(c.image), derivatives: mediaDerivatives(c.derivatives ?? null) };
}

/** Core detay → kaynak ürün (uç yokken; mevcut CatalogSections ile aynı yol). */
function detailToSource(d: PublicProductDetail, localeSlug: string, localeName: string, categorySlugs: string[]): V80SourceProduct {
  const pr = d.product;
  const cover = d.images.find((i) => i.role === "cover") ?? d.images[0];
  return {
    id: Number(pr.id),
    tr_slug: pr.slug,
    slug: localeSlug,
    name: localeName,
    short_description: null,
    price_minor: Number(pr.price_minor),
    sale_price_minor: pr.sale_price_minor == null ? null : Number(pr.sale_price_minor),
    image: cover?.url ?? null,
    blurhash: cover?.blurhash ?? null,
    derivatives: cover?.derivatives ?? null,
    same_day_available: !!pr.same_day_available,
    delivery_model_code: (pr as { delivery_model_code?: string | null }).delivery_model_code ?? null,
    is_new: !!pr.is_new,
    is_bestseller: !!pr.is_bestseller,
    category_slugs: categorySlugs,
  };
}

/** Uç yokken: katalog (o dilde canlı slug+ad) + core detay ile aynı model. */
async function fallbackSources(locale: GlobalLocale, catalog: LocaleCatalog, config: V80Config | null, limit: number) {
  const trBySlug = new Map(catalog.products.map((p) => [p.slug, p.tr_slug]));
  const nameBySlug = new Map(catalog.products.map((p) => [p.slug, p.name]));
  const catsOfLocaleSlug = new Map<string, string[]>();
  for (const c of catalog.categories) for (const s of c.product_slugs ?? []) catsOfLocaleSlug.set(s, [...(catsOfLocaleSlug.get(s) ?? []), c.slug]);
  const localeSlugByTr = new Map(catalog.products.map((p) => [p.tr_slug, p.slug]));

  // Manuel seçim varsa onları; yoksa kataloğun ilk N ürününü çöz.
  const wantedTr: string[] = [];
  const structure = config?.structure;
  if (structure && structure.shop.mode === "manual" && structure.shop.products.length) {
    for (const r of structure.shop.products) if (localeSlugByTr.has(r.tr_slug)) wantedTr.push(r.tr_slug);
  } else {
    for (const p of catalog.products.slice(0, limit)) wantedTr.push(p.tr_slug);
  }
  // Kategori kapakları için her canlı kategorinin ilk ürünü.
  const live = catalog.categories.filter((c) => (c.live_products ?? 0) > 0);
  for (const c of live) {
    const first = (c.product_slugs ?? [])[0];
    const tr = first ? trBySlug.get(first) : undefined;
    if (tr && !wantedTr.includes(tr)) wantedTr.push(tr);
  }
  const details = await Promise.all([...new Set(wantedTr)].map(async (tr) => [tr, await fetchProductBySlug(tr)] as const));
  const byTr = new Map<string, PublicProductDetail>();
  for (const [tr, d] of details) if (d) byTr.set(tr, d);

  const products: V80SourceProduct[] = [];
  for (const tr of wantedTr) {
    const d = byTr.get(tr);
    const ls = localeSlugByTr.get(tr);
    if (!d || !ls) continue;
    products.push(detailToSource(d, ls, nameBySlug.get(ls) ?? d.product.name, catsOfLocaleSlug.get(ls) ?? []));
  }
  const categories: V80SourceCategory[] = live.map((c) => {
    const first = (c.product_slugs ?? [])[0];
    const d = first ? byTr.get(trBySlug.get(first) ?? "") : undefined;
    const cover = d ? d.images.find((i) => i.role === "cover") ?? d.images[0] : undefined;
    return { slug: c.slug, name: c.name, live_products: c.live_products ?? 0, min_price_minor: null, image: cover?.url ?? null, blurhash: cover?.blurhash ?? null, derivatives: cover?.derivatives ?? null };
  });
  return { products: products.slice(0, structure?.shop.mode === "manual" ? undefined : limit), categories };
}

export async function loadV80(locale: GlobalLocale): Promise<V80View> {
  const [home, catalog, bundle] = await Promise.all([
    fetchGlobalPage(locale, "home"),
    fetchLocaleCatalog(locale),
    fetchBundle(locale),
  ]);

  let config: V80Config | null = null;
  let products: V80SourceProduct[];
  let categories: V80SourceCategory[];
  let livePages: Set<string>;

  if (bundle) {
    config = parseStorefrontConfig(bundle.config);
    products = bundle.products.map(normalizeProduct);
    categories = bundle.categories.map(normalizeCategory);
    livePages = new Set(bundle.pages ?? []);
    // Manuel seçim: yalnız referans verilen ürünler, sırayla (resolveV80 sırayı korur).
    if (config && config.structure.shop.mode === "manual" && config.structure.shop.products.length) {
      const wanted = new Set(referencedProductIds(config.structure));
      const picked = products.filter((p) => wanted.has(p.id));
      products = picked;
    } else {
      const autoIds = bundle.auto_product_ids;
      if (autoIds?.length) {
        const order = new Map(autoIds.map((id, i) => [id, i]));
        products = products.filter((p) => order.has(p.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      }
    }
  } else {
    const [row, inventory] = await Promise.all([fetchGlobalPage(locale, "storefront"), fetchGlobalPagesInventory(locale)]);
    config = row?.content_html ? parseStorefrontConfig(row.content_html) : null;
    const limit = config?.structure.shop.limit ?? 12;
    const fb = await fallbackSources(locale, catalog, config, limit);
    products = fb.products;
    categories = fb.categories;
    livePages = new Set((inventory ?? []).map((r) => r.page_key));
  }

  // İlçe sayıları yalnız API paketinden (location core); uç yoksa kartta sayı basılmaz
  // (10 MB'lık SEO envanteri ana sayfa için ÇEKİLMEZ).
  const districtCounts: Partial<Record<V80Destination, number>> = {};
  for (const d of bundle?.destinations ?? []) {
    if ((V80_DESTINATIONS as readonly string[]).includes(d.slug) && d.districts > 0) districtCounts[d.slug as V80Destination] = d.districts;
  }

  return resolveV80({ locale, config, home, products, categories, livePages, districtCounts });
}

/** Ana sayfa dışındaki locale sayfaları için Version 80 başlığı (o dilde canlı kategoriler + varsayılan metinler). */
export function v80HeaderFromCatalog(locale: GlobalLocale, catalog: LocaleCatalog): V80HeaderProps {
  const seg = SEGMENTS[locale];
  const texts = mergedTexts(locale, null);
  const nav = catalog.categories
    .filter((c) => (c.live_products ?? 0) > 0)
    .slice(0, 6)
    .map((c) => ({ key: c.slug, label: c.name, href: `/${locale}/${seg.category}/${c.slug}` }));
  return {
    locale,
    nav,
    t: texts,
    whatsapp: WHATSAPP_URL,
    localeSlugByTr: Object.fromEntries(catalog.products.map((p) => [p.tr_slug, p.slug])),
  };
}
