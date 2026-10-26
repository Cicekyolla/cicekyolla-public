// node --test lib/sitePalette.test.ts
//
// SİTE PALETİ (26 Eki 2026):
//   A) Anahtar yalnız CY_SITE_PALETTE=pudra ile açılır; boş/başka değer → kapalı.
//   B) Kapalıyken yayındaki sezon aynen döner (site bugünkü gibi).
//   C) Açıkken Pudra sezonun yerini alır; admin boşluk seçimi korunur, yoksa Dengeli.
//   D) Pudra kontrastları AA (açık zemin metni, vurgu metni, koyu bölüm vurgusu).
//   E) globals.css bloğu yalnız html[data-palette="pudra"] kapısında; header/footer kilitli.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sitePalette, withSitePalette, PUDRA_THEME } from "./sitePalette.ts";
import type { ResolvedSeason } from "./seasonTheme.ts";

function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("A) anahtar", () => {
  assert.equal(sitePalette({}), null);
  assert.equal(sitePalette({ CY_SITE_PALETTE: "" }), null);
  assert.equal(sitePalette({ CY_SITE_PALETTE: "sonbahar" }), null);
  assert.equal(sitePalette({ CY_SITE_PALETTE: "pudra" }), "pudra");
  assert.equal(sitePalette({ CY_SITE_PALETTE: " Pudra " }), "pudra");
});

test("B) kapalıyken sezon aynen", () => {
  const s: ResolvedSeason = { theme: { ...PUDRA_THEME, id: "sonbahar" }, density: "airy" };
  assert.equal(withSitePalette(s, null), s);
  assert.equal(withSitePalette(null, null), null);
});

test("C) açıkken Pudra yerine geçer", () => {
  assert.deepEqual(withSitePalette(null, "pudra"), { theme: PUDRA_THEME, density: "balanced" });
  const s: ResolvedSeason = { theme: { ...PUDRA_THEME, id: "sonbahar" }, density: "compact" };
  assert.equal(withSitePalette(s, "pudra")?.theme?.id, "pudra");
  assert.equal(withSitePalette(s, "pudra")?.density, "compact");
  assert.equal(withSitePalette({ theme: null, density: "current" }, "pudra")?.density, "balanced");
  assert.equal(PUDRA_THEME.badge, undefined, "Pudra ürün kartına sezon rozeti basmaz");
});

test("D) kontrast AA", () => {
  const c = PUDRA_THEME.colors;
  assert.ok(contrast(c.ink, "#F8ECE7") >= 4.5);
  assert.ok(contrast(c.ink, c.surface) >= 4.5);
  assert.ok(contrast(c.accent_text!, "#F8ECE7") >= 4.5);
  assert.ok(contrast(c.accent_text!, c.surface) >= 4.5);
  assert.ok(contrast(c.accent, "#0A0118") >= 4.5);
  assert.ok(contrast("#FFFFFF", "#6F5A92") >= 4.5, "beyaz CTA yazısı / mat mor");
});

test("E) CSS kapısı", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const start = css.indexOf("SİTE PALETİ");
  assert.ok(start > 0, "blok var");
  const block = css.slice(css.indexOf("*/", start) + 2);
  const rules = block.split("}").map((r) => r.trim()).filter((r) => r.includes("{") && !r.startsWith("/*"));
  for (const r of rules) {
    // Öznitelik değerlerindeki virgüller ([style*="rgba(139,92,246"]) seçici ayırıcı sayılmasın.
    const sel = r.slice(0, r.indexOf("{")).replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\[[^\]]*\]/g, (m) => (m.startsWith("[data-palette") ? m : "[]")).trim();
    for (const part of sel.split(/,(?![^()]*\))/)) assert.ok(part.trim().startsWith('html[data-palette="pudra"]'), `kapısız seçici: ${part.trim().slice(0, 80)}`);
  }
  assert.ok(block.includes(':is(header, footer, .cy-ticker)'), "header/footer/şerit kilidi");
});
