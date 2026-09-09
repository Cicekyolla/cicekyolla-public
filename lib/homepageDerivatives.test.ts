import test from "node:test";
import assert from "node:assert/strict";
import { coverFromDetail, derivativeIndexFromLists, enrichHomepageProducts, hasDerivatives } from "./homepageDerivatives.ts";

const D = { webp: "https://x/w.webp", avif: "https://x/a.avif", responsive: { "400": "https://x/400.webp", "800": "https://x/800.webp" } };
const hp = (id: number, slug: string, extra: Record<string, unknown> = {}) => ({
  id, name: "Ürün " + id, slug, price_minor: 100000, sale_price_minor: null, is_new: false, cover_image_url: `https://r2/${slug}.webp`, pinned: false, ...extra,
});
const dto = (sections: unknown[]) => ({ version_id: 1, version_no: 1, status: "published", revision: 1, published_at: null, sections }) as never;
type Out = { sections: Array<{ products?: Array<Record<string, unknown>> }> };

test("dizin: yalnız türevi olan ürünler, ilk görülen kazanır", () => {
  const idx = derivativeIndexFromLists([
    { products: [hp(1, "a", { cover_derivatives: D, cover_blurhash: "L1" }), hp(2, "b")] as never },
    { products: [hp(1, "a", { cover_derivatives: { webp: "z" } })] as never },
  ]);
  assert.equal(idx.size, 1);
  assert.deepEqual(idx.get(1), { cover_derivatives: D, cover_blurhash: "L1" });
  assert.equal(hasDerivatives(hp(2, "b") as never), false);
  assert.equal(hasDerivatives({ cover_derivatives: { responsive: {} } }), false);
});

test("detaydan kapak seçimi: aynı dosya adı, yoksa ilk görsel, hiç türev yoksa null", () => {
  const detail = {
    images: [
      { id: 1, url: "https://r2/other.webp", derivatives: { webp: "o" }, blurhash: null },
      { id: 2, url: "https://r2/x.webp?v=1", derivatives: D, blurhash: "L2" },
    ],
  } as never;
  assert.deepEqual(coverFromDetail(detail, "https://cdn/x.webp"), { cover_derivatives: D, cover_blurhash: "L2" });
  assert.deepEqual(coverFromDetail(detail, "https://cdn/yok.webp"), { cover_derivatives: { webp: "o" }, cover_blurhash: null });
  assert.equal(coverFromDetail({ images: [{ id: 1, url: "u", derivatives: null, blurhash: null }] } as never, "u"), null);
  assert.equal(coverFromDetail(null, "u"), null);
});

test("zenginleştirme: dizin → detay → orijinal; girdi değişmez; sıra korunur; hata yutulur", async () => {
  const calls: string[] = [];
  const fetchDetail = async (slug: string) => {
    calls.push(slug);
    if (slug === "detay") return { images: [{ id: 9, url: "https://r2/detay.webp", derivatives: D, blurhash: "L9" }] } as never;
    if (slug === "hata") throw new Error("ağ");
    return null;
  };
  const idx = derivativeIndexFromLists([{ products: [hp(1, "dizin", { cover_derivatives: D, cover_blurhash: "L1" })] as never }]);
  const input = dto([
    { id: 10, type: "best_sellers", enabled: true, products: [hp(1, "dizin"), hp(2, "detay"), hp(3, "hata"), hp(4, "yok"), hp(5, "hazir", { cover_derivatives: { webp: "h" }, cover_blurhash: "H" })] },
    { id: 11, type: "hero", enabled: true, config: {} },
  ]);
  const before = JSON.stringify(input);
  const out = (await enrichHomepageProducts(input, idx, fetchDetail)) as unknown as Out;
  assert.equal(JSON.stringify(input), before, "girdi değişmemeli");
  const ps = out.sections[0].products!;
  assert.deepEqual(ps.map((p) => p.slug), ["dizin", "detay", "hata", "yok", "hazir"], "sıra aynı");
  assert.deepEqual(ps[0].cover_derivatives, D);
  assert.equal(ps[0].cover_blurhash, "L1");
  assert.deepEqual(ps[1].cover_derivatives, D);
  assert.equal(ps[1].cover_blurhash, "L9");
  assert.equal(ps[2].cover_derivatives, undefined, "hata → orijinal");
  assert.equal(ps[3].cover_derivatives, undefined, "bulunamadı → orijinal");
  assert.deepEqual(ps[4].cover_derivatives, { webp: "h" }, "hazır olan dokunulmaz");
  assert.deepEqual(calls.sort(), ["detay", "hata", "yok"], "dizinde olan ve hazır olan için detay çekilmez");
  assert.equal(out.sections[1], (input as unknown as Out).sections[1], "ürünsüz bölüm aynı referans");
});

test("tavan: en fazla cap kadar detay isteği", async () => {
  let n = 0;
  const fetchDetail = async () => { n++; return null; };
  const products = Array.from({ length: 10 }, (_, i) => hp(100 + i, "s" + i));
  await enrichHomepageProducts(dto([{ id: 1, type: "product_showcase", enabled: true, products }]), new Map(), fetchDetail, 4);
  assert.equal(n, 4);
});
