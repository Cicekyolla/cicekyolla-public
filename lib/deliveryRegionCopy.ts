// lib/deliveryRegionCopy.ts — /teslimat-bolgeleri şehir bölümü dili (SEO P0, 13 Kas 2026).
//
// Kendi kurye ağımız yalnız İstanbul'da: aynı gün ve uygun siparişte 2 saat burada geçerli.
// Diğer şehirlere kargoya uygun ürünler ücretsiz kargoyla gider; orada saat/süre vaadi yazılmaz.
// Kart, mahalle bağları, ilçe listesi ve ItemList şeması bu dosyadan etkilenmez.

export const COURIER_CITY = "İstanbul";

/** Kendi kuryemizle aynı gün teslim edilen şehir mi? */
export function isCourierCity(city: string): boolean {
  return city.trim().toLocaleLowerCase("tr-TR") === COURIER_CITY.toLocaleLowerCase("tr-TR");
}

/** Şehir bölümünün üst etiketi ve sağdaki açıklama satırı. */
export function citySectionCopy(city: string): { eyebrow: string; note: string } {
  return isCourierCity(city)
    ? { eyebrow: "Aynı gün teslimat", note: "Uygun saatler sipariş adımında kesinleşir" }
    : { eyebrow: "Kargo ile teslimat", note: "Kargoya uygun ürünlerde ücretsiz kargo" };
}

/** Kartta gösterilecek süre: yalnız kurye şehrinde ve doluysa; aksi hâlde null (gösterilmez). */
export function regionDuration(city: string, duration: string | null | undefined): string | null {
  const d = (duration ?? "").trim();
  return d && isCourierCity(city) ? d : null;
}

/** Sayfa meta açıklaması: Admin kaydı doluysa o, değilse bu varsayılan. */
export const DEFAULT_DELIVERY_REGIONS_DESCRIPTION =
  "İstanbul'un 39 ilçesine kendi kuryelerimizle aynı gün çiçek teslimatı. Kargoya uygun ürünlerde Türkiye geneli ücretsiz kargo.";

export function deliveryRegionsDescription(managedMeta: string | null | undefined): string {
  const m = (managedMeta ?? "").trim();
  return m || DEFAULT_DELIVERY_REGIONS_DESCRIPTION;
}
