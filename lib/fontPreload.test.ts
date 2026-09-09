import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Font preload bekçisi (9 Eyl 2026): app/layout.tsx'teki preload URL'si
 * app/globals.css ilk satırındaki Google Fonts @import URL'siyle BİREBİR aynı
 * olmalı. Ayrışırsa preload boşa gider (tarayıcı "preloaded but not used"
 * uyarısı verir) ve font CSS'i iki kez iner. Biri değişince bu test kırılır.
 */
test("layout preload URL'si globals.css @import URL'sine eşit", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const layout = readFileSync("app/layout.tsx", "utf8");
  const imp = css.match(/^@import url\('(https:\/\/fonts\.googleapis\.com\/css2\?[^']+)'\);/m);
  assert.ok(imp, "globals.css: Google Fonts @import bulunamadı");
  const pre = layout.match(/const GOOGLE_FONTS_CSS_URL =\s*"([^"]+)";/);
  assert.ok(pre, "layout.tsx: GOOGLE_FONTS_CSS_URL bulunamadı");
  assert.equal(pre![1], imp![1]);
  assert.match(layout, /<link rel="preload" as="style" href=\{GOOGLE_FONTS_CSS_URL\} \/>/);
  assert.match(layout, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossOrigin="anonymous" \/>/);
});
