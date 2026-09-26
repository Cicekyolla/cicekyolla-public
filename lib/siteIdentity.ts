// İŞLETME KİMLİĞİ — TEK DAMAR (25 Eyl 2026, "6 sorgu" ameliyatı, PR #238)
//
//   ADMIN (Ana Sayfa CMS → Hero → "İşletme Kimliği ve İletişim")
//     → API /api/public/homepage (yayın sürümü, hero.config)
//       → resolveSiteIdentity(hero.config)
//         → /iletisim kanalları + çalışma saati + Haritada Aç / Yol Tarifi
//         → Footer iletişim (telefon, WhatsApp, e-posta, adres, saat)
//         → ana sayfa Organization+Florist JSON-LD
//         → /istanbul/<ilçe> Florist + Service JSON-LD
//
// Kanıt (kök neden): Google "çiçekçi / online çiçekçi / <ilçe> çiçekçi" sorgularını YEREL yorumluyor; site kendini
// yalnız "Organization" olarak tanıtıyordu, adres yoktu, saat/harita/GBP bağı yoktu. Bu modül aynı veriyi hem müşteriye
// (görünür NAP) hem Google'a (yapısal veri) tek kaynaktan verir. Admin'de değişen alan her yüzeyde birlikte değişir.
//
// FALLBACK: Admin alanları boşsa bugünkü Google İşletme Profili değerleri kullanılır (site hiçbir zaman adressiz kalmaz).
// ORIGIN KİLİDİ: url/@id/canonical yalnız SITE_URL'den üretilir; Admin origin değiştiremez.
// Google puanı/yorum sayısı şemaya YAZILMAZ (üçüncü taraf puanı LocalBusiness şemasında yönergeye aykırı).
//
// Node --test uzantısız import çözümlemez; Next bundler allowImportingTsExtensions ile .ts kabul eder.
import { SITE_URL, absoluteUrl } from "./site-config.ts";

export interface SiteIdentity {
  name: string;
  alternateNames: string[];
  phoneDisplay: string;
  phoneE164: string;
  whatsappDisplay: string;
  whatsappE164: string;
  email: string;
  address: { streetAddress: string; addressLocality: string; addressRegion: string; postalCode: string; addressCountry: "TR" };
  addressLine: string;
  hours: { opens: string; closes: string; note: string };
  hoursLabel: string;
  googleMapsUrl: string;
  googlePlaceId: string;
  social: { instagram: string; facebook: string };
  sameAs: string[];
  /** Admin'den (CMS hero.config) okunan alan adları — hangi değerlerin yayın sürümünden geldiğinin kanıtı. */
  cmsFields: string[];
}

/** Google İşletme Profili ile birebir aynı yedek değerler (Admin alanları boşken). */
export const IDENTITY_FALLBACK = {
  business_name: "ÇiçekYolla",
  contact_phone: "0507 441 34 74",
  contact_whatsapp: "0545 881 34 50",
  contact_email: "info@cicekyolla.com.tr",
  address_street: "Altayçeşme Mah. Adalı Sk. No: 37 A",
  address_district: "Maltepe",
  address_city: "İstanbul",
  postal_code: "34843",
  hours_opens: "08:00",
  hours_closes: "22:00",
  hours_note: "Her gün",
  google_maps_url: "https://maps.google.com/?cid=1591470732109749248",
  google_place_id: "ChIJt-IisKbGyhQRABzV6TIKFhY",
  social_instagram: "https://instagram.com/cicekyolla",
  social_facebook: "https://facebook.com/cicekyolla",
} as const;

/** Admin hero.config'te tanınan kimlik anahtarları (API homepageValidation hero şemasıyla aynı adlar). */
export const IDENTITY_CMS_KEYS = Object.keys(IDENTITY_FALLBACK) as Array<keyof typeof IDENTITY_FALLBACK>;

/** Tüm sayfalarda aynı işletme düğümünü işaret eden kimlik (origin kilidi: SITE_URL). */
export const FLORIST_ID = `${SITE_URL}/#florist`;

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "0507 441 34 74" | "+90 507..." | "5074413474" → "+905074413474". Bozuksa boş string. */
export function toE164Tr(display: string): string {
  const d = String(display || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("90") && d.length === 12) return "+" + d;
  if (d.startsWith("0") && d.length === 11) return "+90" + d.slice(1);
  if (d.length === 10) return "+90" + d;
  return "+" + d;
}

function pick(cfg: Record<string, unknown> | null | undefined, key: keyof typeof IDENTITY_FALLBACK, used: string[]): string {
  const v = cfg?.[key];
  if (typeof v === "string" && v.trim()) { used.push(key); return v.trim(); }
  return IDENTITY_FALLBACK[key];
}

/**
 * Yayın sürümündeki hero.config'ten kimliği kurar. cfg yoksa/boşsa GBP yedeği.
 * Aynı fonksiyon iletişim sayfası, footer, ana sayfa şeması ve ilçe şeması tarafından kullanılır (tek damar).
 */
