// lib/seasonTheme.test.ts — TEMA & SEZON katmanı (25 Eki 2026).
// Çalıştırma: node --test lib/seasonTheme.test.ts   (npm run test:unit)
//
// Korunanlar:
//   A) Tema bölümü yok / pasif / tarih dışı + yoğunluk "current" → null (site birebir bugünkü).
//   B) Aktif tema tarih penceresiyle seçilir; geçersiz renkli kayıt yok sayılır.
//   C) CSS değişkenleri: accent_text yoksa accent'e düşer; overlay yönü masaüstü degradesini belirler.
//   D) Sezon rozeti yalnız gerçek kategori eşleşmesinde (mock yok).
//   E) Zemin planı: tema kapalıyken zemine dokunulmaz; açıkken beyaz ↔ krem dönüşümü,
//      koyu bölüm koyu kalır, şerit/hero dışarıda, aynı zemin ardışıksa sıkı üst boşluk.
import test from "node:test";
import assert from "node:assert/strict";
import { planSkins, resolveSeason, seasonBadgeFor, seasonCssVars, type SeasonThemeData } from "./seasonTheme.ts";

const SONBAHAR: SeasonThemeData = {
  id: "sonbahar", name: "Sonbahar", enabled: true,
  starts_at: "2026-10-01T00:00:00.000Z", ends_at: "2026-12-01T00:00:00.000Z",
  colors: { surface: "#FAF4EC", surface_alt: "#F3E7DA", accent: "#D9641E", accent_text: "#A9481A", amber: "#F2B33D", ink: "#3B2416" },
  overlay: { color: "#1C0C06", opacity: 78, direction: "left" },
  badge: { label: "Sonbahar", category_ids: [12] },
};
const NOW = new Date("2026-10-25T12:00:00.000Z");
const sec = (config: Record<string, unknown>, enabled = true) => [{ type: "season_theme", enabled, config }];

test("A) tema yok → null", () => {
  assert.equal(resolveSeason(null, NOW), null);
  assert.equal(resolveSeason([{ type: "hero", config: {} }], NOW), null);
  assert.equal(resolveSeason(sec({ themes: [{ ...SONBAHAR, enabled: false }], density: "current" }), NOW), null);
  assert.equal(resolveSeason(sec({ themes: [SONBAHAR] }, false), NOW), null);
  assert.equal(resolveSeason(sec({ themes: [{ ...SONBAHAR, ends_at: "2026-10-20T00:00:00.000Z" }] }), NOW), null);
});

test("B) aktif tema + yoğunluk", () => {
  const r = resolveSeason(sec({ themes: [SONBAHAR], density: "balanced" }), NOW);
  assert.equal(r?.theme?.id, "sonbahar");
  assert.equal(r?.density, "balanced");
  // Tema yok ama yoğunluk seçilmiş → yalnız boşluk sistemi.
  const d = resolveSeason(sec({ themes: [], density: "compact" }), NOW);
  assert.equal(d?.theme, null);
  assert.equal(d?.density, "compact");
  const bozuk = { ...SONBAHAR, colors: { ...SONBAHAR.colors, surface: "krem" } };
  assert.equal(resolveSeason(sec({ themes: [bozuk] }), NOW), null);
});

test("C) CSS değişkenleri", () => {
  const v = seasonCssVars(SONBAHAR);
  assert.equal(v["--season-accent-text"], "#A9481A");
  assert.equal(v["--season-accent"], "#D9641E");
  assert.equal(v["--season-overlay-from"], "rgba(28, 12, 6, 0.78)");
  assert.match(v["--season-overlay-desktop"], /^linear-gradient\(90deg/);
  assert.match(v["--season-overlay-mobile"], /^linear-gradient\(180deg/);
  const eski = seasonCssVars({ ...SONBAHAR, colors: { ...SONBAHAR.colors, accent_text: undefined } });
  assert.equal(eski["--season-accent-text"], "#D9641E");
  const ust = seasonCssVars({ ...SONBAHAR, overlay: { ...SONBAHAR.overlay, direction: "top" } });
  assert.match(ust["--season-overlay-desktop"], /^linear-gradient\(180deg/);
});

test("D) sezon rozeti", () => {
  assert.equal(seasonBadgeFor(SONBAHAR.badge, [3, 12]), "Sonbahar");
  assert.equal(seasonBadgeFor(SONBAHAR.badge, [3]), undefined);
  assert.equal(seasonBadgeFor(SONBAHAR.badge, []), undefined);
  assert.equal(seasonBadgeFor({ label: "Sonbahar", category_ids: [] }, [12]), undefined);
  assert.equal(seasonBadgeFor(undefined, [12]), undefined);
});

test("E) zemin planı", () => {
  const items = [
    { type: "hero_delivery_bar" }, { type: "hero" }, { type: "workshop_today" },
    { type: "best_sellers" }, { type: "product_showcase" }, { type: "product_showcase", layout: { background: "surface" } },
    { type: "editors_picks" }, { type: "flower_journey" }, { type: "newsletter", layout: { compact_top: true } },
  ];
  const off = planSkins(items, false);
  assert.ok(off.every((s) => s.bg === null), "tema kapalıyken zemin değişmez");
  assert.deepEqual(off.map((s) => s.spaced), [false, false, true, true, true, true, true, true, true]);
  assert.equal(off[8].tight, true, "compact_top tema kapalıyken de geçerli");

  const on = planSkins(items, true);
  assert.deepEqual(on.map((s) => s.bg), [null, null, "dark", "white", "surface", "surface", "dark", "dark", "surface"]);
  assert.deepEqual(on.map((s) => s.tight), [false, false, false, false, false, true, false, true, true]);
  // Açık bölümde 'dark' seçimi yok sayılır (koyu zeminde koyu metin okunmaz).
  assert.equal(planSkins([{ type: "manifesto", layout: { background: "dark" } }], true)[0].bg, "white");
});
