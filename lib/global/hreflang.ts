// ============================================================================
// GLOBAL — hreflang x-default (ADDITIVE, saf modül; node --test ile test edilir).
//
// NEDEN (24 Eyl 2026 canlı okuma): 13 dildeki lokasyon/kategori/ürün kümelerinde
// karşılıklı hreflang vardı ama `x-default` HİÇ basılmıyordu. Google, hiçbir
// dil eşleşmeyen aramada hangi sürümü göstereceğini bilmiyordu (dil-bağımsız
// sorgular, yanlış dil eşleşmesi). x-default = kümedeki İNGİLİZCE sayfa;
// EN kümede yoksa alfabetik ilk locale (küme dışına işaret edilmez).
//
// KURAL: TR küme DIŞINDADIR (TR sayfaları karşılık hreflang basmıyor; tek yönlü
// bağ Google tarafından yok sayılır) — bu modül TR eklemez, yalnız x-default ekler.
// Küme boşsa dokunmaz.
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
