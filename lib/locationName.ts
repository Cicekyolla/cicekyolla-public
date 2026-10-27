// lib/locationName.ts — ADDITIVE. Location core'dan (Delivery Motor) gelen mahalle/köy
// adını sayfada gösterilecek biçime getirir. Kaynak verideki iki kusuru düzeltir:
//   "Ahuri Mah (sarıkaya Köyü)"      → "Ahuri Mah (Sarıkaya Köyü)"   (parantez içi küçük harf)
//   "Altıkulaç  Mah (kadı Mah)"      → "Altıkulaç Mah (Kadı Mah)"    (çift boşluk)
// Ad uydurulmaz, kısaltma açılmaz, sıra değişmez — yalnız büyük harf ve boşluk.

export function cleanLocationName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s(])(\p{Ll})/gu, (_m, onu: string, harf: string) => onu + harf.toLocaleUpperCase("tr-TR"));
}
