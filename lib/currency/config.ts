// ---------------------------------------------------------------------------
// PARA BİRİMİ — TRY / USD / EUR.  ⚠ YALNIZ GÖSTERİM.
//
// ═══ EN ÖNEMLİ KURAL ═══════════════════════════════════════════════════════
// GERÇEK FİYAT VE TAHSİLAT DAİMA TRY'DİR.
//   • Ürünün fiyatı        = products.price_minor (TRY kuruş)
//   • Siparişin toplamı    = TRY
//   • PayTR'ye giden tutar = TRY  (currency = 'TL', hiç değişmedi)
//   • GA4 / Ads / Meta     = TRY
// USD/EUR yalnızca yabancı müşteri fiyatı anlasın diye gösterilir. Bu dosyadaki
// hiçbir değer bir ödeme isteğine, sipariş gövdesine veya analitik olayına
// GİRMEZ. Buradan çıkan sayı bir TAHMİNDİR; müşterinin gerçek maliyetini kendi
// bankasının kuru belirler ve bunu checkout'ta açıkça söyleriz.
//
// PARA BİRİMİ ≠ DİL ≠ PAZAR. 13 global dilin tamamı üçünü de seçebilir; dil
// yalnız mantıklı bir VARSAYILAN belirler, kullanıcının seçimi her zaman üstün.
//
// Para birimi bir UX durumudur, SEO durumu DEĞİLDİR: URL'yi, canonical'ı,
// hreflang'i, sitemap'i etkilemez. /usd/, /en-eur/ gibi ikinci URL ailesi YOK.
// Tek tercih kaynağı: cookie `cy_currency` — ikinci state/storage YOK.
// ---------------------------------------------------------------------------
// YALNIZ TİP İTHALİ — bu dosya yaprak modül kalmalı (bkz. price.ts/format.ts):
// Next paketleyicisi ve `node --test` aynı dosyayı doğrudan yükleyebilsin.
import type { Locale } from "@/lib/i18n/config";

export const CURRENCIES = [
  { code: "TRY", symbol: "₺", name: "Türk Lirası", label: "TRY" },
  { code: "USD", symbol: "$", name: "US Dollar", label: "USD" },
  { code: "EUR", symbol: "€", name: "Euro", label: "EUR" },
] as const;

export type Currency = (typeof CURRENCIES)[number]["code"];
export type CurrencyMeta = (typeof CURRENCIES)[number];

/** Gerçek fiyatın ve tahsilatın para birimi. Çevrimlerin tabanı. */
export const BASE_CURRENCY: Currency = "TRY";

export const CURRENCY_COOKIE = "cy_currency";
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 yıl

/**
 * YAYIN BAYRAĞI — 4 Eyl 2026'da operatör onayıyla AÇILDI.
 *
 * Artık VARSAYILAN AÇIK: 13 Global dilde müşteri ₺ TL / $ USD / € EUR seçebilir.
 * Açılış öncesi production'da gizli kanarya (`?cy_currency_preview=1`) ile
 * uçtan uca doğrulandı; TRY ziyaretçisinin görünümü değişmedi.
 *
 * KILL SWITCH KORUNDU: `NEXT_PUBLIC_CURRENCY_ENABLED=false` + yeniden deploy
 * → seçici render edilmez, kur ucu hiç çağrılmaz, her şey TRY'ye döner.
 * (`NEXT_PUBLIC_*` derleme anında gömülür; her iki yön de redeploy ister.)
 *
 * Bayrak AÇIK olsa bile değişmeyen şey: gerçek fiyat ve tahsilat DAİMA TRY.
 */
export const CURRENCY_ENABLED = process.env.NEXT_PUBLIC_CURRENCY_ENABLED !== "false";

/**
 * KANARYA — bayrak kapalıyken tek bir tarayıcı için açar (`?cy_currency_preview=1`,
 * `=0` kapatır). Yalnız bir GÖRÜNÜRLÜK anahtarıdır: fiyat ve tahsilat TRY olduğu
 * için bu cookie'yi elle koyan biri hiçbir avantaj elde edemez.
 */
