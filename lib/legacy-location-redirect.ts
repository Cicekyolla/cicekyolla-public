import locationMap from "@/lib/legacy-location-map.json";
import publicLocationTargets from "@/lib/legacy-location-public-targets.json";
import publicNeighborhoodTargets from "@/lib/legacy-neighborhood-targets.json";

const SUFFIXES = [
  "cicek-gonderme",
  "cicek-siparisi",
  "cicek-siparsi",
  "cicek-yolla",
  "cicekci",
  "cicek",
] as const;

const CITY_ALIASES: Record<string, string> = {
  afyon: "afyonkarahisar",
  tuncel: "tunceli",
};

const PAIR_ALIASES: Record<string, string> = {
  "ankara-kazan": "/ankara/kahramankazan",
};

const cities = new Set(Object.keys(locationMap));
const publicTargets = new Set(publicLocationTargets);
/** Yayındaki mahalle yolları: "/istanbul/kadikoy/moda-mah" (1.012 adet). */
const neighborhoodTargets = new Set<string>(publicNeighborhoodTargets);
const cityDistrictTargets = new Map<string, string>();
const districtTargets = new Map<string, string[]>();

for (const [city, districts] of Object.entries(locationMap)) {
  for (const district of districts) {
    const target = `/${city}/${district}`;
    if (publicTargets.has(target)) {
      cityDistrictTargets.set(`${city}-${district}`, target);
      districtTargets.set(district, [...(districtTargets.get(district) ?? []), target]);
    }
  }
}

function normalizePath(pathname: string): string {
  let value = pathname;
  try {
    value = decodeURIComponent(pathname);
  } catch {
    // Bozuk percent-encoding güvenli biçimde eşleşmeden çıkar.
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

export type LegacyLocationResult =
  | { matched: false }
  | {
      matched: true;
      destination: string | null;
      normalizedBase: string;
      suffix: (typeof SUFFIXES)[number];
    };

export function resolveLegacyLocation(pathname: string): LegacyLocationResult {
  let clean = normalizePath(pathname);
  if (!clean || clean.includes("/") || clean.endsWith(".html")) {
    return { matched: false };
  }

  clean = clean.replace(/-\d+$/, "");
  const suffix = SUFFIXES.find((candidate) => clean.endsWith(`-${candidate}`));
  if (!suffix) return { matched: false };

  let base = clean.slice(0, -(suffix.length + 1));
  if (!base) {
    return { matched: true, destination: null, normalizedBase: base, suffix };
  }

  const pairAlias = PAIR_ALIASES[base];
  if (pairAlias && publicTargets.has(pairAlias)) {
    return { matched: true, destination: pairAlias, normalizedBase: base, suffix };
  }

  base = CITY_ALIASES[base] ?? base;
  if (cities.has(base) && publicTargets.has(`/${base}`)) {
    return {
      matched: true,
      destination: `/${base}`,
      normalizedBase: base,
      suffix,
    };
  }

  const parts = base.split("-");
  for (let index = 1; index < parts.length; index += 1) {
    const rawCity = parts.slice(0, index).join("-");
    const city = CITY_ALIASES[rawCity] ?? rawCity;
    const district = parts.slice(index).join("-");
    const target = cityDistrictTargets.get(`${city}-${district}`);
    if (target) {
      return {
        matched: true,
        destination: target,
        normalizedBase: base,
        suffix,
      };
    }
  }

  // ── ESKİ SİTE MAHALLE URL'LERİ ────────────────────────────────────────────
  // Eski site 73.277 mahalle adresi üretiyordu:
  //   /{il}-{ilce}-{mahalle}-mahallesi-cicekci
  // Yukarıdaki il-ilçe döngüsü "moda-mahallesi" artığını çözemediği için hepsi
  // en sonda İL sayfasına düşüyordu (/istanbul, /ankara …): 73 bin URL 4 sayfaya
  // akıyordu ve Google bunu soft 404 olarak okuyordu.
  //
  // Artık en uzun il-ilçe öneki bulunur, kalan kısım mahalle olarak çözülür:
  //   mahalle yayındaysa  -> /{il}/{ilce}/{mahalle}-mah   (990 URL)
  //   yayında değilse     -> /{il}/{ilce}                 (72.287 URL)
  // İkisi de gerçek, yayında ve indekslenmiş hedeflerdir.
  // Eski slug'lar üç biçimde gelir; hepsi aynı kurala indirgenir:
  //   ...-mahallesi                         -> /{il}/{ilce}/{ad}-mah
  //   ...-mahallesi-(filanca-koyu)          -> parantez atılır
  //   ...-koyu                              -> /{il}/{ilce}/{ad}-koyu
  const neighborhoodMatch = base
    .replace(/\(.*?\)/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    // Kısaltmalar da yakalanır: "yenimah." (tiresiz, noktalı), "akca-mh."
    // Tire opsiyonel; ilçe eşleşmesi bu daldan ÖNCE denendiği için
    // "/istanbul-cekmekoy-cicekci" gibi adresler buraya hiç düşmez.
    .match(/^(.*?)-?(mahallesi|mahalle|mah|mh|koyu|koy)\.?$/);
  if (neighborhoodMatch) {
    const withoutSuffix = neighborhoodMatch[1];
    // Kaynak "köy" ise hedef slug'ı da "-koyu" ile aranır (yeni sitede
    // /bilecik/bozuyuk/akcapinar-koyu gibi kayıtlar var).
    const targetSuffixes =
      neighborhoodMatch[2] === "koyu" || neighborhoodMatch[2] === "koy"
        ? ["koyu", "mah"]
        : ["mah", "koyu"];
    const segments = withoutSuffix.split("-");
    // En UZUN il-ilçe öneki önce denenir: "afyonkarahisar-emirdag" gibi çok
    // parçalı adlar, kısa öneklerle yanlış eşleşmesin.
    for (let index = segments.length - 1; index >= 2; index -= 1) {
      for (let split = 1; split < index; split += 1) {
        const rawCity = segments.slice(0, split).join("-");
        const city = CITY_ALIASES[rawCity] ?? rawCity;
        const district = segments.slice(split, index).join("-");
        const districtTarget = cityDistrictTargets.get(`${city}-${district}`);
        if (!districtTarget) continue;

        const neighborhood = segments.slice(index).join("-");
        const yayindaki = targetSuffixes
          .map((ek) => `${districtTarget}/${neighborhood}-${ek}`)
          .find((yol) => neighborhoodTargets.has(yol));
        return {
          matched: true,
          // Mahalle yayındaysa oraya, değilse İLÇE sayfasına. İl sayfasına
          // düşmek artık yok — 73 bin URL'in 4 il sayfasına akması bitti.
          destination: yayindaki ?? districtTarget,
          normalizedBase: base,
          suffix,
        };
      }
    }
  }

  const uniqueDistrictTargets = districtTargets.get(base) ?? [];
  return {
    matched: true,
    destination: uniqueDistrictTargets.length === 1 ? uniqueDistrictTargets[0] : null,
    normalizedBase: base,
    suffix,
  };
}
