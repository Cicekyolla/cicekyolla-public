import test from "node:test";
import assert from "node:assert/strict";
import { optimizedImageSrc, optimizedImageSrcSet, snapOptimizerWidth, isOptimizableSrc } from "./imageOptimizer.ts";

test("yerel R2/studio/brand adresleri optimizasyon ucuna çevrilir", () => {
  assert.equal(optimizedImageSrc("/r2/abc-gul.webp", 256), "/_next/image?url=%2Fr2%2Fabc-gul.webp&w=256&q=75");
  assert.equal(optimizedImageSrc("/studio/x.webp", 640, 80), "/_next/image?url=%2Fstudio%2Fx.webp&w=640&q=80");
  assert.equal(optimizedImageSrc("/brand-logo", 640), "/_next/image?url=%2Fbrand-logo&w=640&q=75");
  assert.equal(optimizedImageSrc("/brand/cicekyolla-badge.webp", 384), "/_next/image?url=%2Fbrand%2Fcicekyolla-badge.webp&w=384&q=75");
});

test("dokunulmayanlar aynen döner", () => {
  for (const s of ["/r2/logo.svg", "/r2/anim.gif", "/api/category-image/guller", "https://images.unsplash.com/x.jpg", "https://pub-1.r2.dev/a.jpg", "/_next/image?url=x", "data:image/png;base64,AA", "/kategori/cicekler"]) {
    assert.equal(optimizedImageSrc(s, 256), s, s);
    assert.equal(isOptimizableSrc(s), false, s);
  }
  assert.equal(optimizedImageSrc("", 256), "");
  assert.equal(optimizedImageSrc(null, 256), "");
  assert.equal(optimizedImageSrc(undefined, 256), "");
});

test("genişlik Next'in izinli değerine yukarı yuvarlanır", () => {
  assert.equal(snapOptimizerWidth(87), 96);
  assert.equal(snapOptimizerWidth(256), 256);
  assert.equal(snapOptimizerWidth(257), 384);
  assert.equal(snapOptimizerWidth(700), 750);
  assert.equal(snapOptimizerWidth(99999), 3840);
});

test("srcSet tekilleştirilir ve sıralanır", () => {
  assert.equal(
    optimizedImageSrcSet("/r2/a.jpg", [828, 400, 384]),
    "/_next/image?url=%2Fr2%2Fa.jpg&w=384&q=75 384w, /_next/image?url=%2Fr2%2Fa.jpg&w=640&q=75 640w, /_next/image?url=%2Fr2%2Fa.jpg&w=828&q=75 828w",
  );
  assert.equal(optimizedImageSrcSet("https://x.com/a.jpg", [384]), undefined);
});
