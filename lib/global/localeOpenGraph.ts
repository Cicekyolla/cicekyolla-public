// ============================================================================
// GLOBAL — locale sayfası OpenGraph'ı (ADDITIVE, saf modül; node --test ile test edilir).
//
// NEDEN (SEO yayın zinciri): locale sayfaları kendi openGraph'ını vermediği için kök
// layout'un TÜRKÇE openGraph'ını (og:locale tr_TR, og:url yok) miras alıyordu — Almanca
// sayfa paylaşımda "tr_TR" diyordu. Next'te alt segmentin openGraph'ı üst segmentinkinin
// YERİNE geçer; bu yüzden nesne burada TAM kurulur.
//
// KURAL: og:url = sayfanın canonical'ı; og:locale o dilin kodu; site adı ve varsayılan
// görsel kök layout'takiyle AYNI (lib/localeOpenGraph.test.ts kaynak nöbeti eşitliği korur);
// ürün sayfasında görsel = ürün kapağı. Başlık/açıklama verilmezse Next sayfanın
// title/description'ını kullanır.
// ============================================================================
import type { GlobalLocale } from "./config.ts";

/** og:locale — dil_BÖLGE (Open Graph protokolü biçimi). */
export const OG_LOCALE: Record<GlobalLocale, string> = {
  de: "de_DE", en: "en_US", fr: "fr_FR", nl: "nl_NL", it: "it_IT", es: "es_ES", pt: "pt_PT",
  az: "az_AZ", ru: "ru_RU", ar: "ar_AR", zh: "zh_CN", ja: "ja_JP", ko: "ko_KR",
};

/** Kök layout'taki (app/layout.tsx) openGraph.siteName ile aynı. */
export const OG_SITE_NAME = "ÇiçekYolla";

/** Kök layout'taki varsayılan paylaşım görseli ile aynı (ürün kapağı olmayan sayfalar). */
export const OG_DEFAULT_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "ÇiçekYolla — Premium Çiçekçi",
} as const;

export interface LocaleOpenGraphInput {
  /** Sayfanın canonical'ı (mutlak). */
  url: string;
  title?: string | null;
  description?: string | null;
  /** Ürün kapağı (PDP); yoksa varsayılan paylaşım görseli. */
  image?: string | null;
}

export function localeOpenGraph(locale: GlobalLocale, input: LocaleOpenGraphInput) {
  return {
    type: "website" as const,
    url: input.url,
    siteName: OG_SITE_NAME,
    locale: OG_LOCALE[locale],
    ...(input.title ? { title: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
    images: input.image ? [{ url: input.image }] : [{ ...OG_DEFAULT_IMAGE }],
  };
}
