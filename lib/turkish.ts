// lib/turkish.ts — ADDITIVE. Türkçe yönelme hâli eki ("'e"/"'a"/"'ye"/"'ya") üretimi.
// Lokasyon sayfası şablonundaki "Beşiktaş'e Çiçek" / "Ankara'e Çiçek" gibi koşulsuz
// "'e" eklerini düzeltmek için eklendi (bkz. Footer.tsx, lokasyon çapraz bağlantıları).
// Yalnız gerçek özel isim/lokasyon adları için kullanılır; genel metin işlenmez.

const UNLULER = "aeıioöuü";
const KALIN = "aıou";
const INCE = "eiöü";

/**
 * Sapan (kurala uymayan) özel isimler. Örn. "Beyoğlu" morfolojik olarak
 * 3. tekil iyelik ekiyle bitiyor ("bey-i-oğlu") — yönelme hâli "n" tampon
 * ünsüzü ister: "Beyoğlu'na" (kural bazlı üretimin vereceği "Beyoğlu'ya" YANLIŞ).
 * Anahtar, girdiyle BİREBİR (case-insensitive) eşleşmelidir.
 * Yeni bir sapma bulunursa buraya eklenir — fonksiyonun geri kalanı değişmez.
 */
export const ISTISNALAR: Record<string, string> = {
  beyoğlu: "'na",
  beyoglu: "'na",
};

/** Türkçe yönelme hâli eki: Ankara → 'ya, Beşiktaş → 'a, Şişli → 'ye, İzmir → 'e */
export function yonelmeEki(ad: string): string {
  const temiz = ad.trim();
  const istisna = ISTISNALAR[temiz.toLocaleLowerCase("tr-TR")];
  if (istisna) return istisna;

  const harfler = [...temiz.toLocaleLowerCase("tr-TR")];
  const sonUnlu = harfler.reverse().find((h) => UNLULER.includes(h));
  if (!sonUnlu) return "'e";
  const ek = KALIN.includes(sonUnlu) ? "a" : INCE.includes(sonUnlu) ? "e" : "e";
  const sonHarf = temiz.slice(-1).toLocaleLowerCase("tr-TR");
  return UNLULER.includes(sonHarf) ? `'y${ek}` : `'${ek}`;
}

export function yonelme(ad: string): string {
  return ad + yonelmeEki(ad);
}

/** İlgi (tamlayan) hâli eki — ADDITIVE. "{İlçe}'in Diğer Mahalleleri" gibi sabit "'in" eklerini
 *  düzeltmek için: Kadıköy → 'ün, Tuzla → 'nın, Beşiktaş → 'ın, Ataşehir → 'in, Beyoğlu → 'nun.
 *  Son ünlü dört yönlü uyumu belirler; ünlüyle biten adlarda "n" kaynaştırması gelir. */
export function ilgiEki(ad: string): string {
  const temiz = ad.trim();
  const kucuk = temiz.toLocaleLowerCase("tr-TR");
  const sonUnlu = [...kucuk].reverse().find((h) => UNLULER.includes(h));
  if (!sonUnlu) return "'in";
  const ek = "aı".includes(sonUnlu) ? "ın" : "ei".includes(sonUnlu) ? "in" : "ou".includes(sonUnlu) ? "un" : "ün";
  return UNLULER.includes(kucuk.slice(-1)) ? `'n${ek}` : `'${ek}`;
}

export function ilgi(ad: string): string {
  return ad.trim() + ilgiEki(ad);
}
