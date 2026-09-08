// ============================================================================
// GLOBAL VERSION 80 — 13 dil varsayılan metin kaynağı + düz anahtar erişimi.
// Admin'deki "Metinler" düzenleyicisi aynı düz anahtarları (ör. hero.title1,
// mood.items.love.line) kullanır; DB'de yalnız GEÇERSİZ KILINAN anahtar saklanır.
// ============================================================================
import type { GlobalLocale } from "../config";
import type { V80Copy } from "./copyTypes";
import { en, de, fr, nl } from "./copy.west.ts";
import { it, es, pt, az } from "./copy.south.ts";
import { ru, ar, zh, ja, ko } from "./copy.east.ts";
import { interp } from "./text.ts";
export { interp, makeT, type V80T } from "./text.ts";

export const V80_COPY: Record<GlobalLocale, V80Copy> = { en, de, fr, nl, it, es, pt, az, ru, ar, zh, ja, ko };

/** İç içe metin nesnesini düz anahtar haritasına çevirir (diziler 0,1,2… ile). */
export function flattenCopy(obj: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof obj === "string") {
    out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flattenCopy(v, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) flattenCopy(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

/** Locale varsayılanları + DB geçersiz kılmaları → tek düz harita. */
export function mergedTexts(locale: GlobalLocale, overrides: Record<string, string> | null | undefined): Record<string, string> {
  const base = flattenCopy(V80_COPY[locale]);
  if (!overrides) return base;
  for (const [k, v] of Object.entries(overrides)) if (k in base || k.startsWith("x.")) base[k] = v;
  return base;
}

