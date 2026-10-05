// =============================================================================
// <html lang / dir> — SUNUCUDA, isteğin yolundan.
//
// KÖK NEDEN: tek kök layout Türkçe site ile 13 dil ağacını birlikte sarar ve
// <html lang="tr"> sabit yazıyordu. Dil sayfalarının ham HTML'i (4.230 ürün +
// kategori + ana sayfa + lokasyon) bu yüzden "tr" diyordu; dil ancak sonradan bir
// betikle düzeltiliyordu (Google sıralamasını etkilemez; erişilebilirlik ve
// "sayfanın dili" doğruluğu sorunudur — ekran okuyucu, Bing, JavaScript
// çalıştırmayan tarayıcılar ham değeri okur, Arapça için dir="rtl" hiç yoktu).
//
// KURAL (saf karar; tek dil listesi lib/global/config.ts):
//   /<dil> ya da /<dil>/…  → lang = o dil; dir yalnız sağdan sola dilde (ar) "rtl"
//   diğer her yol          → lang = "tr", dir yazılmaz  (Türkçe çıktı BAYT BAYT aynı)
// Yol okunamazsa "tr" (bugünkü davranış). Büyük harfli önek (/EN/…) dil sayılmaz —
// uygulamanın geri kalanı (isGlobalLocalePath, baştaki dil betiği) ile aynı karar.
// =============================================================================
import { DIR, GLOBAL_LOCALES, type GlobalLocale } from "./global/config.ts";

export interface HtmlLang {
  lang: "tr" | GlobalLocale;
  /** Yalnız sağdan sola dilde yazılır; diğerlerinde öznitelik basılmaz. */
  dir?: "rtl";
}

const TR: HtmlLang = { lang: "tr" };

/** İstek yolundan (sorgu dizesi / parça içerebilir) <html> dil özniteliklerini verir. */
export function htmlLangForPath(pathname: string | null | undefined): HtmlLang {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return TR;
  const first = pathname.slice(1).split(/[/?#]/, 1)[0];
  const locale = (GLOBAL_LOCALES as readonly string[]).includes(first) ? (first as GlobalLocale) : null;
  if (!locale) return TR;
  return DIR[locale] === "rtl" ? { lang: locale, dir: "rtl" } : { lang: locale };
}
