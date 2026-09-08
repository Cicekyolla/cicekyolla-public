// ============================================================================
// GLOBAL VERSION 80 — görünüm modeli çözümleyici (SAF; test edilir).
// Girdi: yapılandırma (DB'den veya varsayılan) + motor verisi (o dilde CANLI
// ürün/kategori, yayımlı lokasyon sayfaları) + SEO satırı (home).
// Çıktı: bileşenlerin doğrudan bastığı, hedefleri çözülmüş, gizlenecekleri
// gizlenmiş model. Burada FETCH YOKTUR.
//
// KURAL: Hedefi çözülemeyen (o dilde canlı olmayan kategori, yayımsız sayfa,
// boş hedef) hiçbir çip/kart/link basılmaz — sahte düğme yasağı.
// ============================================================================
import { DIR, SEGMENTS, type GlobalLocale } from "../config.ts";
import { CITY_NAMES } from "../locationLabels.ts";
import type { GlobalPage } from "../api";
import { mergedTexts, interp } from "./copy.ts";
import {
  defaultConfig, targetHref, type V80Config, type V80Structure, type V80Target, type V80SectionId,
  type V80Destination, type V80CategoryRef, V80_DESTINATIONS,
} from "./schema.ts";

export const WHATSAPP_URL = "https://wa.me/905458813450";

export interface V80ImageMeta {
  blurhash?: string | null;
  derivatives?: { webp?: string; avif?: string; responsive?: Record<string, string> } | null;
}

/** Motorun çözdüğü ürün (fiyat/görsel/teslimat GERÇEK alanlardan). */
export interface V80SourceProduct extends V80ImageMeta {
  id: number;
  tr_slug: string;
  slug: string;
  name: string;
  short_description?: string | null;
  price_minor: number;
  sale_price_minor: number | null;
  image: string | null;
  same_day_available: boolean;
  delivery_model_code: string | null;
  is_new: boolean;
  is_bestseller: boolean;
  /** Ürünün (o dilde canlı) kategori slug'ları — çip filtresi için. */
  category_slugs: string[];
}
/** Motorun çözdüğü kategori (canlı ürün sayısı, en düşük fiyat, kapak görseli). */
export interface V80SourceCategory extends V80ImageMeta {
  tr_slug?: string | null;
  slug: string;
  name: string;
  live_products: number;
  min_price_minor: number | null;
  image: string | null;
}

export interface V80Input {
  locale: GlobalLocale;
  config: V80Config | null;
  home: GlobalPage | null;
  products: V80SourceProduct[];
  categories: V80SourceCategory[];
  /** O dilde APPROVED global_pages anahtarları (destinasyon kartı/hedef için). */
  livePages: Set<string>;
  /** Şehir başına ilçe sayısı (location core) — bilinmiyorsa eksik. */
  districtCounts?: Partial<Record<V80Destination, number>>;
}

export interface V80Product {
  id: number;
  trSlug: string;
  slug: string;
  name: string;
  href: string;
  priceMinor: number;
  originalPriceMinor: number | null;
  image: string | null;
  meta: V80ImageMeta;
  sameDay: boolean;
  cargo: boolean;
  isNew: boolean;
  isBestseller: boolean;
  hasSale: boolean;
  stems: string | null;
  categorySlugs: string[];
}
export interface V80Category {
  slug: string;
  name: string;
  href: string;
  live: number;
  minPriceMinor: number | null;
  image: string | null;
  meta: V80ImageMeta;
}
export type V80Filter = { kind: "category"; slug: string; label: string } | { kind: "destination"; city: V80Destination; label: string };
export interface V80ChipView {
  key: string;
  label: string;
  /** Filtre çipi (vitrin ızgarasını süzer) ya da bağlantı çipi. */
  filter: V80Filter | null;
  href: string | null;
}
export interface V80DiscoveryView { key: string; title: string; chips: V80ChipView[] }

