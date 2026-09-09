import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { heroPreloadLinks } from "./heroPreload.ts";

test("yalnız desktop: media'sız tek preload", () => {
  assert.deepEqual(heroPreloadLinks({ desktop: "/r2/d.jpg" }), [{ href: "/r2/d.jpg" }]);
});

test("desktop + mobil: picture kuralıyla aynı kırılım (639/640)", () => {
  assert.deepEqual(heroPreloadLinks({ desktop: "/r2/d.jpg", mobile: "/r2/m.jpg" }), [
    { href: "/r2/m.jpg", media: "(max-width: 639px)" },
    { href: "/r2/d.jpg", media: "(min-width: 640px)" },
  ]);
});

test("üç kırılım: aralıklar birbirini kapsamaz, boşluk bırakmaz", () => {
  assert.deepEqual(heroPreloadLinks({ desktop: "/r2/d.jpg", tablet: "/r2/t.jpg", mobile: "/r2/m.jpg" }), [
    { href: "/r2/m.jpg", media: "(max-width: 639px)" },
    { href: "/r2/t.jpg", media: "(min-width: 640px) and (max-width: 1023px)" },
    { href: "/r2/d.jpg", media: "(min-width: 1024px)" },
  ]);
});

test("desktop + tablet (mobil yok): tablet ≤1023, desktop ≥1024", () => {
  assert.deepEqual(heroPreloadLinks({ desktop: "/r2/d.jpg", tablet: " /r2/t.jpg " }), [
    { href: "/r2/t.jpg", media: "(max-width: 1023px)" },
    { href: "/r2/d.jpg", media: "(min-width: 1024px)" },
  ]);
});

test("desktop boşsa hiç preload üretilmez", () => {
  assert.deepEqual(heroPreloadLinks({ desktop: "  ", mobile: "/r2/m.jpg" }), []);
});

test("HomeHero picture kırılımları yardımcıyla aynı (639 / 1023)", () => {
  const src = readFileSync("components/home/HomeHero.tsx", "utf8");
  assert.match(src, /<source media="\(max-width: 639px\)" srcSet=\{mobileImage\}/);
  assert.match(src, /<source media="\(max-width: 1023px\)" srcSet=\{tabletImage\}/);
  assert.match(src, /heroPreloadLinks\(/);
  assert.match(src, /rel="preload"[^>]*as="image"/);
  assert.match(src, /willChange: "transform"/);
});
