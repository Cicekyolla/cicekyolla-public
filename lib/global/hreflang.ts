// ============================================================================
// GLOBAL — hreflang x-default (ADDITIVE, saf modül; node --test ile test edilir).
//
// NEDEN (24 Eyl 2026 canlı okuma): 13 dildeki lokasyon/kategori/ürün kümelerinde
// karşılıklı hreflang vardı ama `x-default` HİÇ basılmıyordu. Google, hiçbir
// dil eşleşmeyen aramada hangi sürümü göstereceğini bilmiyordu (dil-bağımsız
// sorgular, yanlış dil eşleşmesi). x-default = kümedeki İNGİLİZCE sayfa;
// EN kümede yoksa alfabetik ilk locale (küme dışına işaret edilmez).
//
// KURAL (SEO yayın zinciri ile güncellendi): TR artık AİLENİN ÜYESİDİR — ama yalnız
// Türkçe sayfanın da AYNI kümeyi karşılıklı bastığı yüzeylerde: ÜRÜN (/urun/<slug>),
// ANA SAYFA (/) ve KATEGORİ (/kategori/<slug>; yalnız Türkçe sayfa indexlenebilirken,
// 1. sayfada). LOKASYON ve NİYET sayfalarında TR küme DIŞINDA kalır (Türkçe lokasyon
// URL'leri taşınıyor; tek yönlü bağ Google tarafından yok sayılır).
// TR'yi kümeye ekleyen yer bu modül DEĞİLDİR: lib/global/hreflangFamily.ts. Bu modül
// yalnız x-default ekler ve x-default kuralı DEĞİŞMEDİ — aday YALNIZ locale sürümleridir
// (EN, yoksa alfabetik ilk); TR hiçbir zaman x-default olmaz, Türkçe sayfa da locale
// kardeşleriyle aynı x-default'u basar. Küme boşsa dokunmaz.
// ============================================================================

export const X_DEFAULT_LOCALE = "en";
export const X_DEFAULT_KEY = "x-default";

/** languages: { de: url, en: url, … } → aynı harita + "x-default". Girdi değiştirilmez. */
export function withXDefault(languages: Record<string, string>): Record<string, string> {
  const keys = Object.keys(languages).filter((k) => k !== X_DEFAULT_KEY && languages[k]);
  if (keys.length === 0) return { ...languages };
  const pick = languages[X_DEFAULT_LOCALE] ?? languages[[...keys].sort()[0]];
  return { ...languages, [X_DEFAULT_KEY]: pick };
}
