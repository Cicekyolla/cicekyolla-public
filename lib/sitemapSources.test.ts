// lib/sitemapSources.test.ts — sitemap'in saf kararlarının regresyon testleri.
// Çalıştırma: node --test lib/sitemapSources.test.ts   (npm run test:unit)
//
// NEDEN: (1) aktif ürün sitemap dışında kalamaz → kaynak GET /api/public/seo/
// product-urls; uç yoksa (404) / hata verirse bugünkü envanter yoluna düşülür.
// (2) upstream hatası boş 200 üretmez → 503 + Retry-After + no-store.
import test from "node:test";
import assert from "node:assert/strict";
import {
  isFailedProductPage,
  isProductUrlPath,
  parseProductUrlRows,
  productUrlsResultOf,
  sitemapImageLoc,
  sitemapResponse,
  upstreamStateOf,
  SITEMAP_RETRY_AFTER_SECONDS,
} from "./sitemapSources.ts";
import { mediaUrl } from "./media.ts";

const SITE = "https://www.cicekyolla.com.tr";
const deps = { mediaUrl, absoluteUrl: (p: string) => `${SITE}${p.startsWith("/") ? p : `/${p}`}` };

test("upstreamStateOf: 200 ok, 404 missing (uç yayında değil), geri kalan failed", () => {
  assert.equal(upstreamStateOf(200), "ok");
  assert.equal(upstreamStateOf(404), "missing");
  for (const s of [0, 204, 301, 401, 403, 429, 500, 502, 503, 504]) assert.equal(upstreamStateOf(s), "failed", String(s));
});

test("isProductUrlPath: yalnız /urun/<küçük-harf-slug>", () => {
  for (const ok of ["/urun/101-kirmizi-gul-buketi", "/urun/a", "/urun/7-li-orkide", "/urun/x--y"]) {
    assert.equal(isProductUrlPath(ok), true, ok);
  }
  for (const bad of [
    "/urun/Kirmizi-Gul", "/urun/", "/urun", "/urun/a/b", "/urun/a?x=1", "/urun/a#b", "urun/a",
    "/kategori/guller", "/urun/çiçek", "/urun/a b", "https://www.cicekyolla.com.tr/urun/a", "", null, undefined, 7,
  ]) {
    assert.equal(isProductUrlPath(bad), false, String(bad));
  }
});

test("parseProductUrlRows: geçersiz yol atılır, aynı yol bir kez, alanlar normalize edilir", () => {
  const rows = parseProductUrlRows({
    data: [
      { url_path: "/urun/a", updated_at: "2026-09-15T01:01:29.706Z", image: " https://pub-x.r2.dev/p/a.webp ", name: "A" },
      { url_path: "/urun/a", updated_at: "2026-01-01T00:00:00.000Z", image: null, name: "A kopya" },
      { url_path: "/urun/B-Buyuk", updated_at: null, image: null, name: "B" },
      { url_path: "/kategori/guller", updated_at: null, image: null, name: "K" },
      { url_path: "/urun/c", updated_at: "", image: "", name: 5 },
      null,
      "çöp",
    ],
    total: 7,
  });
  assert.deepEqual(rows, [
    { url_path: "/urun/a", updated_at: "2026-09-15T01:01:29.706Z", image: "https://pub-x.r2.dev/p/a.webp", name: "A" },
    { url_path: "/urun/c", updated_at: null, image: null, name: "" },
  ]);
});

test("parseProductUrlRows: zarf bozuksa null", () => {
  for (const bad of [null, undefined, {}, { data: null }, { data: "x" }, { rows: [] }, "metin", 5]) {
    assert.equal(parseProductUrlRows(bad), null);
  }
  assert.deepEqual(parseProductUrlRows({ data: [] }), []);
});

test("productUrlsResultOf: 404 missing; 5xx failed; 200 + geçerli satır ok", () => {
  assert.deepEqual(productUrlsResultOf(404, null), { state: "missing" });
  assert.deepEqual(productUrlsResultOf(500, null), { state: "failed" });
  assert.deepEqual(productUrlsResultOf(503, { data: [{ url_path: "/urun/a" }] }), { state: "failed" });
  const ok = productUrlsResultOf(200, { data: [{ url_path: "/urun/a", updated_at: null, image: null, name: "A" }], total: 1 });
  assert.equal(ok.state, "ok");
  assert.equal(ok.state === "ok" ? ok.rows.length : 0, 1);
});

test("productUrlsResultOf: 200 ama boş/bozuk yanıt ürün sitemap'ini SİLEMEZ → failed (envanter yoluna düşülür)", () => {
  assert.deepEqual(productUrlsResultOf(200, { data: [] }), { state: "failed" });
  assert.deepEqual(productUrlsResultOf(200, { data: [{ url_path: "/urun/BUYUK" }] }), { state: "failed" });
  assert.deepEqual(productUrlsResultOf(200, {}), { state: "failed" });
  assert.deepEqual(productUrlsResultOf(200, null), { state: "failed" });
});

test("isFailedProductPage: total 0 / yok → okunamadı; total > 0 → geçerli sayfa", () => {
  assert.equal(isFailedProductPage({ total: 0 }), true);
  assert.equal(isFailedProductPage({}), true);
  assert.equal(isFailedProductPage(null), true);
  assert.equal(isFailedProductPage(undefined), true);
  assert.equal(isFailedProductPage({ total: "x" }), true);
  assert.equal(isFailedProductPage({ total: 1496 }), false);
  assert.equal(isFailedProductPage({ total: "12" }), false);
});

test("sitemapImageLoc: r2.dev → /r2 proxy + mutlak URL; göreli yol mutlaklaşır; harici URL aynen", () => {
  assert.equal(
    sitemapImageLoc("https://pub-34f640508a014b148011844b087a4e48.r2.dev/products/a.webp", deps),
    `${SITE}/r2/products/a.webp`,
  );
  assert.equal(sitemapImageLoc("/r2/products/a.webp", deps), `${SITE}/r2/products/a.webp`);
  assert.equal(sitemapImageLoc("/uploads/a.jpg", deps), `${SITE}/uploads/a.jpg`);
  assert.equal(sitemapImageLoc("https://images.unsplash.com/photo-1", deps), "https://images.unsplash.com/photo-1");
});

test("sitemapImageLoc: boş değer → null (görsel etiketi basılmaz)", () => {
  for (const empty of [null, undefined, "", "   "]) assert.equal(sitemapImageLoc(empty, deps), null);
});

test("sitemapResponse: kaynak okunabildi → 200, bugünkü başlıklar birebir", async () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>';
  const res = sitemapResponse(xml);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.equal(res.headers.get("cache-control"), "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  assert.equal(res.headers.get("retry-after"), null);
  assert.equal(await res.text(), xml);
});

test("sitemapResponse: MEŞRU boş urlset (önizleme) 200 kalır — boş string null DEĞİLDİR", () => {
  assert.equal(sitemapResponse("").status, 200);
  assert.equal(sitemapResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="x"></urlset>').status, 200);
});

test("sitemapResponse: kaynak okunamadı (null) → 503 + Retry-After: 300 + no-store, XML değil", async () => {
  const res = sitemapResponse(null);
  assert.equal(res.status, 503);
  assert.equal(SITEMAP_RETRY_AFTER_SECONDS, 300);
  assert.equal(res.headers.get("retry-after"), "300");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.ok(!/xml/.test(res.headers.get("content-type") ?? ""), "503 gövdesi sitemap XML'i gibi sunulmaz");
  assert.ok(!(await res.text()).includes("<urlset"));
});
