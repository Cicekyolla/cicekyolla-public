// ============================================================================
// ÖZEL GÜN GERİ SAYIM ŞERİDİ — saf yardımcılar (1 Kas 2026)
// Kaynak: GET /api/public/seo/countdowns (db/123 countdown_banner_settings; Admin → SEO Merkezi → Geri Sayım).
// Hedef tarih Europe/Istanbul 00:00 (TR'de yaz saati yok → sabit +03:00). Hedef gün day_text,
// ertesi gün 00:00'dan itibaren gizli. Bileşen: components/countdown/CountdownStrip.tsx.
// ============================================================================

export interface CountdownItem {
  id: string;
  enabled: boolean;
  label: string;
  target_date: string;
  sub_text: string;
  day_text: string;
  cta_label: string;
  cta_href: string;
  show_on_home: boolean;
  paths: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const internalHref = (v: unknown): string => {
  const s = str(v, 300);
  return /^\/(?!\/)[^\s]*$/.test(s) ? s : "";
};

export const countdownTargetMs = (date: string): number => Date.parse(`${date}T00:00:00+03:00`);
export const countdownEndMs = (date: string): number => countdownTargetMs(date) + DAY_MS;

export function normalizePath(p: string | null | undefined): string {
  if (!p) return "/";
  const clean = p.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return clean || "/";
}

/** Uçtan gelen ham listeyi güvenli şekle çeker; bozuk öğe düşer. */
export function normalizeCountdownItems(raw: unknown): CountdownItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CountdownItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const target_date = str(o.target_date, 10);
    const label = str(o.label, 80);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target_date) || !Number.isFinite(countdownTargetMs(target_date)) || !label) continue;
    out.push({
      id: str(o.id, 60),
      enabled: o.enabled === true,
      label,
      target_date,
      sub_text: str(o.sub_text, 140),
      day_text: str(o.day_text, 140),
      cta_label: str(o.cta_label, 40),
      cta_href: internalHref(o.cta_href),
      show_on_home: o.show_on_home === true,
      paths: Array.isArray(o.paths) ? o.paths.filter((p): p is string => typeof p === "string").map(normalizePath) : [],
    });
  }
  return out;
}

/** Bu yolda gösterilecek ilk açık + süresi geçmemiş öğe ("/" için show_on_home). */
export function pickCountdown(items: CountdownItem[], path: string, now = Date.now()): CountdownItem | null {
  const p = normalizePath(path);
  return (
    items.find(
      (i) => i.enabled && now < countdownEndMs(i.target_date) && (p === "/" ? i.show_on_home || i.paths.includes("/") : i.paths.includes(p)),
    ) ?? null
  );
}

export type CountdownPhase =
  | { kind: "before"; days: number; hours: number; minutes: number }
  | { kind: "day" }
  | { kind: "over" };

export function countdownPhase(targetDate: string, now: number): CountdownPhase {
  const target = countdownTargetMs(targetDate);
  if (now >= countdownEndMs(targetDate)) return { kind: "over" };
  if (now >= target) return { kind: "day" };
  // Dakikaya yukarı yuvarla: son dakikada "0 dk" yazmasın.
  const totalMin = Math.ceil((target - now) / 60_000);
  return { kind: "before", days: Math.floor(totalMin / 1440), hours: Math.floor((totalMin % 1440) / 60), minutes: totalMin % 60 };
}

/** "X gün Y saat Z dk" (0 gün / 0 saat başta yazılmaz); short → "Xg Ysa Zdk" (mobil). */
export function formatRemaining(ph: { days: number; hours: number; minutes: number }, short = false): string {
  const parts: string[] = [];
  if (ph.days > 0) parts.push(short ? `${ph.days}g` : `${ph.days} gün`);
  if (ph.days > 0 || ph.hours > 0) parts.push(short ? `${ph.hours}sa` : `${ph.hours} saat`);
  parts.push(short ? `${ph.minutes}dk` : `${ph.minutes} dk`);
  return parts.join(" ");
}
