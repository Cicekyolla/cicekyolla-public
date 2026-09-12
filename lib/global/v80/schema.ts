// ============================================================================
// GLOBAL VERSION 80 — vitrin yapılandırma sözleşmesi (saf modül; test edilir).
//
// NEREDE SAKLANIR: mevcut `global_pages` tablosu, `page_key = 'storefront'`,
// satır başına bir locale. `content_html` alanı bu JSON belgesini taşır;
// `h1` = hero başlığı (onay için zorunlu alan); `indexable` DAİMA false
// (sitemap/hreflang'e girmez, /xx/storefront diye bir sayfa yoktur → 404).
// Yeni tablo/kolon/migration YOK; yayın modeli mevcut draft/approved modelidir.
//
// İKİ KATMAN:
//   structure → dil-BAĞIMSIZ (bölüm sırası/görünürlük, ürün seçimi, hedefler,
//               görseller). Admin kaydederken 13 dile de aynen yazılır.
//   texts     → dil-BAĞIMLI metin geçersiz kılmaları (flat anahtar → metin).
//               Boş anahtar = kodda gömülü varsayılan (copy.ts) kullanılır.
//
// KURAL: Bu dosyada ürün/fiyat/kategori verisi TUTULMAZ; yalnız REFERANS tutulur
// (ürün id + TR slug, kategori id + locale slug haritası). Gerçek veri motordan.
// Admin deposunda aynı sözleşmenin kopyası vardır (globalStorefrontSchema.ts);
// alan eklerken ikisini birlikte güncelle.
// ============================================================================

export const V80_SCHEMA_VERSION = 1;
export const V80_PAGE_KEY = "storefront";

export const V80_SECTION_IDS = [
  "hero",
  "ticker",
  "discovery",
  "shop",
  "categories",
  "delivery",
  "collections",
  "mood",
  "card",
  "destinations",
  "journey",
  "reviews",
  "cta",
  "trust",
  "content",
] as const;
export type V80SectionId = (typeof V80_SECTION_IDS)[number];

export const V80_ICONS = ["lock", "whatsapp", "clock", "leaf", "truck", "shield", "card", "star", "map"] as const;
export type V80Icon = (typeof V80_ICONS)[number];