export function resolveSiteIdentity(cfg?: Record<string, unknown> | null): SiteIdentity {
  const used: string[] = [];
  const name = pick(cfg, "business_name", used);
  const phoneDisplay = pick(cfg, "contact_phone", used);
  const whatsappDisplay = pick(cfg, "contact_whatsapp", used);
  const email = pick(cfg, "contact_email", used);
  const address = {
    streetAddress: pick(cfg, "address_street", used),
    addressLocality: pick(cfg, "address_district", used),
    addressRegion: pick(cfg, "address_city", used),
    postalCode: pick(cfg, "postal_code", used),
    addressCountry: "TR" as const,
  };
  const hours = { opens: pick(cfg, "hours_opens", used), closes: pick(cfg, "hours_closes", used), note: pick(cfg, "hours_note", used) };
  const googleMapsUrl = pick(cfg, "google_maps_url", used);
  const googlePlaceId = pick(cfg, "google_place_id", used);
  const social = { instagram: pick(cfg, "social_instagram", used), facebook: pick(cfg, "social_facebook", used) };
  const alternateNames = name === "ÇiçekYolla" ? ["Çiçek Yolla", "Cicekyolla"] : [];
  return {
    name,
    alternateNames,
    phoneDisplay,
    phoneE164: toE164Tr(phoneDisplay),
    whatsappDisplay,
    whatsappE164: toE164Tr(whatsappDisplay),
    email,
    address,
    addressLine: `${address.streetAddress}, ${address.postalCode} ${address.addressLocality} / ${address.addressRegion}`,
    hours,
    hoursLabel: `${hours.note} ${hours.opens}–${hours.closes}`.trim(),
    googleMapsUrl,
    googlePlaceId,
    social,
    sameAs: [social.instagram, social.facebook, googleMapsUrl].filter(Boolean),
    cmsFields: used,
  };
}

/** "Haritada Aç": Admin'deki harita bağlantısı; yoksa adres + Place ID ile Google Haritalar araması. */
export function mapsOpenUrl(id: SiteIdentity): string {
  if (id.googleMapsUrl) return id.googleMapsUrl;
  const q = new URLSearchParams({ api: "1", query: id.addressLine });
  if (id.googlePlaceId) q.set("query_place_id", id.googlePlaceId);
  return `https://www.google.com/maps/search/?${q.toString()}`;
}

/** "Yol Tarifi": adres + Place ID ile Google Haritalar yol tarifi (anahtar gerektirmez). */
export function directionsUrl(id: SiteIdentity): string {
  const q = new URLSearchParams({ api: "1", destination: id.addressLine });
  if (id.googlePlaceId) q.set("destination_place_id", id.googlePlaceId);
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

export interface ContactChannel { kind: "whatsapp" | "phone" | "email" | "address"; label: string; value: string; note: string; href: string }

/** /iletisim ve footer'ın aynı kaynaktan ürettiği kanal listesi. */
export function contactChannels(id: SiteIdentity): ContactChannel[] {
  return [
    { kind: "whatsapp", label: "WhatsApp", value: id.whatsappDisplay, note: "Sipariş ve destek için", href: `https://wa.me/${id.whatsappE164.replace("+", "")}` },
    { kind: "phone", label: "Telefon", value: id.phoneDisplay, note: id.hoursLabel, href: `tel:${id.phoneE164}` },
    { kind: "email", label: "E-posta", value: id.email, note: "24 saat içinde yanıt", href: `mailto:${id.email}` },
    { kind: "address", label: "Adres", value: id.addressLine, note: `${id.name} · ${id.address.addressLocality}`, href: mapsOpenUrl(id) },
  ];
}

/** Ana sayfa Organization düğümüne eklenen yerel işletme (Florist) alanları. */
export function floristLocalFields(id: SiteIdentity): Record<string, unknown> {
  return {
    "@type": ["Organization", "Florist"],
    "@id": FLORIST_ID,
    name: id.name,
    ...(id.alternateNames.length ? { alternateName: [...id.alternateNames] } : {}),
    telephone: id.phoneE164,
    email: id.email,
    address: { "@type": "PostalAddress", ...id.address },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: WEEK, opens: id.hours.opens, closes: id.hours.closes },
    ],
    hasMap: mapsOpenUrl(id),
    sameAs: [...id.sameAs],
    priceRange: "₺₺",
    currenciesAccepted: "TRY",
    paymentAccepted: "Kredi Kartı, Havale/EFT",
  };
}

/**
 * İstanbul İLÇE sayfaları (/istanbul/<ilçe>): aynı işletmenin bu ilçeye verdiği hizmet + kompakt işletme düğümü.
 * Mahalle sayfalarına ve İstanbul dışına eklenmez (tek fiziksel konum; hizmet alanı ilçe).
 */
export function istanbulDistrictJsonLd(id: SiteIdentity, input: {
  path: string; areaName: string; pageName: string;
  /** ADDITIVE (Release 1): locale ilçe sayfaları için hizmet türü ve şehir etiketi o dilde;
      verilmezse TR varsayılanları (TR sayfaları birebir aynı çıktı). */
  serviceType?: string; cityLabel?: string;
}): string {
  const url = absoluteUrl(input.path);
  const area = input.areaName.trim() || "İstanbul";
  const serviceType = input.serviceType?.trim() || "Çiçek teslimatı";
  const cityLabel = input.cityLabel?.trim() || "İstanbul";
  const graph = [
    {
      "@type": ["Organization", "Florist"],
      "@id": FLORIST_ID,
      name: id.name,
      url: SITE_URL,
      telephone: id.phoneE164,
      address: { "@type": "PostalAddress", ...id.address },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: WEEK, opens: id.hours.opens, closes: id.hours.closes },
      ],
      hasMap: mapsOpenUrl(id),
      sameAs: [...id.sameAs],
    },
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: input.pageName.trim() || `${area} çiçek teslimatı`,
      serviceType,
      url,
      areaServed: { "@type": "AdministrativeArea", name: `${area}, ${cityLabel}` },
      provider: { "@id": FLORIST_ID },
    },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}
