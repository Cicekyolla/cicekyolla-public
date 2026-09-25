// YEREL KİMLİK — tek kaynak (25 Eyl 2026, "6 sorgu" ameliyatı).
//
// Kanıt: Google, "çiçekçi / online çiçekçi / <ilçe> çiçekçi" sorgularını YEREL yorumluyor (yerel paket + rakip
// ilçe sayfaları); ÇiçekYolla'nın Google İşletme Profili (Maltepe, Adalı Sk. 37 A) var ama site kendini Google'a
// yalnız "Organization" olarak tanıtıyordu: adres yok (iletişim sayfası "İstanbul, Türkiye"), saat/harita/GBP bağı
// yok. Bu modül sitenin her yerinde AYNI ad-adres-telefon (NAP) ve aynı işletme kimliğini (@id) kullandırır.
//
// Kurallar: değerler Google İşletme Profili ile birebir aynı olmalı (NAP tutarlılığı). Puan/yorum sayısı BURAYA
// YAZILMAZ (Google'ın kendi puanını LocalBusiness şemasına koymak yönergeye aykırı; yalnız birinci-taraf yorum
// olur). Yeni URL/slug yok; yalnız yapısal veri ve görünür adres.
// Node --test (uzantısız import çözümlemez) + Next bundler (allowImportingTsExtensions) için .ts uzantılı.
import { SITE_URL, absoluteUrl } from "./site-config.ts";

const GOOGLE_MAPS_URL = "https://maps.google.com/?cid=1591470732109749248";

export const SITE_IDENTITY = {
  name: "ÇiçekYolla",
  alternateNames: ["Çiçek Yolla", "Cicekyolla"],
  telephoneE164: "+905074413474",
  telephoneDisplay: "0507 441 34 74",
  whatsappE164: "+905458813450",
  email: "info@cicekyolla.com.tr",
  /** Google İşletme Profili adresi: "Altayçeşme, Adalı Sokağı 37 A, 34843 Maltepe/İstanbul". */
  address: {
    streetAddress: "Altayçeşme Mah. Adalı Sk. No: 37 A",
    addressLocality: "Maltepe",
    addressRegion: "İstanbul",
    postalCode: "34843",
    addressCountry: "TR",
  },
  addressLine: "Altayçeşme Mah. Adalı Sk. No: 37 A, 34843 Maltepe / İstanbul",
  /** Sitede yayınlanan çalışma saati (iletişim sayfası + footer ile aynı). GBP'deki saatle eşitlenmeli. */
  openingHours: { opens: "08:00", closes: "22:00" },
  googlePlaceId: "ChIJt-IisKbGyhQRABzV6TIKFhY",
  googleMapsUrl: GOOGLE_MAPS_URL,
  sameAs: [
    "https://instagram.com/cicekyolla",
    "https://facebook.com/cicekyolla",
    GOOGLE_MAPS_URL,
  ],
} as const;

/** Tüm sayfalarda aynı işletme düğümünü işaret eden kimlik. */
export const FLORIST_ID = `${SITE_URL}/#florist`;

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Ana sayfa Organization düğümüne eklenen yerel işletme (Florist) alanları. */
export function floristLocalFields(): Record<string, unknown> {
  return {
    "@type": ["Organization", "Florist"],
    "@id": FLORIST_ID,
    name: SITE_IDENTITY.name,
    alternateName: [...SITE_IDENTITY.alternateNames],
    telephone: SITE_IDENTITY.telephoneE164,
    email: SITE_IDENTITY.email,
    address: { "@type": "PostalAddress", ...SITE_IDENTITY.address },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: WEEK,
        opens: SITE_IDENTITY.openingHours.opens,
        closes: SITE_IDENTITY.openingHours.closes,
      },
    ],
    hasMap: SITE_IDENTITY.googleMapsUrl,
    sameAs: [...SITE_IDENTITY.sameAs],
    priceRange: "₺₺",
    currenciesAccepted: "TRY",
    paymentAccepted: "Kredi Kartı, Havale/EFT",
  };
}

/**
 * İstanbul İLÇE sayfaları (/istanbul/<ilçe>): aynı işletmenin bu ilçeye verdiği hizmet + kompakt işletme düğümü.
 * Mahalle sayfalarına ve İstanbul dışına eklenmez (tek fiziksel konum; hizmet alanı ilçe).
 */
export function istanbulDistrictJsonLd(input: { path: string; areaName: string; pageName: string }): string {
  const url = absoluteUrl(input.path);
  const area = input.areaName.trim() || "İstanbul";
  const graph = [
    {
      "@type": ["Organization", "Florist"],
      "@id": FLORIST_ID,
      name: SITE_IDENTITY.name,
      url: SITE_URL,
      telephone: SITE_IDENTITY.telephoneE164,
      address: { "@type": "PostalAddress", ...SITE_IDENTITY.address },
      hasMap: SITE_IDENTITY.googleMapsUrl,
      sameAs: [...SITE_IDENTITY.sameAs],
    },
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: input.pageName.trim() || `${area} çiçek teslimatı`,
      serviceType: "Çiçek teslimatı",
      url,
      areaServed: { "@type": "AdministrativeArea", name: `${area}, İstanbul` },
      provider: { "@id": FLORIST_ID },
    },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}
