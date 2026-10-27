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

// ---------------------------------------------------------------------------
// EK (27 Eki 2026 — kullanıcı kararı): İSTANBUL DIŞI KÖY + MAHALLE KAPALI.
// Getirisi düşük (GSC) → izin listesi dışındaki illerin mahalle/köy sayfaları (/{il}/{ilçe}/{mahalle})
// "noindex, follow" alır ve site haritasından çıkar. İL (/{il}) ve İLÇE (/{il}/{ilçe}) SAYFALARI AÇIK.
// Sayfalar 200 kalır; URL/slug/canonical ve DB index_state DEĞİŞMEZ.
// İstanbul'un yeni yolları (/{ilçe}-cicek-siparisi, /{ilçe}/{mahalle}-cicek-siparisi) ilk segmentte
// il taşımaz ve parça sayıları farklıdır → kurala takılmaz.
// KADEMELİ AÇMA: listeye il ("ankara") ya da il/ilçe ("ankara/cankaya") eklemek o kısmın mahallelerini açar.
// HEPSİNİ GERİ ALMA: LOCATION_CLOSE_ENABLED = false.
export const LOCATION_CLOSE_ENABLED = true;
export const INDEXED_LOCATION_SCOPES: readonly string[] = ["istanbul"];

/** Saf: sayfa (tip + yol) kapatma kuralına takılıyor mu? synthetic = seo kaydı olmayan dinamik lokasyon sayfası. */
export function isClosedLocationPath(
  urlPath: string,
  pageType: string | null | undefined,
  opts: { synthetic?: boolean; scopes?: readonly string[]; enabled?: boolean } = {},
): boolean {
  if (isNoindexNeighborhoodPath(urlPath) && pageType === "neighborhood") return true; // Kastamonu pilotu (önceki şalter)
  if (!(opts.enabled ?? LOCATION_CLOSE_ENABLED)) return false;
  const parts = urlPath.split("?")[0].split("/").filter(Boolean);
  if (parts.length !== 3) return false; // yalnız mahalle/köy; il ve ilçe sayfaları kapsam dışı
  if (!opts.synthetic && pageType !== "neighborhood") return false;
  const scopes = opts.scopes ?? INDEXED_LOCATION_SCOPES;
  const city = parts[0];
  const cityDistrict = `${parts[0]}/${parts[1]}`;
  return !scopes.includes(city) && !scopes.includes(cityDistrict);
}
