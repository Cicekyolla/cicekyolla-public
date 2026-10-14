// ============================================================================
// GLOBAL — İSTANBUL TİCARİ LOKASYON URL'LERİ (ADDITIVE, saf modül; node --test ile test edilir).
//
// AMAÇ (14 Eki 2026): yurt dışındaki müşterinin kendi dilindeki satın alma ifadesiyle eşleşen tek segmentli adres:
//   /en/istanbul/kadikoy/caferaga-mah  →  /en/flower-delivery-caferaga-kadikoy-istanbul
// Kalıplar dil bazında docs/global-istanbul-url-gecis/ araştırmasından (rakip başlık/URL gözlemi). Kanıt olmayan
// diller (ru, ar, ja, ko, zh, az) için KALIP YOK → adresleri değişmez ("dilsel doğrulama bekliyor").
//
// TEK KAYNAK: Global İstanbul lokasyon adresinin her üretildiği yer (canonical, hreflang — TR sayfası dahil —, sitemap,
// kırıntı, ilçe/mahalle ızgarası, vitrin sayfalaması, v80 şehir kartları, footer) localeLocationPath'ten geçer.
// Aynı lokasyon için İKİ indexlenebilir adres oluşmaz: dil açıkken eski adres tek adımda 301 (middleware), dil kapalıyken
// ticari adres eski adrese 301 (geri alma).
//
// BAYRAK: NEXT_PUBLIC_GLOBAL_COMMERCIAL_URL_LOCALES="en,de,fr" (virgüllü; kalıbı olmayan dil yok sayılır). Boş /
// tanımsız → hiçbir dil açık değil → TÜM çıktı bugünküyle BAYT BAYT aynı. Geri alma = değişkeni boşalt + yeniden deploy.
// ============================================================================
import { isGlobalLocale, type GlobalLocale } from "./config.ts";

/** Kalıp: {önek}-[{mahalle}-][{ilçe}-]{şehir-adı}. Şehir adı o dilin eksonimi (ES "estambul", PT "istambul"). */
export interface CommercialPattern {
  prefix: string;
  city: string;
  /** Araştırmadaki kanıt güveni (rapor içindir; davranışı etkilemez). */
  evidence: "medium" | "low-medium" | "low";
}

export const COMMERCIAL_URL_PATTERNS: Partial<Record<GlobalLocale, CommercialPattern>> = {
  en: { prefix: "flower-delivery", city: "istanbul", evidence: "medium" },
  de: { prefix: "blumen-verschicken", city: "istanbul", evidence: "low-medium" },
  fr: { prefix: "livraison-fleurs", city: "istanbul", evidence: "medium" },
  it: { prefix: "consegna-fiori", city: "istanbul", evidence: "medium" },
  nl: { prefix: "bloemen-bezorgen", city: "istanbul", evidence: "medium" },
  es: { prefix: "envio-de-flores", city: "estambul", evidence: "low" },
  pt: { prefix: "entrega-de-flores", city: "istambul", evidence: "low" },
};

/** Ticari adres yalnız bu şehir kökü için üretilir (TR adresleri doğrulanmış tek şehir). */
export const COMMERCIAL_CITY = "istanbul";

const SLUG_PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Bayrak değeri → açık diller (yalnız kalıbı olan geçerli diller). Saf. */
export function parseCommercialLocales(raw: string | null | undefined): ReadonlySet<GlobalLocale> {
  const out = new Set<GlobalLocale>();
  for (const part of (raw ?? "").split(",")) {
    const l = part.trim().toLowerCase();
    if (isGlobalLocale(l) && COMMERCIAL_URL_PATTERNS[l]) out.add(l);
  }
  return out;
}

/** Çalışma zamanındaki açık diller (NEXT_PUBLIC_ → istemci bileşenlerine de derleme anında gömülür). */
export const COMMERCIAL_LOCALES: ReadonlySet<GlobalLocale> = parseCommercialLocales(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GLOBAL_COMMERCIAL_URL_LOCALES : undefined,
);

/** Lokasyon anahtarı → ticari slug (dilin kalıbı yoksa / İstanbul değilse / anahtar geçersizse null). Bayraktan bağımsız. */
export function commercialSlug(locale: string, key: string): string | null {
  const p = isGlobalLocale(locale) ? COMMERCIAL_URL_PATTERNS[locale] : undefined;
  if (!p) return null;
  const parts = key.split("/");
  if (parts[0] !== COMMERCIAL_CITY || parts.length > 3 || !parts.every((s) => SLUG_PART.test(s))) return null;
  if (parts.length === 1) return `${p.prefix}-${p.city}`;
  if (parts.length === 2) return `${p.prefix}-${parts[1]}-${p.city}`;
  return `${p.prefix}-${parts[2].replace(/-mah$/, "")}-${parts[1]}-${p.city}`;
}

