// ============================================================================
// lib/seasonTheme.ts — TEMA & SEZON katmanı (25 Eki 2026, API migration 121).
// ----------------------------------------------------------------------------
// Kaynak: yayınlanmış ana sayfa DTO'sundaki görünmez 'season_theme' bölümü
// (Admin → Homepage Admin → Tema & Sezon → Vitrin'de Yayına Al).
//   • Aktif tema = enabled + tarih penceresi içinde (API aynı anda tek tema garanti eder).
//   • Tema yok / pasif / tarih dışı → resolveSeason() null döner; layout HİÇBİR
//     sezon değişkeni basmaz → site birebir bugünkü görünür.
//   • Renkler buradan CSS değişkeni olarak <html>'e basılır; bileşenler ham hex
//     yerine var(--season-*) okur (globals.css "TEMA & SEZON" bloğu).
//   • Bölüm zemini/boşluğu planSkins() ile tek geçişte hesaplanır (beyaz ↔ krem
//     dönüşümü, aynı zemin ardışıksa sıkı üst boşluk). Saf fonksiyon → test edilir.
// ============================================================================

export type SeasonDensity = "current" | "airy" | "balanced" | "compact";
export type SkinBg = "white" | "surface" | "surface_alt" | "dark";

export interface SeasonThemeData {
  id: string;
  name: string;
  enabled: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  colors: { surface: string; surface_alt: string; accent: string; accent_text?: string; amber: string; ink: string };
  overlay: { color: string; opacity: number; direction: "left" | "top" };
  badge?: { label: string; category_ids: number[] };
}

