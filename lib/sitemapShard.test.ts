// lib/sitemapShard.test.ts — mahalle sitemap shard'ının regresyon testleri.
// Çalıştırma: node --test lib/sitemapShard.test.ts  (npm run test:unit)
//
// NEDEN: Türkiye geneli lokasyon geri açılışıyla yayındaki mahalle sayısı
// 70 binin üzerine çıkıyor. Google'ın sınırı sitemap başına 50.000 URL.
// Tek neighborhoods.xml bu sınırı kırardı; bu testler shard'ın sınırı asla
// aşmadığını ve BUGÜNKÜ davranışın (tek shard) korunduğunu sabitler.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_KOK = path.resolve(import.meta.dirname, "..");

type ResolveNext = (spec: string, ctx: unknown) => unknown;
type LoadNext = (url: string, ctx: unknown) => unknown;
const { registerHooks } = (await import("node:module")) as unknown as {
  registerHooks: (hooks: {
    resolve: (spec: string, ctx: unknown, next: ResolveNext) => unknown;
    load: (url: string, ctx: unknown, next: LoadNext) => unknown;
  }) => void;
};

registerHooks({
  resolve(spec: string, ctx: unknown, next: ResolveNext) {
    // "@/lib/x" ve göreli "./x" için uzantı tamamlama (tsconfig alias'ı +
    // uzantısız import'lar node --test tarafından tek başına çözülemez).
    const aday = (base: string) => {
      for (const c of [`${base}.ts`, `${base}.tsx`, `${base}.json`, base]) {
        try {
          readFileSync(c);
          return { url: pathToFileURL(c).href, shortCircuit: true };
        } catch { /* sıradaki aday */ }
      }
      return null;
    };
    if (spec.startsWith("@/")) {
      const hit = aday(path.join(REPO_KOK, spec.slice(2)));
      if (hit) return hit;
    }
    if (spec.startsWith(".")) {
      const parent = (ctx as { parentURL?: string })?.parentURL;
      if (parent?.startsWith("file:")) {
        const hit = aday(path.resolve(path.dirname(fileURLToPath(parent)), spec));
        if (hit) return hit;
      }
    }
    return next(spec, ctx);
  },
  load(url: string, ctx: unknown, next: LoadNext) {
    if (url.endsWith(".json")) {
      const src = readFileSync(fileURLToPath(url), "utf8");
      return { format: "module", source: `export default ${src};`, shortCircuit: true };
    }
    return next(url, ctx);
  },
});

const { NEIGHBORHOOD_SHARD_SIZE, parseNeighborhoodShard, shardCountOf, shardSliceOf, SITEMAP_TYPES } =
  await import("./sitemap.ts");

/** Google'ın sitemap başına sert sınırı. */
const GOOGLE_LIMIT = 50_000;

test("shard boyutu Google sınırının altında ve güvenlik payı bırakıyor", () => {
  assert.ok(NEIGHBORHOOD_SHARD_SIZE < GOOGLE_LIMIT, "shard boyutu 50.000'den küçük olmalı");
  assert.ok(NEIGHBORHOOD_SHARD_SIZE <= GOOGLE_LIMIT / 2, "en az %50 güvenlik payı beklenir");
});

test("shardCountOf: sınır değerleri", () => {
  assert.equal(shardCountOf(0), 1, "boş envanterde bile tek shard listelenir");
  assert.equal(shardCountOf(1), 1);
  assert.equal(shardCountOf(1280), 1, "bugünkü yayın (1.280) tek shard");
  assert.equal(shardCountOf(NEIGHBORHOOD_SHARD_SIZE), 1);
  assert.equal(shardCountOf(NEIGHBORHOOD_SHARD_SIZE + 1), 2);
  assert.equal(shardCountOf(70_126), Math.ceil(70_126 / NEIGHBORHOOD_SHARD_SIZE));
});

test("HİÇBİR shard Google sınırını aşmaz — 70.126 + mevcut yayın senaryosu", () => {
  const toplam = 70_126 + 1_280;
  const items = Array.from({ length: toplam }, (_, i) => i);
  const n = shardCountOf(toplam);
  let toplananUzunluk = 0;
  for (let s = 1; s <= n; s += 1) {
    const dilim = shardSliceOf(items, s);
    assert.ok(dilim.length <= NEIGHBORHOOD_SHARD_SIZE, `shard ${s} boyutu aşıldı`);
    assert.ok(dilim.length < GOOGLE_LIMIT, `shard ${s} Google sınırını aştı`);
    toplananUzunluk += dilim.length;
  }
  assert.equal(toplananUzunluk, toplam, "shard'lar envanterin tamamını kayıpsız kapsamalı");
});

test("shard'lar örtüşmez ve sıralamayı korur", () => {
  const items = Array.from({ length: NEIGHBORHOOD_SHARD_SIZE * 2 + 7 }, (_, i) => i);
  const hepsi = [
    ...shardSliceOf(items, 1),
    ...shardSliceOf(items, 2),
    ...shardSliceOf(items, 3),
  ];
  assert.deepEqual(hepsi, items, "shard birleşimi orijinal sırayı vermeli");
  assert.equal(new Set(hepsi).size, items.length, "shard'lar arasında tekrar olmamalı");
});

test("aralık dışı shard boş döner (geçerli boş urlset üretir)", () => {
  const items = [1, 2, 3];
  assert.deepEqual(shardSliceOf(items, 2), []);
  assert.deepEqual(shardSliceOf(items, 99), []);
});

test("parseNeighborhoodShard: çıplak 'neighborhoods' shard 1'e denk (geriye uyumlu)", () => {
  assert.equal(parseNeighborhoodShard("neighborhoods"), 1);
  assert.equal(parseNeighborhoodShard("neighborhoods-1"), 1);
  assert.equal(parseNeighborhoodShard("neighborhoods-2"), 2);
  assert.equal(parseNeighborhoodShard("neighborhoods-12"), 12);
});

test("parseNeighborhoodShard: geçersiz girdiler null (diğer sitemap tipleri etkilenmez)", () => {
  for (const t of [
    "products", "categories", "locations", "blog", "images", "pages", "occasions",
    "neighborhoods-0", "neighborhoods-", "neighborhoods-x", "neighborhoods-1-2",
    "locale-de", "", "neighborhood",
  ]) {
    assert.equal(parseNeighborhoodShard(t), null, t);
  }
});

test("REGRESYON: mevcut sitemap tipleri korunuyor", () => {
  for (const t of ["pages", "categories", "products", "occasions", "locations", "blog", "images"]) {
    assert.ok((SITEMAP_TYPES as readonly string[]).includes(t), `${t} kaybolmamalı`);
  }
});