export interface V80View {
  locale: GlobalLocale;
  dir: "ltr" | "rtl";
  texts: Record<string, string>;
  structure: V80Structure;
  sections: V80SectionId[];
  whatsapp: string;
  nav: { key: string; label: string; href: string }[];
  ticker: string[];
  trustMini: { key: string; icon: string; text: string }[];
  discovery: V80DiscoveryView[];
  shop: {
    products: V80Product[];
    limit: number;
    tabs: { key: string; label: string; slug: string | null }[];
    allHref: string | null;
    promo: { image: string | null; href: string | null } | null;
  };
  categories: V80Category[];
  collections: { key: string; category: V80Category; image: string | null }[];
  mood: { key: string; word: string; line: string; sub: string; cta: string; image: string | null; href: string | null; filter: V80Filter | null }[];
  card: { occasions: { key: string; label: string; lines: string[] }[]; href: string | null };
  destinations: { city: V80Destination; name: string; sub: string; image: string | null; href: string | null; sameDay: boolean; districts: number | null }[];
  /** O dilde APPROVED şehir kökleri (footer teslimat sütunu; bölüm yapılandırmasından bağımsız). */
  liveDestinations: V80Destination[];
  journey: { href: string | null };
  ctaHref: string | null;
  trust: { key: string; icon: string; title: string; desc: string }[];
  content: { h1: string | null; intro: string | null; body: string | null; faq: { q: string; a: string }[] };
  /** H1: Vitrin metni geçersiz kılmışsa o; yoksa SEO satırının h1'i (admin); yoksa varsayılan 3 parça. */
  heroTitle: { lines: string[]; em: string | null; source: "override" | "seo" | "default" };
  heroImage: string | null;
  heroImageMobile: string | null;
  heroCtaHref: string | null;
  heroCta2Href: string | null;
}

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
const CARGO_CODES = new Set(["cargo", "same_day_and_cargo"]);

export function toV80Product(locale: GlobalLocale, p: V80SourceProduct): V80Product {
  const seg = SEGMENTS[locale];
  const price = num(p.price_minor);
  const sale = p.sale_price_minor == null ? null : num(p.sale_price_minor);
  const hasSale = sale != null && sale > 0 && sale < price;
  return {
    id: p.id,
    trSlug: p.tr_slug,
    slug: p.slug,
    name: p.name,
    href: `/${locale}/${seg.product}/${p.slug}`,
    priceMinor: hasSale ? (sale as number) : price,
    originalPriceMinor: hasSale ? price : null,
    image: p.image,
    meta: { blurhash: p.blurhash ?? null, derivatives: p.derivatives ?? null },
    sameDay: !!p.same_day_available,
    cargo: !!p.delivery_model_code && CARGO_CODES.has(p.delivery_model_code),
    isNew: !!p.is_new,
    isBestseller: !!p.is_bestseller,
    hasSale,
    stems: p.short_description?.trim() ? p.short_description.trim() : null,
    categorySlugs: p.category_slugs ?? [],
  };
}

function toV80Category(locale: GlobalLocale, c: V80SourceCategory): V80Category {
  return {
    slug: c.slug,
    name: c.name,
    href: `/${locale}/${SEGMENTS[locale].category}/${c.slug}`,
    live: c.live_products,
    minPriceMinor: c.min_price_minor == null ? null : num(c.min_price_minor),
    image: c.image,
    meta: { blurhash: c.blurhash ?? null, derivatives: c.derivatives ?? null },
  };
}

/** Kategori referansı → o dilde canlı kategori (yoksa null → gizle). */
function liveCategory(ref: V80CategoryRef | null, locale: GlobalLocale, bySlug: Map<string, V80Category>): V80Category | null {
  if (!ref) return null;
  const slug = ref.slugs[locale];
  return slug ? bySlug.get(slug) ?? null : null;
}