export interface ResolvedSeason {
  theme: SeasonThemeData | null;
  density: SeasonDensity;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

function validTheme(t: unknown): t is SeasonThemeData {
  const x = t as SeasonThemeData;
  return !!x && typeof x.id === "string" && typeof x.enabled === "boolean" &&
    !!x.colors && ["surface", "surface_alt", "accent", "amber", "ink"].every((k) => HEX.test((x.colors as Record<string, string>)[k])) &&
    !!x.overlay && HEX.test(x.overlay.color) && typeof x.overlay.opacity === "number";
}

function inWindow(t: SeasonThemeData, now: Date): boolean {
  if (t.starts_at && new Date(t.starts_at) > now) return false;
  if (t.ends_at && new Date(t.ends_at) <= now) return false;
  return true;
}

/** Yayındaki DTO'dan aktif temayı + boşluk yoğunluğunu çözer. Hiçbir şey yoksa null. */
export function resolveSeason(
  sections: Array<{ type: string; enabled?: boolean; config?: Record<string, unknown> }> | null | undefined,
  now: Date = new Date(),
): ResolvedSeason | null {
  const s = sections?.find((x) => x.type === "season_theme" && x.enabled !== false);
  if (!s) return null;
  const cfg = (s.config ?? {}) as { themes?: unknown[]; density?: unknown };
  const density: SeasonDensity =
    cfg.density === "airy" || cfg.density === "balanced" || cfg.density === "compact" ? cfg.density : "current";
  const theme = (Array.isArray(cfg.themes) ? cfg.themes : []).filter(validTheme).find((t) => t.enabled && inWindow(t, now)) ?? null;
  if (!theme && density === "current") return null;
  return { theme, density };
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.round(alpha * 1000) / 1000})`;
}

/** <html> üzerine basılacak CSS değişkenleri (yalnız tema aktifken). */
export function seasonCssVars(t: SeasonThemeData): Record<string, string> {
  const from = rgba(t.overlay.color, t.overlay.opacity / 100);
  const to = rgba(t.overlay.color, 0);
  const lr = `linear-gradient(90deg, ${from} 0%, ${rgba(t.overlay.color, (t.overlay.opacity / 100) * 0.55)} 42%, ${to} 72%)`;
  const tb = `linear-gradient(180deg, ${from} 0%, ${rgba(t.overlay.color, (t.overlay.opacity / 100) * 0.5)} 48%, ${to} 82%)`;
  return {
    "--season-surface": t.colors.surface,
    "--season-surface-alt": t.colors.surface_alt,
    // accent = koyu patlıcan bölüm vurgusu; accent_text = açık zemin metni + rozet zemini (yoksa accent).
    "--season-accent": t.colors.accent,
    "--season-accent-text": t.colors.accent_text && HEX.test(t.colors.accent_text) ? t.colors.accent_text : t.colors.accent,
    "--season-amber": t.colors.amber,
    "--season-ink": t.colors.ink,
    "--season-overlay-from": from,
    "--season-overlay-to": to,
    "--season-overlay-desktop": t.overlay.direction === "left" ? lr : tb,
    "--season-overlay-mobile": tb,
  };
}

/** Ürün kartı sezon rozeti: ürün temadaki kategorilerden birindeyse etiket, yoksa undefined (mock yok). */
export function seasonBadgeFor(
  badge: SeasonThemeData["badge"] | undefined | null,
  categoryIds: Array<number | null | undefined> | undefined,
): string | undefined {
  if (!badge?.label || !badge.category_ids?.length || !categoryIds?.length) return undefined;
  return categoryIds.some((id) => id != null && badge.category_ids.includes(id)) ? badge.label : undefined;
}

// ---- Bölüm zemini + boşluk planı -------------------------------------------
/** Doğası gereği koyu bölümler: tema açıkken de koyu patlıcan kalır. */
const DARK_TYPES = new Set(["workshop_today", "editors_picks", "flower_journey", "showcase_noir"]);
/** Şerit / hero / ray: zemin ve boşluk sistemi dışında (LOCKED + kendi ölçüleri). */
const SKIP_TYPES = new Set(["collection_rail", "hero_delivery_bar", "hero", "urgency_strip", "trust_bar", "season_theme"]);

export interface SkinInput {
  type: string;
  layout?: { background?: string; compact_top?: boolean } | null;
}
export interface Skin {
  /** null → zemine dokunulmaz. */
  bg: SkinBg | null;
  /** Boşluk token'ı uygulanır mı (şerit/hero hariç). */
  spaced: boolean;
  /** Üst boşluk sıkı token'a iner. */
  tight: boolean;
}

/**
 * Sıralı bölüm listesi için zemin/boşluk planı.
 *  • seasonOn=false → zemin hiç değişmez (bg=null); yalnız boşluk yoğunluğu işler.
 *  • Açık bölümler: layout.background white/surface/surface_alt ise o; yoksa (veya
 *    'auto') beyaz ↔ krem dönüşümü. 'dark' açık bölümde YOK SAYILIR (metin koyu
 *    zeminde okunmaz) → otomatik.
 *  • Koyu bölümler: her zaman 'dark' (zemin seçimi yok sayılır).
 *  • compact_top veya bir önceki planlı bölümle AYNI zemin → tight.
 */
export function planSkins(items: SkinInput[], seasonOn: boolean): Skin[] {
  let lightIndex = 0;
  let prevBg: SkinBg | null = null;
  return items.map((it) => {
    if (SKIP_TYPES.has(it.type)) {
      prevBg = null;
      return { bg: null, spaced: false, tight: false };
    }
    const choice = it.layout?.background;
    let bg: SkinBg;
    if (DARK_TYPES.has(it.type)) bg = "dark";
    else if (choice === "white" || choice === "surface" || choice === "surface_alt") bg = choice;
    else bg = lightIndex % 2 === 0 ? "white" : "surface";
    if (bg !== "dark") lightIndex++;
    const tight = it.layout?.compact_top === true || (seasonOn && prevBg !== null && prevBg === bg);
    prevBg = bg;
    return { bg: seasonOn ? bg : null, spaced: true, tight };
  });
}
