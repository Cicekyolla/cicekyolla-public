import locationMap from "@/lib/legacy-location-map.json";
import publicLocationTargets from "@/lib/legacy-location-public-targets.json";

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

  const uniqueDistrictTargets = districtTargets.get(base) ?? [];
  return {
    matched: true,
    destination: uniqueDistrictTargets.length === 1 ? uniqueDistrictTargets[0] : null,
    normalizedBase: base,
    suffix,
  };
}
