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

// SITE_INDEXABLE yalniz gercek production ortaminda true; shard render'i
// olcebilmek icin ayni kosullari kuruyoruz (import ONCESINDE olmali).
process.env.VERCEL_ENV = "production";
process.env.NEXT_PUBLIC_SITE_URL = "https://www.cicekyolla.com.tr";


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

const {
  NEIGHBORHOOD_SHARD_SIZE,
  NEIGHBORHOOD_PAGE_SIZE,
  neighborhoodShardCount,
  renderNeighborhoodShard,
} = await import("./sitemap.ts");

// ---------------------------------------------------------------------------
// GERÇEK KAYNAK TESTİ: shard artık tüm envanteri değil, yalnız kendi penceresini
// çeker. Burada API stub'lanır; amacı shard sınırlarının, sayfalamanın ve XML
// çıktısının doğru olmasını sabitlemek.
// ---------------------------------------------------------------------------
const TOPLAM = 71_406; // production read-back: published+index mahalle sayısı

/** Deterministik, sıralı sahte URL evreni (production sıralaması: url_path ASC). */
const EVREN: Array<[string, string]> = Array.from({ length: TOPLAM }, (_, i) => [
  `/il${String(i).padStart(6, "0")}/ilce/mahalle-mah`,
  "2026-08-29T20:45:00.000Z",
]);

const istenenOffsetler: number[] = [];

function stubFetch() {
  (globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
    const url = new URL(String(input));
    const limit = Number(url.searchParams.get("limit"));
    const offset = Number(url.searchParams.get("offset"));
    istenenOffsetler.push(offset);
    return {
      ok: true,
      json: async () => ({ data: { total: TOPLAM, limit, offset, items: EVREN.slice(offset, offset + limit) } }),
    };
  };
}

function locSayisi(xml: string): number {
  return (xml.match(/<loc>/g) ?? []).length;
}

test("shard sayısı API toplamından hesaplanır (tüm envanter çekilmeden)", async () => {
  stubFetch();
  istenenOffsetler.length = 0;
  assert.equal(await neighborhoodShardCount(), 4, "71.406 -> 4 shard");
  assert.deepEqual(istenenOffsetler, [0], "sayım için tek küçük istek yeter");
});

test("shard dağılımı production beklentisiyle birebir: 20.000/20.000/20.000/11.406", async () => {
  stubFetch();
  const beklenen = [20_000, 20_000, 20_000, 11_406];
  for (let s = 1; s <= 4; s++) {
    assert.equal(locSayisi(await renderNeighborhoodShard(s)), beklenen[s - 1], `shard ${s}`);
  }
});

test("her shard yalnız kendi penceresini ister (deterministik sayfalama)", async () => {
  stubFetch();
  istenenOffsetler.length = 0;
  await renderNeighborhoodShard(2);
  assert.deepEqual(istenenOffsetler, [20_000, 30_000], "shard 2 = iki sayfa, doğru offsetler");
});

test("tüm shard'lar birleşince evreni tam ve tekrarsız kaplıyor", async () => {
  stubFetch();
  const tum: string[] = [];
  for (let s = 1; s <= 4; s++) {
    for (const m of (await renderNeighborhoodShard(s)).matchAll(/<loc>([^<]+)<\/loc>/g)) tum.push(m[1]);
  }
  assert.equal(tum.length, TOPLAM, "toplam URL sayısı");
  assert.equal(new Set(tum).size, TOPLAM, "duplicate URL yok");
  assert.ok(tum.every((u) => u.startsWith("https://www.cicekyolla.com.tr/")), "mutlak URL");
});

test("aralık dışı shard geçerli ama boş urlset döner", async () => {
  stubFetch();
  const xml = await renderNeighborhoodShard(9);
  assert.equal(locSayisi(xml), 0);
  assert.match(xml, /^<\?xml/, "geçerli XML başlığı");
  assert.match(xml, /<urlset[^>]*><\/urlset>$/, "boş urlset");
});

test("lastmod üretiliyor ve ISO biçiminde", async () => {
  stubFetch();
  const xml = await renderNeighborhoodShard(1);
  const m = xml.match(/<lastmod>([^<]+)<\/lastmod>/);
  assert.ok(m, "lastmod olmalı");
  assert.equal(new Date(m![1]).toISOString(), m![1]);
});

test("SHARD_SIZE, PAGE_SIZE'ın tam katı — aksi hâlde shard sınırları kayar", () => {
  assert.equal(NEIGHBORHOOD_SHARD_SIZE % NEIGHBORHOOD_PAGE_SIZE, 0);
});
