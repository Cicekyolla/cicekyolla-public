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

/** EK: şablondan gelen mahalle/köy sayfası başlığı — "Yer, İlçe (İl) Çiçekçi". Aynı adlı köyleri
 *  (ör. 14 ayrı "Fatih Mah") birbirinden ayırır. Marka eklenmez (layout şablonu "| ÇiçekYolla" ekler).
 *  İlçe/il eksikse null → çağıran bugünkü kalıbı kullanır. */
export function neighborhoodTitle(place: string, district: string, city: string): string | null {
  const p = place.trim(), d = district.trim(), c = city.trim();
  if (!p || !d || !c) return null;
  return `${p}, ${d} (${c}) Çiçekçi`;
}