export function resolveV80(input: V80Input): V80View {
  const { locale } = input;
  const cfg = input.config ?? defaultConfig();
  const s = cfg.structure;
  const texts = mergedTexts(locale, cfg.texts);
  const t = (k: string, vars?: Record<string, string | number>) => interp(texts[k] ?? "", vars);
  const seg = SEGMENTS[locale];

  // Otomatik modda büyük raf önce: canlı ürün sayısına göre azalan (eşitlikte ad); admin elle seçince kendi sırası.
  const categories = input.categories
    .filter((c) => c.live_products > 0)
    .map((c) => toV80Category(locale, c))
    .sort((a, b) => b.live - a.live || a.name.localeCompare(b.name));
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const products = input.products.map((p) => toV80Product(locale, p));
  const liveSlugs = new Set(categories.map((c) => c.slug));
  const hrefCtx = { locale, categorySegment: seg.category, whatsapp: WHATSAPP_URL, liveCategorySlugs: liveSlugs, livePages: input.livePages };
  const href = (target: V80Target) => targetHref(target, hrefCtx);
  const firstCatHref = categories[0]?.href ?? null;

  // Navigasyon: admin listesi boşsa canlı kategoriler (ilk 6).
  const nav = s.nav.length
    ? s.nav.filter((n) => n.enabled).map((n) => ({ key: n.key, label: texts[`x.nav.${n.key}`] ?? "", href: href(n.target) })).filter((n): n is { key: string; label: string; href: string } => !!n.href && !!n.label)
    : categories.slice(0, 6).map((c) => ({ key: c.slug, label: c.name, href: c.href }));

  const filterFromTarget = (target: V80Target): V80Filter | null => {
    if (target.kind === "category") {
      const c = liveCategory(target.ref, locale, catBySlug);
      return c ? { kind: "category", slug: c.slug, label: c.name } : null;
    }
    if (target.kind === "destination") return { kind: "destination", city: target.city, label: CITY_NAMES[locale][target.city] };
    return null;
  };

  const discovery: V80DiscoveryView[] = s.discovery
    .filter((g) => g.enabled)
    .map((g) => {
      let chips: V80ChipView[];
      if (g.auto === "categories") {
        chips = categories.slice(0, 8).map((c) => ({ key: c.slug, label: c.name, filter: { kind: "category", slug: c.slug, label: c.name }, href: c.href }));
      } else if (g.auto === "destinations") {
        chips = s.destinations.items
          .filter((d) => d.enabled)
          .map((d) => ({ key: d.city, label: CITY_NAMES[locale][d.city], filter: { kind: "destination" as const, city: d.city, label: CITY_NAMES[locale][d.city] }, href: input.livePages.has(d.city) ? `/${locale}/${d.city}` : null }));
      } else {
        chips = g.chips
          .filter((c) => c.enabled)
          .map((c) => {
            const filter = filterFromTarget(c.target);
            const link = c.target.kind === "category" || c.target.kind === "destination" ? null : href(c.target);
            return { key: c.key, label: texts[`discovery.chips.${c.key}`] ?? texts[`x.chip.${c.key}`] ?? "", filter, href: link };
          })
          .filter((c) => c.label && (c.filter || c.href));
      }
      return { key: g.key, title: texts[`discovery.groups.${g.key}`] ?? texts[`x.group.${g.key}`] ?? "", chips };
    })
    .filter((g) => g.chips.length > 0 && g.title);

  // Vitrin ürünleri: manuel seçim sırası korunur; motorda çözülemeyen (o dilde
  // canlı olmayan) ürünler zaten input.products'ta yoktur.
  const byId = new Map(products.map((p) => [p.id, p]));
  const shopProducts = s.shop.mode === "manual" && s.shop.products.length
    ? (s.shop.products.map((r) => byId.get(r.id)).filter(Boolean) as V80Product[])
    : products;
  const tabs = s.shop.tabs.length
    ? s.shop.tabs.filter((tb) => tb.enabled).map((tb) => {
        const c = liveCategory(tb.category, locale, catBySlug);
        return c ? { key: tb.key, label: texts[`x.tab.${tb.key}`] ?? c.name, slug: c.slug } : null;
      }).filter((x): x is { key: string; label: string; slug: string } => !!x)
    : categories.slice(0, 4).map((c) => ({ key: c.slug, label: c.name, slug: c.slug }));

  const catItems = s.categories.mode === "manual" && s.categories.items.length
    ? (s.categories.items.map((r) => liveCategory(r, locale, catBySlug)).filter(Boolean) as V80Category[])
    : categories;

  const collections = (s.collections.mode === "manual" && s.collections.items.length
    ? s.collections.items.map((it) => {
        const c = liveCategory(it.category, locale, catBySlug);
        return c ? { key: it.key, category: c, image: it.image ?? c.image } : null;
      }).filter(Boolean)
    : categories.slice(0, 3).map((c) => ({ key: c.slug, category: c, image: c.image }))) as { key: string; category: V80Category; image: string | null }[];

  const mood = s.mood.items
    .filter((m) => m.enabled)
    .map((m) => {
      const filter = filterFromTarget(m.target);
      const link = m.target.kind === "none" ? "#shop" : m.target.kind === "category" || m.target.kind === "destination" ? "#shop" : href(m.target);
      return {
        key: m.key,
        word: texts[`mood.items.${m.key}.word`] ?? texts[`x.mood.${m.key}.word`] ?? "",
        line: texts[`mood.items.${m.key}.line`] ?? texts[`x.mood.${m.key}.line`] ?? "",
        sub: texts[`mood.items.${m.key}.sub`] ?? texts[`x.mood.${m.key}.sub`] ?? "",
        cta: texts[`mood.items.${m.key}.cta`] ?? texts[`x.mood.${m.key}.cta`] ?? "",
        image: m.image,
        href: link,
        filter,
      };
    })
    .filter((m) => m.word && m.line);

  const card = {
    occasions: s.card.occasions
      .filter((o) => o.enabled)
      .map((o) => ({
        key: o.key,
        label: texts[`card.occasions.${o.key}`] ?? "",
        lines: [0, 1, 2, 3].map((i) => texts[`card.lines.${o.key}.${i}`]).filter((x): x is string => !!x),
      }))
      .filter((o) => o.label),
    href: href(s.card.ctaTarget),
  };

  const destinations = s.destinations.items
    .filter((d) => d.enabled)
    .map((d) => ({
      city: d.city,
      name: CITY_NAMES[locale][d.city],
      sub: texts[`destinations.subs.${d.city}`] ?? "",
      image: d.image,
      href: input.livePages.has(d.city) ? `/${locale}/${d.city}` : null,
      sameDay: d.city === "istanbul",
      districts: input.districtCounts?.[d.city] ?? null,
    }));

  const sections = s.sections.filter((x) => x.enabled).map((x) => x.id);
  const ov = cfg.texts;
  const heroTitle: V80View["heroTitle"] =
    ov["hero.title1"] || ov["hero.title2"] || ov["hero.titleEm"]
      ? { lines: [texts["hero.title1"], texts["hero.title2"]].filter(Boolean), em: texts["hero.titleEm"] || null, source: "override" }
      : input.home?.h1?.trim()
        ? { lines: [input.home.h1.trim()], em: null, source: "seo" }
        : { lines: [texts["hero.title1"], texts["hero.title2"]].filter(Boolean), em: texts["hero.titleEm"] || null, source: "default" };
  const promoHref = href(s.shop.promo.target);

  return {
    locale,
    dir: DIR[locale],
    texts,
    structure: s,
    sections,
    whatsapp: WHATSAPP_URL,
    nav,
    ticker: s.ticker.filter((x) => x.enabled).map((x) => texts[`ticker.${x.key}`] ?? texts[`x.ticker.${x.key}`] ?? "").filter(Boolean),
    trustMini: s.trustMini.filter((x) => x.enabled).map((x) => ({ key: x.key, icon: x.icon, text: texts[`trustMini.${x.key}`] ?? texts[`x.trustMini.${x.key}`] ?? "" })).filter((x) => x.text),
    discovery,
    shop: {
      products: shopProducts,
      limit: s.shop.limit,
      tabs,
      allHref: href(s.shop.allTarget) ?? firstCatHref,
      promo: s.shop.promo.enabled ? { image: s.shop.promo.image, href: promoHref } : null,
    },
    categories: catItems.slice(0, s.categories.limit),
    collections,
    mood,
    card,
    destinations,
    liveDestinations: (V80_DESTINATIONS as readonly V80Destination[]).filter((c) => input.livePages.has(c)),
    journey: { href: href(s.journey.ctaTarget) ?? firstCatHref },
    ctaHref: href(s.cta.target) ?? firstCatHref,
    trust: s.trust.items.filter((x) => x.enabled).map((x) => ({ key: x.key, icon: x.icon, title: texts[`trust.${x.key}.title`] ?? "", desc: texts[`trust.${x.key}.desc`] ?? "" })).filter((x) => x.title),
    content: {
      h1: input.home?.h1 ?? null,
      intro: input.home?.intro_html ?? null,
      body: input.home?.content_html ?? null,
      faq: input.home?.faq ?? [],
    },
    heroTitle,
    heroImage: s.hero.image,
    heroImageMobile: s.hero.imageMobile,
    heroCtaHref: href(s.hero.ctaTarget) ?? firstCatHref,
    heroCta2Href: href(s.hero.cta2Target),
  };
}

export { applyFilters } from "./filters.ts";
export const V80_ALL_DESTINATIONS = V80_DESTINATIONS;
