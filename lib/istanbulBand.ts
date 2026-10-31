// lib/istanbulBand.ts — üst bant: İstanbul sayfalarında kargo yarısı gizlenir (1 Kas 2026, ADDITIVE).
// İstanbul sayfası = /istanbul, /kategori/istanbul-teslimat, /{ilçe}-cicek-siparisi, /{ilçe}/{mahalle}-cicek-siparisi
// ve yer sayfaları (hastane, otel, …). Diğer tüm sayfalarda bant eskisi gibi iki yarıyla görünür.
import { KOMSU_ILCELER } from "./istanbulKomsuIlceler.ts";
import { isPlacePagePath } from "./placePages.ts";

const ILCELER = new Set(Object.keys(KOMSU_ILCELER));
const ISTANBUL_SABIT = new Set(["/istanbul", "/kategori/istanbul-teslimat"]);

export function isIstanbulPagePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (ISTANBUL_SABIT.has(clean) || isPlacePagePath(clean)) return true;
  const seg = clean.split("/").filter(Boolean);
  if (seg.length === 1) {
    const m = seg[0].match(/^([a-z]+)-cicek-siparisi$/);
    return !!m && ILCELER.has(m[1]);
  }
  if (seg.length === 2) return ILCELER.has(seg[0]) && /^[a-z0-9]+(?:-[a-z0-9]+)*-cicek-siparisi$/.test(seg[1]);
  return false;
}
