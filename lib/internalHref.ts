// İç bağ çözümü (saf, bağımlılıksız) — Maltepe ailesi.
// "URL değiştir" ile taşınmış bir ilçe/mahalle sayfasına (ör. /istanbul/maltepe → /maltepe-cicek-siparisi) giden iç bağlar,
// MEVCUT yönetilen 301 haritasının (GET /api/public/redirects) SON hedefine çözülür. Harita boşsa girdi aynen döner.
import type { DeliveryZoneCity } from "./api.ts";

export type RedirectMap = ReadonlyMap<string, string>;

export function normalizeInternalPath(p: string): string {
  let s = (p || "").split("?")[0].split("#")[0];
  if (!s.startsWith("/")) s = "/" + s;
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s || "/";
}

/** Yol yönetilen bir 301'in kaynağıysa hedefi, değilse (normalize) kendisi. API zinciri zaten düzleştirir; tek adım. */
export function finalPathOf(map: RedirectMap, path: string): string {
  const p = normalizeInternalPath(path);
  return map.get(p) ?? p;
}

/** Teslimat bölgelerinin ilçelerine, yönetilen 301 kaynağıysa SON adresi (href) ekler. Harita boşsa girdi aynen döner. */
export function withMovedDistrictHrefs(zones: DeliveryZoneCity[], redirects: RedirectMap): DeliveryZoneCity[] {
  if (redirects.size === 0) return zones;
  return zones.map((c) => ({
    ...c,
    districts: c.districts.map((d) => {
      const to = redirects.get(`/${c.city_slug}/${d.slug}`);
      return to ? { ...d, href: to } : d;
    }),
  }));
}
