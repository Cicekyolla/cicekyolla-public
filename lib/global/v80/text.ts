// GLOBAL VERSION 80 — yaprak metin yardımcıları (import'suz; client ve server ortak).
/** {n} {x} {price} {city} {time} yer tutucularını doldurur. */
export function interp(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : String(vars[k])));
}
export type V80T = (key: string, vars?: Record<string, string | number>) => string;
export function makeT(texts: Record<string, string>): V80T {
  return (key, vars) => interp(texts[key] ?? key, vars);
}
