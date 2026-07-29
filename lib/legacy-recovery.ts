import locationMap from "@/lib/legacy-location-map.json";
import publicLocationTargets from "@/lib/legacy-location-public-targets.json";
import legacyCategorySlugs from "@/lib/legacy-category-slugs.json";

/* ============================================================================
   CICEKYOLLA PUBLIC — Legacy 404 Kurtarma (ADDITIVE).
   1 Mayıs URL değişiminde orfan kalan eski adresleri güvenli hedefe 301'ler.
   TEMEL KURAL: asla var olmayan bir sayfaya 301 verme (301→404 zinciri YOK).
   Fallback hedefleri repoda GERÇEKTEN var olan rotalardır (/ ve /kategori/cicekler).
   Backend ilçe sayfalarını yayınlayıp legacy-location-public-targets.json
   genişledikçe konum hedefleri otomatik /il/ilce'ye YÜKSELİR.
   ============================================================================ */

const CITY_ALIASES: Record<string, string> = {
  afyon: "afyonkarahisar",
  tuncel: "tunceli",
};

// Garanti-200 son emniyet hedefleri (repoda GERÇEKTEN var olan rotalar).
// Konum bulunamazsa anasayfa (kesin 200, yerel niyete en yakın güvenli hedef).
export const SAFE_FALLBACK = "/";
// Kategori bulunamazsa geniş, gerçek çiçek koleksiyonu (anasayfadan daha alakalı).
export const CATEGORY_FALLBACK = "/kategori/cicekler";

const cities = new Set(Object.keys(locationMap));
const publicTargets = new Set(publicLocationTargets as string[]);
const categorySlugs = new Set(legacyCategorySlugs as string[]);

// Yalnız YAYINLANMIŞ (whitelist'te olan) il/ilçe hedefleri.
const cityDistrictTarget = new Map<string, string>();
for (const [city, districts] of Object.entries(locationMap as Record<string, string[]>)) {
  for (const district of districts) {
    const target = `/${city}/${district}`;
    if (publicTargets.has(target)) cityDistrictTarget.set(`${city}-${district}`, target);
  }
}

// Not: legacy-location-redirect.ts'teki normalize ile BİREBİR aynı (drift yok).
function normalizePath(pathname: string): string {
  let value = pathname;
  try {
    value = decodeURIComponent(pathname);
  } catch {
    // bozuk encoding güvenli biçimde eşleşmeden çıkar
  }
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replace(/^\/+|\/+$/g, "");
}

// Bir konum "base"i (örn. "aydin-karacasu" veya "aydin") için whitelist'te
// yayınlanmış en iyi mevcut hedefi verir; yoksa güvenli anasayfa.
function locationSafeTarget(base: string): string {
  const parts = base.split("-");
  // il-ilçe kombinasyonu yayınlanmış mı?
  for (let i = 1; i < parts.length; i += 1) {
    const city = CITY_ALIASES[parts.slice(0, i).join("-")] ?? parts.slice(0, i).join("-");
    const district = parts.slice(i).join("-");
    const target = cityDistrictTarget.get(`${city}-${district}`);
    if (target) return target;
  }
  // il sayfası yayınlanmış mı?
  const city = CITY_ALIASES[base] ?? base;
  if (cities.has(city) && publicTargets.has(`/${city}`)) return `/${city}`;
  const firstCity = CITY_ALIASES[parts[0]] ?? parts[0];
  if (cities.has(firstCity) && publicTargets.has(`/${firstCity}`)) return `/${firstCity}`;
  // konum ama henüz sayfa yok → güvenli anasayfa (backend yayınlayınca yükselir)
  return SAFE_FALLBACK;
}

/* {il}-cicek-{ilce}-{id} "ortada cicek" formatı (örn. afyon-cicek-iscehisar-104).
   Ana resolver bunu (sonek sonda olmadığı için) kaçırır. */
export function resolveMidCicek(pathname: string): string | null {
  let clean = normalizePath(pathname);
  if (!clean || clean.includes("/") || clean.endsWith(".html")) return null;
  clean = clean.replace(/-\d+$/, "");
  const mid = clean.match(/^(.+)-cicek-([a-z]+)$/);
  if (!mid) return null;
  return locationSafeTarget(`${mid[1]}-${mid[2]}`);
}

/* Ana resolver "eşleşti ama whitelist'te hedef yok" (destination null) dediğinde
   çağrılır. 404'e düşmek yerine güvenli konum hedefine 301. */
export function locationFallback(normalizedBase: string): string {
  return locationSafeTarget(normalizedBase);
}

/* /{slug}-{id} genel kalıbı için GUARDED kategori hedefi:
   kategori gerçekten varsa /kategori/{slug}; "-cicegi" ekini düşünce varsa ona;
   yoksa gerçek /kategori/cicekler. Var olmayan kategoriye ASLA 301 verilmez. */
export function guardedCategoryTarget(slug: string): string {
  if (categorySlugs.has(slug)) return `/kategori/${slug}`;
  const stem = slug.replace(/-cicegi$/, "");
  if (stem !== slug && categorySlugs.has(stem)) return `/kategori/${stem}`;
  return CATEGORY_FALLBACK;
}