export const V80_DESTINATIONS = ["istanbul", "antalya", "mugla", "izmir"] as const;
/** 13 Global locale (lib/global/config.ts GLOBAL_LOCALES ile birebir; yaprak modül olsun diye burada tekrarlanır — test eşitliği korur). */
export const V80_LOCALES = ["de", "en", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"] as const;
export type V80Destination = (typeof V80_DESTINATIONS)[number];

/** Kategori referansı — id + TR slug + o kategorinin yayımlı locale slug'ları. */
export interface V80CategoryRef {
  id: number;
  tr_slug: string;
  slugs: Record<string, string>;
}
/** Ürün referansı — gerçek ürün kaydına işaret; veri motordan çözülür. */
export interface V80ProductRef {
  id: number;
  tr_slug: string;
}

export type V80Target =
  | { kind: "anchor"; id: string }
  | { kind: "category"; ref: V80CategoryRef }
  | { kind: "destination"; city: V80Destination }
  | { kind: "page"; key: string }
  | { kind: "url"; href: string }
  | { kind: "whatsapp" }
  | { kind: "none" };

export interface V80Chip {
  key: string;
  target: V80Target;
  enabled: boolean;
}
export interface V80DiscoveryGroup {
  key: string;
  enabled: boolean;
  /** "categories" → o dilde canlı kategoriler otomatik; "destinations" → şehirler otomatik; null → elle çipler. */
  auto: "categories" | "destinations" | null;
  chips: V80Chip[];
}

export interface V80Structure {
  sections: { id: V80SectionId; enabled: boolean }[];
  hero: { image: string | null; imageMobile: string | null; ctaTarget: V80Target; cta2Target: V80Target };
  nav: { key: string; target: V80Target; enabled: boolean }[];
  ticker: { key: string; enabled: boolean }[];
  trustMini: { key: string; icon: V80Icon; enabled: boolean }[];
  discovery: V80DiscoveryGroup[];
  shop: {
    mode: "auto" | "manual";
    products: V80ProductRef[];
    limit: number;
    tabs: { key: string; category: V80CategoryRef | null; enabled: boolean }[];
    allTarget: V80Target;
    promo: { enabled: boolean; image: string | null; target: V80Target };
  };
  categories: { mode: "auto" | "manual"; items: V80CategoryRef[]; limit: number };
  delivery: { items: { key: string; enabled: boolean }[] };
  collections: { mode: "auto" | "manual"; items: { key: string; category: V80CategoryRef; image: string | null }[] };
  mood: { items: { key: string; image: string | null; target: V80Target; enabled: boolean }[] };
  card: { occasions: { key: string; enabled: boolean }[]; ctaTarget: V80Target };
  destinations: { items: { city: V80Destination; image: string | null; enabled: boolean }[] };
  journey: { ctaTarget: V80Target };
  cta: { target: V80Target };
  trust: { items: { key: string; icon: V80Icon; enabled: boolean }[] };
}

export interface V80Config {
  v: number;
  structure: V80Structure;
  texts: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Varsayılan yapı — Figma Version 80 bölüm sırası. Ürün/kategori seçimi "auto":
// motorun o dilde CANLI dediği ürün/kategoriler. Vesile/kime çiplerinin hedefi
// yoktur (Figma'daki sahte filtre) → admin gerçek kategori bağlayana kadar GİZLİ.
// ---------------------------------------------------------------------------
export function defaultStructure(): V80Structure {
  return {
    sections: V80_SECTION_IDS.map((id) => ({ id, enabled: id !== "card" ? true : true })),
    hero: {
      image: "/global/v80/hero.jpg",
      imageMobile: null,
      ctaTarget: { kind: "anchor", id: "shop" },
      cta2Target: { kind: "anchor", id: "journey" },
    },
    nav: [],
    ticker: ["hand", "since", "fresh", "world", "types", "care"].map((key) => ({ key, enabled: true })),
    trustMini: [
      { key: "ssl", icon: "lock", enabled: true },
      { key: "whatsapp", icon: "whatsapp", enabled: true },
      { key: "since", icon: "clock", enabled: true },
    ],
    discovery: [
      {
        key: "who",
        enabled: true,
        auto: null,
        chips: ["mother", "partner", "friend", "colleague", "sibling", "family"].map((key) => ({ key, target: { kind: "none" } as V80Target, enabled: true })),
      },
      {
        key: "occasion",
        enabled: true,
        auto: null,
        chips: ["birthday", "anniversary", "condolence", "thanks", "sorry", "surprise"].map((key) => ({ key, target: { kind: "none" } as V80Target, enabled: true })),
      },
      { key: "what", enabled: true, auto: "categories", chips: [] },
      { key: "where", enabled: true, auto: "destinations", chips: [] },
    ],
    shop: {
      mode: "auto",
      products: [],
      limit: 12,
      tabs: [],
      allTarget: { kind: "none" },
      promo: { enabled: true, image: "/global/v80/atelier.jpg", target: { kind: "anchor", id: "journey" } },
    },
    categories: { mode: "auto", items: [], limit: 8 },
    delivery: { items: [{ key: "istanbul", enabled: true }, { key: "cargo", enabled: true }, { key: "cities", enabled: true }] },
    collections: { mode: "auto", items: [] },
    mood: {
      items: ["love", "birthday", "sorry", "thanks", "condolence"].map((key, i) => ({
        key,
        image: `/global/v80/mood-${i + 1}.jpg`,
        target: { kind: "none" } as V80Target,
        enabled: true,
      })),
    },
    card: {
      occasions: ["love", "birthday", "sorry", "thanks", "condolence", "getwell"].map((key) => ({ key, enabled: true })),
      ctaTarget: { kind: "anchor", id: "shop" },
    },
    destinations: {
      items: V80_DESTINATIONS.map((city, i) => ({ city, image: `/global/v80/city-${i + 1}.jpg`, enabled: true })),
    },
    journey: { ctaTarget: { kind: "anchor", id: "shop" } },
    cta: { target: { kind: "anchor", id: "shop" } },
    trust: {
      items: [
        { key: "pay", icon: "lock", enabled: true },
        { key: "sameday", icon: "truck", enabled: true },
        { key: "whatsapp", icon: "whatsapp", enabled: true },
        { key: "fresh", icon: "leaf", enabled: true },
      ],
    },
  };
}

export function defaultConfig(): V80Config {
  return { v: V80_SCHEMA_VERSION, structure: defaultStructure(), texts: {} };
}

// ---------------------------------------------------------------------------
// Toleranslı ayrıştırıcı: DB'deki JSON eksik/bozuk alan taşıyorsa varsayılana
// düşer; ASLA throw etmez (vitrin hiçbir zaman config yüzünden kırılmaz).
// ---------------------------------------------------------------------------
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const bool = (v: unknown, d: boolean): boolean => (typeof v === "boolean" ? v : d);
const strOrNull = (v: unknown): string | null => (isStr(v) && v.trim() ? v.trim() : null);
const SAFE_KEY = /^[a-z0-9_-]{1,40}$/i;
const SAFE_HREF = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

export function parseTarget(v: unknown): V80Target {
  if (!isObj(v) || !isStr(v.kind)) return { kind: "none" };
  switch (v.kind) {
    case "anchor":
      return isStr(v.id) && SAFE_KEY.test(v.id) ? { kind: "anchor", id: v.id } : { kind: "none" };
    case "category": {
      const ref = parseCategoryRef(v.ref);
      return ref ? { kind: "category", ref } : { kind: "none" };
    }
    case "destination":
      return (V80_DESTINATIONS as readonly string[]).includes(String(v.city))
        ? { kind: "destination", city: v.city as V80Destination }
        : { kind: "none" };
    case "page":
      return isStr(v.key) && /^[a-z0-9-]+(\/[a-z0-9-]+){0,2}$/.test(v.key) ? { kind: "page", key: v.key } : { kind: "none" };
    case "url":
      return isStr(v.href) && SAFE_HREF.test(v.href) && !/^\/\//.test(v.href) ? { kind: "url", href: v.href } : { kind: "none" };
    case "whatsapp":
      return { kind: "whatsapp" };
    default:
      return { kind: "none" };
  }
}

export function parseCategoryRef(v: unknown): V80CategoryRef | null {
  if (!isObj(v) || !isNum(v.id) || !isStr(v.tr_slug)) return null;
  const slugs: Record<string, string> = {};
  if (isObj(v.slugs)) for (const [k, s] of Object.entries(v.slugs)) if (isStr(s) && (V80_LOCALES as readonly string[]).includes(k) && s.trim()) slugs[k] = s.trim();
  return { id: v.id, tr_slug: v.tr_slug, slugs };
}

function parseProductRef(v: unknown): V80ProductRef | null {
  if (!isObj(v) || !isNum(v.id) || !isStr(v.tr_slug)) return null;
  return { id: v.id, tr_slug: v.tr_slug };
}

function parseIcon(v: unknown, d: V80Icon): V80Icon {
  return (V80_ICONS as readonly string[]).includes(String(v)) ? (v as V80Icon) : d;
}

function keyed<T extends { key: string }>(v: unknown, d: T[], map: (item: Record<string, unknown>, fallback: T | undefined) => T | null): T[] {
  if (!Array.isArray(v)) return d;
  const out: T[] = [];
  for (const raw of v) {
    if (!isObj(raw) || !isStr(raw.key) || !SAFE_KEY.test(raw.key)) continue;
    const item = map(raw, d.find((x) => x.key === raw.key));
    if (item) out.push(item);
  }
  return out;
}

export function parseStructure(v: unknown): V80Structure {
  const d = defaultStructure();
  if (!isObj(v)) return d;
  const s: V80Structure = { ...d };

  if (Array.isArray(v.sections)) {
    const seen = new Set<V80SectionId>();
    const list: V80Structure["sections"] = [];
    for (const raw of v.sections) {
      if (!isObj(raw) || !(V80_SECTION_IDS as readonly string[]).includes(String(raw.id))) continue;
      const id = raw.id as V80SectionId;
      if (seen.has(id)) continue;
      seen.add(id);
      list.push({ id, enabled: bool(raw.enabled, true) });
    }
    // Bilinmeyen/eksik bölümler sona eklenir (yeni bölüm eski kayıtta görünmez kalmasın).
    for (const id of V80_SECTION_IDS) if (!seen.has(id)) list.push({ id, enabled: true });
    s.sections = list;
  }

  if (isObj(v.hero)) {
    s.hero = {
      image: v.hero.image === null ? null : strOrNull(v.hero.image) ?? d.hero.image,
      imageMobile: strOrNull(v.hero.imageMobile),
      ctaTarget: v.hero.ctaTarget === undefined ? d.hero.ctaTarget : parseTarget(v.hero.ctaTarget),
      cta2Target: v.hero.cta2Target === undefined ? d.hero.cta2Target : parseTarget(v.hero.cta2Target),
    };
  }

  s.nav = keyed(v.nav, d.nav, (r) => ({ key: r.key as string, target: parseTarget(r.target), enabled: bool(r.enabled, true) }));
  s.ticker = keyed(v.ticker, d.ticker, (r) => ({ key: r.key as string, enabled: bool(r.enabled, true) }));
  s.trustMini = keyed(v.trustMini, d.trustMini, (r, f) => ({ key: r.key as string, icon: parseIcon(r.icon, f?.icon ?? "star"), enabled: bool(r.enabled, true) }));

  s.discovery = keyed(v.discovery, d.discovery, (r, f) => ({
    key: r.key as string,
    enabled: bool(r.enabled, true),
    auto: r.auto === "categories" || r.auto === "destinations" ? r.auto : r.auto === null ? null : f?.auto ?? null,
    chips: keyed(r.chips, f?.chips ?? [], (c) => ({ key: c.key as string, target: parseTarget(c.target), enabled: bool(c.enabled, true) })),
  }));

  if (isObj(v.shop)) {
    const sh = v.shop;
    const promo = isObj(sh.promo) ? sh.promo : {};
    s.shop = {
      mode: sh.mode === "manual" ? "manual" : "auto",
      products: Array.isArray(sh.products) ? (sh.products.map(parseProductRef).filter(Boolean) as V80ProductRef[]) : [],
      // Üst sınır 12 Eyl 2026'da 48 → 80 (admin şemasıyla AYNI değer olmalı).
      limit: isNum(sh.limit) ? Math.min(80, Math.max(4, Math.round(sh.limit))) : d.shop.limit,
      tabs: keyed(sh.tabs, [], (r) => ({ key: r.key as string, category: parseCategoryRef(r.category), enabled: bool(r.enabled, true) })),
      allTarget: sh.allTarget === undefined ? d.shop.allTarget : parseTarget(sh.allTarget),
      promo: {
        enabled: bool(promo.enabled, true),
        image: promo.image === null ? null : strOrNull(promo.image) ?? d.shop.promo.image,
        target: promo.target === undefined ? d.shop.promo.target : parseTarget(promo.target),
      },
    };
  }

  if (isObj(v.categories)) {
    s.categories = {
      mode: v.categories.mode === "manual" ? "manual" : "auto",
      items: Array.isArray(v.categories.items) ? (v.categories.items.map(parseCategoryRef).filter(Boolean) as V80CategoryRef[]) : [],
      limit: isNum(v.categories.limit) ? Math.min(12, Math.max(3, Math.round(v.categories.limit))) : d.categories.limit,
    };
  }

  if (isObj(v.delivery)) s.delivery = { items: keyed(v.delivery.items, d.delivery.items, (r) => ({ key: r.key as string, enabled: bool(r.enabled, true) })) };

  if (isObj(v.collections)) {
    s.collections = {
      mode: v.collections.mode === "manual" ? "manual" : "auto",
      items: keyed(v.collections.items, [], (r) => {
        const category = parseCategoryRef(r.category);
        return category ? { key: r.key as string, category, image: strOrNull(r.image) } : null;
      }),
    };
  }

  if (isObj(v.mood)) {
    s.mood = {
      items: keyed(v.mood.items, d.mood.items, (r, f) => ({
        key: r.key as string,
        image: r.image === null ? null : strOrNull(r.image) ?? f?.image ?? null,
        target: r.target === undefined ? f?.target ?? { kind: "none" } : parseTarget(r.target),
        enabled: bool(r.enabled, true),
      })),
    };
  }

  if (isObj(v.card)) {
    s.card = {
      occasions: keyed(v.card.occasions, d.card.occasions, (r) => ({ key: r.key as string, enabled: bool(r.enabled, true) })),
      ctaTarget: v.card.ctaTarget === undefined ? d.card.ctaTarget : parseTarget(v.card.ctaTarget),
    };
  }

  if (isObj(v.destinations) && Array.isArray(v.destinations.items)) {
    const items: V80Structure["destinations"]["items"] = [];
    for (const raw of v.destinations.items) {
      if (!isObj(raw) || !(V80_DESTINATIONS as readonly string[]).includes(String(raw.city))) continue;
      const city = raw.city as V80Destination;
      if (items.some((x) => x.city === city)) continue;
      const f = d.destinations.items.find((x) => x.city === city);
      items.push({ city, image: raw.image === null ? null : strOrNull(raw.image) ?? f?.image ?? null, enabled: bool(raw.enabled, true) });
    }
    if (items.length) s.destinations = { items };
  }

  if (isObj(v.journey)) s.journey = { ctaTarget: v.journey.ctaTarget === undefined ? d.journey.ctaTarget : parseTarget(v.journey.ctaTarget) };
  if (isObj(v.cta)) s.cta = { target: v.cta.target === undefined ? d.cta.target : parseTarget(v.cta.target) };
  if (isObj(v.trust)) s.trust = { items: keyed(v.trust.items, d.trust.items, (r, f) => ({ key: r.key as string, icon: parseIcon(r.icon, f?.icon ?? "star"), enabled: bool(r.enabled, true) })) };

  return s;
}

export function parseTexts(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    if (!/^[a-z0-9_.-]{1,80}$/i.test(k) || !isStr(val)) continue;
    const t = val.trim();
    if (t) out[k] = t.slice(0, 2000);
  }
  return out;
}

/** DB'deki content_html metnini (JSON) yapılandırmaya çevirir; hatada null. */
export function parseStorefrontConfig(raw: unknown): V80Config | null {
  let v: unknown = raw;
  if (isStr(raw)) {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isObj(v)) return null;
  return {
    v: isNum(v.v) ? v.v : V80_SCHEMA_VERSION,
    structure: parseStructure(v.structure),
    texts: parseTexts(v.texts),
  };
}

/** Yapıdan (structure) referans verilen tüm ürün id'leri — motor çözümlemesi için. */
export function referencedProductIds(s: V80Structure): number[] {
  return [...new Set(s.shop.products.map((p) => p.id))];
}

/** Hedefin yol karşılığı (public). Kategori: o dildeki slug; yoksa null (gizlenir). */
export function targetHref(
  target: V80Target,
  ctx: { locale: string; categorySegment: string; whatsapp: string; liveCategorySlugs?: Set<string>; livePages?: Set<string> }
): string | null {
  switch (target.kind) {
    case "anchor":
      return `#${target.id}`;
    case "category": {
      const slug = target.ref.slugs[ctx.locale];
      if (!slug) return null;
      if (ctx.liveCategorySlugs && !ctx.liveCategorySlugs.has(slug)) return null;
      return `/${ctx.locale}/${ctx.categorySegment}/${slug}`;
    }
    case "destination":
      if (ctx.livePages && !ctx.livePages.has(target.city)) return null;
      return `/${ctx.locale}/${target.city}`;
    case "page":
      if (ctx.livePages && !ctx.livePages.has(target.key)) return null;
      return `/${ctx.locale}/${target.key}`;
    case "url":
      return target.href;
    case "whatsapp":
      return ctx.whatsapp;
    default:
      return null;
  }
}
