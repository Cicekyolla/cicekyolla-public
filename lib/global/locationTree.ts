// ---------------------------------------------------------------------------
// GLOBAL LOKASYON AĞACI (ADDITIVE, SALT OKUMA — yeni tablo/migration YOK).
//
// Tek source-of-truth zinciri, TR tarafıyla AYNI uçlar:
//   • İlçe listesi + gerçek adlar  → fetchCityDistricts("istanbul")   [SEO envanteri]
//   • Mahalle listesi + adlar      → fetchDistrictNeighborhoods(...)  [Delivery Motor]
//   • O dilde YAYINDA olan yüzey   → fetchGlobalPagesInventory(locale) [global_pages]
//
// Public link ağı = (TR location core) ∩ (o locale'de approved+indexable yüzey).
// Admin'e yeni ilçe/mahalle eklenip yayına alınınca ağ kendiliğinden genişler;
// hiçbir yerde 39/975 gibi sabit sayı ya da slug listesi tutulmaz.
// ---------------------------------------------------------------------------
import { fetchCityDistricts, fetchDistrictNeighborhoods } from "@/lib/api";
import { fetchGlobalPagesInventory } from "./api";
import { DESTINATION_ROOT, type GlobalLocale } from "./config";

export type LocationNode = { slug: string; name: string };

export type ParsedLocation =
  | { kind: "city"; city: string }
  | { kind: "district"; city: string; district: string }
  | { kind: "neighborhood"; city: string; district: string; neighborhood: string };

/** global_pages page_key → lokasyon hiyerarşisi (lokasyon değilse null). */
export function parseLocationKey(key: string): ParsedLocation | null {
  const p = key.split("/").filter(Boolean);
  if (p[0] !== DESTINATION_ROOT) return null;
  if (p.length === 1) return { kind: "city", city: p[0] };
  if (p.length === 2) return { kind: "district", city: p[0], district: p[1] };
  if (p.length === 3) return { kind: "neighborhood", city: p[0], district: p[1], neighborhood: p[2] };
  return null;
}

/** "Caferağa Mah" → "Caferağa" (TR NeighborhoodCards ile aynı kural). */
function kisaAd(name: string): string {
  return name.replace(/\s+Mah\.?$/i, "").trim() || name;
}

/** Ad bulunamazsa slug'dan okunabilir yedek (yalnız fallback — kaynak değil). */
function slugAdi(slug: string): string {
  return slug
    .replace(/-mah$/i, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1))
    .join(" ");
}

/** O locale'de yayında olan page_key kümesi (yoksa null → filtre uygulanmaz). */
async function yayindakiler(locale: GlobalLocale): Promise<Set<string> | null> {
  const inv = await fetchGlobalPagesInventory(locale);
  return inv ? new Set(inv.map((x) => x.page_key)) : null;
}

/**
 * İstanbul'un o dilde YAYINDA olan ilçeleri. Adlar TR location core'dan gelir
 * (coğrafi adlar 13 dilde korunur — kanun §8).
 */
export async function fetchLocaleDistricts(
  locale: GlobalLocale,
  city: string = DESTINATION_ROOT
): Promise<LocationNode[]> {
  const [ilceler, yayin] = await Promise.all([fetchCityDistricts(city), yayindakiler(locale)]);
  return ilceler
    .filter((d) => !yayin || yayin.has(`${city}/${d.slug}`))
    .map((d) => ({ slug: d.slug, name: d.name || slugAdi(d.slug) }));
}

/**
 * Bir ilçenin o dilde YAYINDA olan mahalleleri + ilçe/şehrin gerçek adı.
 * Parent–child ilişkisi Delivery Motor'dan çözülür; başka ilçenin mahallesi
 * yanlış parent altında ASLA görünmez.
 */
export async function fetchLocaleNeighborhoods(
  locale: GlobalLocale,
  city: string,
  district: string
): Promise<{ cityName: string; districtName: string; items: LocationNode[] }> {
  const [veri, yayin] = await Promise.all([
    fetchDistrictNeighborhoods(city, district),
    yayindakiler(locale),
  ]);
  const items = (veri?.neighborhoods ?? [])
    .filter((n) => !yayin || yayin.has(`${city}/${district}/${n.slug}`))
    .map((n) => ({ slug: n.slug, name: kisaAd(n.name) || slugAdi(n.slug) }));
  return {
    cityName: veri?.city?.name || slugAdi(city),
    districtName: veri?.district?.name || slugAdi(district),
    items,
  };
}

/** Breadcrumb için üst seviyelerin gerçek adları (tek uçtan, ek istek yok). */
export async function fetchLocationNames(
  city: string,
  district?: string,
  neighborhood?: string
): Promise<{ cityName: string; districtName: string; neighborhoodName: string }> {
  if (!district) return { cityName: slugAdi(city), districtName: "", neighborhoodName: "" };
  const veri = await fetchDistrictNeighborhoods(city, district);
  const n = neighborhood ? veri?.neighborhoods.find((x) => x.slug === neighborhood) : undefined;
  return {
    cityName: veri?.city?.name || slugAdi(city),
    districtName: veri?.district?.name || slugAdi(district),
    neighborhoodName: neighborhood ? kisaAd(n?.name ?? "") || slugAdi(neighborhood) : "",
  };
}
