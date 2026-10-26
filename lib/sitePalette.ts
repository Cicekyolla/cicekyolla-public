// ============================================================================
// lib/sitePalette.ts — SİTE PALETİ: "Sıcak Pudra & Mat Mor" (26 Eki 2026)
// ----------------------------------------------------------------------------
// Kaynak öneri: Admin › Ayarlar › Tema Önizleme (theme-pudra.css değerleri).
//   • Anahtar: sunucu ortam değişkeni CY_SITE_PALETTE=pudra. Yoksa / başka değerse
//     palet KAPALI → layout data-palette basmaz, site birebir bugünkü gibi kalır.
//   • Açıkken Pudra, Tema & Sezon hattına YERLEŞİK tema olarak girer: yayındaki
//     sezon temasının (ör. Sonbahar) yerini alır; V72–V74 düzenleri (boşluk,
//     başlık yanı CTA, zemin geçişleri) aynen çalışır, renkleri Pudra olur.
//   • Yalnız Türkçe sayfalar (Global 13 dil V80 kabuğu kendi tasarımında kalır).
//   • Sabit yazılmış bileşen renkleri globals.css "SİTE PALETİ" bloğunda,
//     html[data-palette="pudra"] kapısı altında eşlenir. Header/footer hariç.
// ============================================================================
import type { ResolvedSeason, SeasonThemeData } from "./seasonTheme";

export type SitePalette = "pudra";

/** Sunucuda okunur (derleme + ISR yeniden üretim). İstemciye gömülmez. */
export function sitePalette(env: Record<string, string | undefined> = process.env): SitePalette | null {
  return env.CY_SITE_PALETTE?.trim().toLowerCase() === "pudra" ? "pudra" : null;
}

/** Pudra'nın Tema & Sezon hattındaki karşılığı (rozet yok → ürün kartında sezon etiketi çıkmaz). */
export const PUDRA_THEME: SeasonThemeData = {
  id: "pudra",
  name: "Sıcak Pudra",
  enabled: true,
  starts_at: null,
  ends_at: null,
  colors: {
    surface: "#F1DFD7",      // --bg-section (koyu pudra)
    surface_alt: "#EEE6EC",  // --lilac-warm (sıcak lila yüzey)
    accent: "#E3B896",       // --accent-autumn (kayısı) — koyu bölüm vurgusu, 11,2:1
    accent_text: "#5B4879",  // --primary-hover — açık zeminde vurgu metni, 6,15–6,85:1
    amber: "#E3B896",
    ink: "#2A1B3D",          // --text (koyu mürdüm)
  },
  overlay: { color: "#2A1B3D", opacity: 78, direction: "left" },
};

/** Palet açıksa yayındaki sezonun yerine Pudra; admin'in boşluk seçimi korunur (yoksa Dengeli). */
export function withSitePalette(resolved: ResolvedSeason | null, palette: SitePalette | null): ResolvedSeason | null {
  if (palette !== "pudra") return resolved;
  return { theme: PUDRA_THEME, density: resolved && resolved.density !== "current" ? resolved.density : "balanced" };
}
