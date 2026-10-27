// lib/neighborhoodNoindex.ts — ADDITIVE. İl bazında mahalle/köy sayfalarını Google dizininden çekme şalteri.
//
// Listedeki ilin /{il}/{ilçe}/{mahalle} sayfaları:
//   • "noindex, follow" alır (sayfa 200 kalır, adres/slug/canonical DEĞİŞMEZ, iç bağlar izlenir),
//   • neighborhoods-N.xml site haritasından çıkar.
// İl ve ilçe sayfaları etkilenmez. DB'ye yazılmaz (index_state aynen kalır).
//
// Gerekçe (27 Eki 2026, Search Console 28 gün): Kastamonu'dan 200 köy sayfası 1 gösterim / 0 tık.
// Kastamonu'nun 4.306 adresi yalnız 1.041 köye ait (köy içi mahalleler ayrı sayfa) — pilot il.
// GERİ ALMA TEK SATIR: diziyi boşalt → bugünkü davranış birebir.
export const NEIGHBORHOOD_NOINDEX_PROVINCES: readonly string[] = ["kastamonu"];

/** Saf: yol, şaltere takılan bir il altındaki mahalle (3 parçalı) yolu mu? */
export function isNoindexNeighborhoodPath(urlPath: string, provinces: readonly string[] = NEIGHBORHOOD_NOINDEX_PROVINCES): boolean {
  if (provinces.length === 0) return false;
  const parts = urlPath.split("?")[0].split("/").filter(Boolean);
  return parts.length === 3 && provinces.includes(parts[0]);
}