/**
 * Global lokasyon / niyet sayfasının KANONİK yolu. Dil açıksa ve ticari slug varsa /<dil>/<slug>, aksi hâlde
 * bugünkü /<dil>/<anahtar>. `enabled` yalnız test içindir.
 */
export function localeLocationPath(
  locale: string,
  key: string,
  enabled: ReadonlySet<string> = COMMERCIAL_LOCALES,
): string {
  if (enabled.has(locale)) {
    const slug = commercialSlug(locale, key);
    if (slug) return `/${locale}/${slug}`;
  }
  return `/${locale}/${key}`;
}

/** Tek segment ticari slug ADAYI mı? (önek + şehir eki). Gerçek eşleşme envanterle commercialKeyFromSlug'da. */
export function isCommercialSlugCandidate(locale: string, segment: string): boolean {
  const p = isGlobalLocale(locale) ? COMMERCIAL_URL_PATTERNS[locale] : undefined;
  return !!p && SLUG_PART.test(segment) && segment.startsWith(`${p.prefix}-`) && segment.endsWith(p.city);
}

/**
 * Ticari slug → lokasyon anahtarı. Kalıp tersine çevrilirken tire belirsizliği olduğu için TAHMİN EDİLMEZ: o dilde
 * yayında olan anahtarlar (envanter) ileri yönde hesaplanıp birebir eşleşen aranır. Bulunamazsa null (=404).
 */
export function commercialKeyFromSlug(locale: string, slug: string, keys: Iterable<string>): string | null {
  if (!isCommercialSlugCandidate(locale, slug)) return null;
  for (const key of keys) if (commercialSlug(locale, key) === slug) return key;
  return null;
}

/** Eski hiyerarşik Global İstanbul yolu mu? (/xx/istanbul[/ilçe[/mahalle]]) → anahtar; değilse null. */
export function hierarchicalIstanbulKey(segs: readonly string[]): string | null {
  if (segs.length < 1 || segs.length > 3 || segs[0] !== COMMERCIAL_CITY || !segs.every((s) => SLUG_PART.test(s))) return null;
  return segs.join("/");
}

/**
 * Middleware kararı (saf): istenen locale yolu için tek adımlık 301 hedefi ya da null.
 *  • Dil AÇIK + eski hiyerarşik İstanbul yolu + anahtar yayında → ticari adres.
 *  • Dil KAPALI + ticari slug + karşılığı yayında → eski hiyerarşik adres (geri alma; ticari adres 404 kalmaz).
 * `liveKeys` o dilde yayında olan anahtarlar; yoksa (okunamadı) null → yönlendirme yok (sayfa kendi canonical'ını basar).
 */
export function commercialRedirectTarget(
  pathname: string,
  liveKeys: ReadonlySet<string> | null,
  enabled: ReadonlySet<string> = COMMERCIAL_LOCALES,
): string | null {
  if (!liveKeys) return null;
  const m = /^\/([a-z]{2})\/(.+?)\/?$/.exec(pathname);
  if (!m || !isGlobalLocale(m[1]) || !COMMERCIAL_URL_PATTERNS[m[1]]) return null;
  const locale = m[1];
  const segs = m[2].split("/");
  if (enabled.has(locale)) {
    const key = hierarchicalIstanbulKey(segs);
    if (!key || !liveKeys.has(key)) return null;
    const slug = commercialSlug(locale, key);
    return slug ? `/${locale}/${slug}` : null;
  }
  if (segs.length !== 1) return null;
  const key = commercialKeyFromSlug(locale, segs[0], liveKeys);
  return key ? `/${locale}/${key}` : null;
}

/** Gezinti/izleme için: dil durum etiketi (rapor ve testler). */
export function commercialLocaleStatus(locale: GlobalLocale, enabled: ReadonlySet<string> = COMMERCIAL_LOCALES): "active" | "ready" | "pending-validation" {
  if (!COMMERCIAL_URL_PATTERNS[locale]) return "pending-validation";
  return enabled.has(locale) ? "active" : "ready";
}

/**
 * Onaylı Global içerik HTML'indeki (intro_html / content_html) eski hiyerarşik İstanbul bağlantıları kanonik yola
 * çevrilir — kayıt değişmez, yalnız çıktı. Dil kapalıysa / eşleşme yoksa HTML bayt bayt aynı döner.
 */
export function rewriteLocaleLocationHrefs(html: string, enabled: ReadonlySet<string> = COMMERCIAL_LOCALES): string {
  if (!html || enabled.size === 0) return html;
  return html.replace(
    /(\bhref\s*=\s*)(["'])\/([a-z]{2})\/(istanbul(?:\/[a-z0-9-]+){0,2})\/?([?#][^"']*)?\2/g,
    (all, attr: string, q: string, locale: string, key: string, rest?: string) => {
      const to = localeLocationPath(locale, key, enabled);
      return to === `/${locale}/${key}` ? all : `${attr}${q}${to}${rest ?? ""}${q}`;
    },
  );
}
