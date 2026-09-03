// ---------------------------------------------------------------------------
// GLOBAL LOKASYON ANAHTARI (saf modül; ağ erişimi yok → node --test ile test edilir).
// global_pages page_key → şehir / ilçe / mahalle hiyerarşisi. Şehir kökü
// DESTINATION_ROOTS'tan biri olmalı (İstanbul + Antalya + Muğla + İzmir).
// ---------------------------------------------------------------------------
import { isDestinationRoot } from "./config.ts";

export type ParsedLocation =
  | { kind: "city"; city: string }
  | { kind: "district"; city: string; district: string }
  | { kind: "neighborhood"; city: string; district: string; neighborhood: string };

/** global_pages page_key → lokasyon hiyerarşisi (lokasyon değilse null). */
export function parseLocationKey(key: string): ParsedLocation | null {
  const p = key.split("/").filter(Boolean);
  if (!isDestinationRoot(p[0])) return null;
  if (p.length === 1) return { kind: "city", city: p[0] };
  if (p.length === 2) return { kind: "district", city: p[0], district: p[1] };
  if (p.length === 3) return { kind: "neighborhood", city: p[0], district: p[1], neighborhood: p[2] };
  return null;
}
