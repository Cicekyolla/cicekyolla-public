// ============================================================================
// TESLİMAT BANDI — YALNIZ GÖRÜNTÜ ADI (Paket E, ADDITIVE). Saf modül (node --test).
//
// Delivery Motor band adını Türkçe döndürür ("İstanbul - Yakın (Maltepe 0-7 km)").
// Bu yardımcı yalnız EKRANDA gösterilen metni müşterinin diline çevirir:
//   • TR: girdi AYNEN döner (bugünkü görünüm birebir).
//   • Global dil: bilinen band başı sözlük anahtarına eşlenir, parantez içi (Maltepe 0-7 km) korunur;
//     tanınmayan band adı değiştirilmeden gösterilir (uydurma çeviri yok).
// Saklanan/gönderilen değer (PendingDelivery.band, sipariş gövdesi) ve ücret mantığı DEĞİŞMEZ.
// ============================================================================

export type BandKey =
  | "band.near"
  | "band.mid"
  | "band.far"
  | "band.veryFar"
  | "band.remote"
  | "band.europe"
  | "band.asia";

const BAND_HEADS: Readonly<Record<string, BandKey>> = Object.freeze({
  "Yakın": "band.near",
  "Orta": "band.mid",
  "Uzak": "band.far",
  "Çok Uzak": "band.veryFar",
  "Uzak Bölge Özel Araç": "band.remote",
  "Avrupa Yakası": "band.europe",
  "Anadolu Yakası": "band.asia",
});

/** Band adının görüntü metni. `label` motorun (ya da önekten arındırılmış) band adıdır. */
export function localizeBandLabel(label: string, locale: string, t: (key: BandKey) => string): string {
  if (locale === "tr" || !label) return label;
  const bare = label.replace(/^İstanbul\s*-\s*/, "").trim();
  const m = /^(.+?)\s*(\([^()]*\))?$/.exec(bare);
  if (!m) return label;
  const key = BAND_HEADS[m[1].trim()];
  if (!key) return label;
  return m[2] ? `${t(key)} ${m[2]}` : t(key);
}
