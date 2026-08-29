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
// ============================================================================
// EK (İSTANBUL İLÇE DÜZELTMESI) — Ekleme 1/2  [ADDITIVE, hiçbir şey silinmedi]
// İlçe adından il çözümü. Bir ilçe adı YALNIZ TEK ile aitse güvenle çözülür;
// birden çok ilde geçen adlar (merkez, yenipazar, kemalpasa, aksu…) belirsiz
// kabul edilip çözülmez → yanlış-il 301 riski SIFIR. locationMap'ten türetilir,
// kendini günceller (yeni il/ilçe eklenince otomatik kapsar).
// ============================================================================
const districtToUniqueCity = (() => {
  const seen = new Map<string, string | null>();
  for (const [city, districts] of Object.entries(locationMap as Record<string, string[]>)) {
    for (const district of districts) {
      seen.set(district, seen.has(district) ? null : city);
    }
  }
  const out = new Map<string, string>();
  for (const [district, city] of seen) if (city) out.set(district, city);
  return out;
})();
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
  // ==========================================================================
  // EK (İSTANBUL İLÇE DÜZELTMESI) — Ekleme 2/2  [ADDITIVE, mevcut satırlar korundu]
  // base yalın bir ilçe adıysa (il verilmemiş, örn. "sisli", "maltepe", "tuzla"),
  // benzersiz ilçe→il eşlemesinden çöz; YALNIZCA whitelist'te yayınlanmışsa
  // /il/ilce'ye yönlendir. Yayınlanmamışsa aşağıdaki mevcut SAFE_FALLBACK korunur.
  // ==========================================================================
  const uniqueCity = districtToUniqueCity.get(base);
  if (uniqueCity && publicTargets.has(`/${uniqueCity}/${base}`)) {
    return `/${uniqueCity}/${base}`;
  }
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
/* /sayfa/{slug} eski (Laravel) URL yapısı. İki tür içerir:
   1) Kurumsal/statik: /sayfa/hakkimizda → /hakkimizda
   2) Konum: /sayfa/pendik-cicekci → /istanbul/pendik
   Hiçbirine uymazsa güvenli anasayfa (asla 404 bırakma). Additive. */
const SAYFA_STATIK_ROTALAR = new Set([
  "hakkimizda", "iletisim", "kurumsal", "kvkk", "sss",
  "sik-sorulan-sorular", "mesafeli-satis-sozlesmesi",
  "teslimat-bolgeleri", "blog", "site-haritasi",
]);
export function resolveSayfaLegacy(pathname: string): string | null {
  const clean = normalizePath(pathname);
  const match = clean.match(/^sayfa\/(.+)$/);
  if (!match) return null;
  const raw = match[1].replace(/\/+$/, "");
  if (SAYFA_STATIK_ROTALAR.has(raw)) return `/${raw}`;
  const slug = raw.replace(/-\d+$/, "");
  const SUFFIXES = [
    "cicek-gonderme", "cicek-siparisi", "cicek-siparsi",
    "cicek-yolla", "cicekci", "cicek",
  ];
  const suffix = SUFFIXES.find((s) => slug.endsWith(`-${s}`));
  const base = suffix ? slug.slice(0, -(suffix.length + 1)) : slug;
  if (!base) return SAFE_FALLBACK;
  return locationSafeTarget(base);
}
/* ============================================================================
   EK (KATEGORİ KONUM KURTARMA) — ADDITIVE
   v1, konum sayfalarını /kategori/{il}-{ilce}-cicek-yolla yapısıyla da
   indexletmiş (örn. /kategori/van-baskale-cicek-yolla). Bunlar v2'de 404 verir.
   resolveSayfaLegacy ile BİREBİR aynı mantık, tek fark prefix "/kategori/".
   Konum çözülemezse null → dokunma (gerçek kategori sayfaları etkilenmez).
   ============================================================================ */
export function resolveKategoriLegacy(pathname: string): string | null {
  const clean = normalizePath(pathname);
  const match = clean.match(/^kategori\/(.+)$/);
  if (!match) return null;
  const raw = match[1].replace(/\/+$/, "");
  // EK (GERÇEK KATEGORİ KORUMASI) — ADDITIVE.
  // Bu kural "konuma çözülüyor mu?" diye soruyor ama "bu kategori GERÇEKTEN var mı?"
  // diye hiç sormuyordu. Slug'ın ilk parçası bir il adıysa (locationSafeTarget'ın
  // firstCity dalı) yayındaki gerçek kategori il sayfasına 301'leniyordu:
  //   /kategori/istanbul-teslimat -> 301 /istanbul   (sitemap'te ilan edilmiş URL!)
  // Envanterde kayıtlı bir kategori artık dokunulmadan geçer. guardedCategoryTarget
  // ile aynı veri kaynağı ve aynı desen; yeni liste/servis yok.
  // Kontrol suffix SOYULMADAN ham slug üzerinde yapılır: "van-baskale-cicek-yolla"
  // gibi legacy konum-kategori adresleri envanterde olmadığı için 301'leri sürer.
  if (categorySlugs.has(raw)) return null;
  const slug = raw.replace(/-\d+$/, "");
  const SUFFIXES = [
    "cicek-gonderme", "cicek-siparisi", "cicek-siparsi",
    "cicek-yolla", "cicekci", "cicek",
  ];
  const suffix = SUFFIXES.find((s) => slug.endsWith(`-${s}`));
  const base = suffix ? slug.slice(0, -(suffix.length + 1)) : slug;
  if (!base) return null;
  const target = locationSafeTarget(base);
  // Konum çözülemediyse (SAFE_FALLBACK döndüyse) DOKUNMA: gerçek kategori
  // sayfaları (yapay-cicek-dekor vb.) yanlışlıkla anasayfaya yönlendirilmesin.
  return target === SAFE_FALLBACK ? null : target;
}
/* ============================================================================
   EK (ÖZEL GÜN "-cicekleri") — next.config.js'ten TAŞINDI, mantık AYNI.

   Kural önceden next.config.js'teydi:
     { source: '/:gun([a-z-]+)-cicekleri-:id(\\d+)', destination: '/kategori/:gun' }
     { source: '/:gun([a-z-]+)-cicekleri',           destination: '/kategori/:gun' }

   next.config redirect'leri middleware'DEN ÖNCE çalışır ve statiktir; canlı
   yönetilen yönlendirme haritasına bakamazlar. Bu yüzden operatörün Onay
   Merkezi'nde onayladığı hedefi gölgeliyorlardı:
     /masa-cicekleri  beklenen: 301 /kategori/nikah-masasi-cicekleri (200)
                      gerçek  : 308 /kategori/masa -> 404
   Kural artık middleware'de; yönetilen bir yönlendirmenin KAYNAĞI olan adreste
   devreye girmez, operatör onaylı hedef kazanır. Diğer tüm adreslerde hedef
   hesabı birebir aynıdır (bilinen 264 legacy kategori slug'ı korunur).

   Eşleşme HAM yol üzerinde yapılır (normalizePath ile değil): config'teki
   [a-z-]+ büyük harf kabul etmiyordu, davranış birebir korunsun diye burada da
   etmiyor. */
export function resolveCicekleriLegacy(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z-]+)-cicekleri(?:-\d+)?\/?$/);
  return match ? `/kategori/${match[1]}` : null;
}