export const CURRENCY_PREVIEW_COOKIE = "cy_currency_preview";
export const CURRENCY_PREVIEW_PARAM = "cy_currency_preview";

/**
 * Para birimi seçimi YALNIZ 13 GLOBAL DİLDE geçerlidir (operatör kararı, 4 Eyl 2026).
 *
 * TR ana sitede Türk müşteri ₺ ile alışveriş yapar; gereksiz bir seçenek işini
 * kolaylaştırmaz. Bu yüzden TR'de seçici GİZLENMEKLE KALMAZ, para birimi TRY'ye
 * SABİTLENİR — aksi hâlde daha önce USD seçmiş bir ziyaretçi Türkçe sayfada
 * USD fiyat görüp geri dönemezdi (seçici olmadığı için kilitli kalırdı).
 *
 * Öncelik i18n ile AYNI: URL öneki > `cy_lang` cookie'si.
 */
const FOREIGN_LOCALES: readonly string[] = [
  "de", "en", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko",
];

export function isForeignLocaleContext(
  pathname: string,
  cookieHeader: string | null | undefined,
): boolean {
  const m = /^\/([a-z]{2})(?:\/|$)/.exec(pathname ?? "");
  if (m) return FOREIGN_LOCALES.includes(m[1]);
  // `cy_lang` okuması i18n'in `parseLangCookie`'siyle aynı desendir; buraya
  // KOPYALANDI çünkü bu dosya yaprak modül kalmalı (değer ithali yok).
  // Cookie yoksa TR kabul edilir — i18n'in varsayılanıyla birebir aynı.
  const lang = /(?:^|;\s*)cy_lang=([a-z]{2})(?=\s*(?:;|$))/.exec(cookieHeader ?? "")?.[1];
  return !!lang && FOREIGN_LOCALES.includes(lang);
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && CURRENCIES.some((c) => c.code === v);
}

export function currencyMeta(code: Currency): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/**
 * Dile göre MANTIKLI VARSAYILAN — yalnız kullanıcı henüz seçim yapmadıysa.
 * IP tahmini BİLEREK yok: VPN, tatildeki kullanıcı ve yurt dışındaki Türk
 * müşteri yanlış paraya düşerdi. Dil, kullanıcının kendi beyan ettiği tek
 * sinyaldir; deterministik ve açıklanabilir.
 */
const EURO_LOCALES: readonly string[] = ["de", "fr", "nl", "it", "es", "pt"];

export function defaultCurrencyForLocale(locale: Locale | string): Currency {
  if (locale === "tr") return "TRY";
  if (EURO_LOCALES.includes(locale)) return "EUR";
  return "USD";
}

/**
 * Cookie'den para birimi okur. `null` = kullanıcı HENÜZ SEÇMEDİ (dil varsayılanı
 * uygulanabilir). Değer varsa bilinçli seçimdir; dil değişse bile KORUNUR.
 *
 * Sondaki sınır ZORUNLU: onsuz `cy_currency=TRY123` ilk üç harfinden "TRY" diye
 * kabul edilirdi. Değer TAM üç harf olmalı.
 */
export function parseCurrencyCookie(cookieHeader: string | null | undefined): Currency | null {
  if (!cookieHeader) return null;
  const m = new RegExp(`(?:^|;\\s*)${CURRENCY_COOKIE}=([A-Za-z]{3})(?=\\s*(?:;|$))`).exec(cookieHeader);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return isCurrency(code) ? code : null;
}

/** Kanarya cookie'si TAM olarak `=1` mi? (`=10`, `=1x` kabul edilmez.) */
export function hasPreviewCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return new RegExp(`(?:^|;\\s*)${CURRENCY_PREVIEW_COOKIE}=1(?=\\s*(?:;|$))`).test(cookieHeader);
}
