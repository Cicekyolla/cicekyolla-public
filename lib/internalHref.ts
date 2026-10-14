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

/**
 * EK (13 Eki 2026 — İSTANBUL TR ↔ 13 DİL): operatör HTML'indeki (intro_html / blok metni) site içi `href`'ler
 * yönetilen 301 kaynağıysa SON adrese çözülür. Kayıt DEĞİŞMEZ (yalnız çıktı): ör. Kadıköy metnindeki
 * href="/istanbul/uskudar" → "/uskudar-cicek-siparisi" (her tıklamada / taramada bir 301 sıçraması eksilir).
 * Yalnız "/" ile başlayan göreli yollar ("//dış-site" hariç); sorgu ve parça (#) korunur; haritada yoksa
 * ya da harita boşsa HTML bayt bayt aynı döner.
 */
export function withMovedHtmlHrefs(html: string, redirects: RedirectMap): string {
  if (!html || redirects.size === 0) return html;
  return html.replace(/(\bhref\s*=\s*)(["'])(\/(?!\/)[^"'?#\s]*)([?#][^"']*)?\2/gi, (all, attr: string, q: string, path: string, rest?: string) => {
    const to = redirects.get(normalizeInternalPath(path));
    return to && to !== normalizeInternalPath(path) ? `${attr}${q}${to}${rest ?? ""}${q}` : all;
  });
}
