// lib/sitemapSources.test.ts — sitemap'in saf kararlarının regresyon testleri.
// Çalıştırma: node --test lib/sitemapSources.test.ts   (npm run test:unit)
//
// NEDEN: (1) aktif ürün sitemap dışında kalamaz → kaynak GET /api/public/seo/
// product-urls; uç yoksa (404) / hata verirse bugünkü envanter yoluna düşülür.
// (2) upstream hatası boş 200 üretmez → 503 + Retry-After + no-store.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  auditProductUrlRows,
  isFailedProductPage,
  isIncompleteProductUrls,
  isProductUrlPath,
  parseProductUrlRows,
  productUrlsResultOf,
  productUrlsWarning,
  sitemapImageLoc,
  sitemapIndexFailureAction,
  sitemapResponse,
  upstreamStateOf,
  NEXT_BUILD_PHASE,
  SITEMAP_MAX_URLS,
  SITEMAP_RETRY_AFTER_SECONDS,
} from "./sitemapSources.ts";
import { isLegacyPleskMedia, mediaUrl } from "./media.ts";

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

test("productUrlsResultOf: 200 ama boş/bozuk yanıt ürün sitemap'ini SİLEMEZ → failed (envanter yoluna düşülür) ve SESSİZ değildir", () => {
  for (const bozuk of [{ data: [] }, { data: [{ url_path: "/urun/BUYUK" }] }, {}, null]) {
    const r = productUrlsResultOf(200, bozuk);
    assert.equal(r.state, "failed", JSON.stringify(bozuk));
    assert.ok(r.state === "failed" && typeof r.warning === "string" && r.warning.length > 0, "günlük satırı var");
  }
  const hepsiGecersiz = productUrlsResultOf(200, { data: [{ url_path: "/urun/BUYUK" }] });
  assert.match(hepsiGecersiz.state === "failed" ? hepsiGecersiz.warning ?? "" : "", /\/urun\/BUYUK/, "örnek değer günlükte");
  // Uç henüz yayında değil (404) ve 200 dışı durumlar: uyarı alanı YOK (yayın öncesi beklenen hâl; günlük kirlenmez).
  assert.deepEqual(productUrlsResultOf(404, null), { state: "missing" });
  assert.deepEqual(productUrlsResultOf(502, null), { state: "failed" });
});

// ---------------------------------------------------------------------------
// EK — ürün ucu sessizce eksik kalamaz (KURAL 3)
// ---------------------------------------------------------------------------
test("auditProductUrlRows: gelen / giren / yinelenen / geçersiz sayımı + örnekler + total", () => {
  const audit = auditProductUrlRows({
    data: [
      { url_path: "/urun/a" },
      { url_path: "/urun/a" },
      { url_path: "/urun/B-Buyuk" },
      { url_path: "/urun/c_alt" },
      { url_path: "/urun/d" },
      null,
    ],
    total: 6,
  });
  assert.deepEqual(audit, { received: 6, kept: 2, duplicates: 1, invalid: 3, samples: ["/urun/B-Buyuk", "/urun/c_alt", "null"], total: 6 });
  assert.equal(auditProductUrlRows({ data: "x" }), null, "zarf bozuk");
  assert.equal(auditProductUrlRows({ data: [{ url_path: "/urun/a" }], total: "1" })?.total, null, "total sayı değilse null");
  // Sayım parseProductUrlRows ile aynı süzgeçtir: giren satır sayısı birebir.
  const govde = { data: [{ url_path: "/urun/a" }, { url_path: "/urun/a" }, { url_path: "/x" }, { url_path: "/urun/b" }] };
  assert.equal(auditProductUrlRows(govde)?.kept, parseProductUrlRows(govde)?.length);
  // Günlük örnekleri sınırlı ve kısaltılmış.
  const cok = auditProductUrlRows({ data: Array.from({ length: 40 }, (_, i) => ({ url_path: `/urun/${"X".repeat(200)}${i}` })) });
  assert.equal(cok?.samples.length, 5);
  assert.ok(cok!.samples.every((s) => s.length <= 80));
});

test("EKSİK yanıt: geçersiz yollu satır atıldıysa ok + incomplete + uyarı (aktif ürün sessizce kaybolmaz)", () => {
  // İnceleme senaryosu: 3 aktif ürün, ikisinin slug'ı /urun/<küçük-harf-slug> biçiminde değil.
  const r = productUrlsResultOf(200, { data: [{ url_path: "/urun/a" }, { url_path: "/urun/B-Buyuk" }, { url_path: "/urun/c_alt" }], total: 3 });
  assert.equal(r.state, "ok");
  if (r.state !== "ok") return;
  assert.deepEqual(r.rows.map((row) => row.url_path), ["/urun/a"]);
  assert.equal(r.incomplete, true, "çağıran eksikleri envanterle tamamlar");
  assert.match(r.warning ?? "", /2 satırın yolu geçersiz/);
  assert.match(r.warning ?? "", /\/urun\/B-Buyuk, \/urun\/c_alt/);
});

test("EKSİK yanıt: `total` gelen satır sayısından büyükse (kırpılmış yanıt) incomplete; yinelenen satır kayıp DEĞİLDİR", () => {
  const kirpik = productUrlsResultOf(200, { data: [{ url_path: "/urun/a" }], total: 1550 });
  assert.equal(kirpik.state === "ok" && kirpik.incomplete, true);
  assert.match(kirpik.state === "ok" ? kirpik.warning ?? "" : "", /total=1550 ama 1 satır geldi/);
  const tam = productUrlsResultOf(200, { data: [{ url_path: "/urun/a" }, { url_path: "/urun/a" }, { url_path: "/urun/b" }], total: 3 });
  assert.deepEqual(tam, {
    state: "ok",
    rows: [
      { url_path: "/urun/a", updated_at: null, image: null, name: "" },
      { url_path: "/urun/b", updated_at: null, image: null, name: "" },
    ],
  }, "temiz yanıtta incomplete / warning alanı hiç yok");
  // total yok ya da satır sayısından küçük → eksik sayılmaz.
  assert.equal(isIncompleteProductUrls({ received: 3, kept: 3, duplicates: 0, invalid: 0, samples: [], total: null }), false);
  assert.equal(isIncompleteProductUrls({ received: 3, kept: 3, duplicates: 0, invalid: 0, samples: [], total: 2 }), false);
  assert.equal(productUrlsWarning({ received: 3, kept: 3, duplicates: 0, invalid: 0, samples: [], total: 3 }), null);
});

test("50.000 URL sınırı: tek dosyaya sığmayan yanıt kullanılmaz → failed + uyarı (envanter yoluna düşülür)", () => {
  assert.equal(SITEMAP_MAX_URLS, 50_000);
  const satirlar = (n: number) => ({ data: Array.from({ length: n }, (_, i) => ({ url_path: `/urun/u-${i}` })), total: n });
  const sinirda = productUrlsResultOf(200, satirlar(50_000));
  assert.equal(sinirda.state === "ok" ? sinirda.rows.length : 0, 50_000, "tam sınırda geçerli");
  const asan = productUrlsResultOf(200, satirlar(50_500));
  assert.equal(asan.state, "failed");
  assert.match(asan.state === "failed" ? asan.warning ?? "" : "", /50500 satır tek sitemap dosyası sınırını \(50000\) aşıyor/);
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

test("sitemapImageLoc: istenebilir görsel adresi OLMAYAN değer basılmaz (data:, blob:, protokol-göreli, şemasız)", () => {
  for (const kotu of [
    "data:image/svg+xml;base64,PHN2Zy8+",
    "blob:https://www.cicekyolla.com.tr/1b2c",
    "//evil.example/a.jpg",
    "javascript:alert(1)",
    "products/a.webp",
    "httpfoo://x/a.jpg",
    "ftp://x/a.jpg",
  ]) {
    assert.equal(sitemapImageLoc(kotu, deps), null, kotu);
  }
  // http(s) büyük/küçük harf duyarsız kabul edilir.
  assert.equal(sitemapImageLoc("HTTPS://images.unsplash.com/photo-1", deps), "HTTPS://images.unsplash.com/photo-1");
});

test("sitemapImageLoc: artık sunulmayan eski Plesk medya yolu basılmaz (isLegacyMedia verildiyse); verilmezse süzgeç yok", () => {
  const legacyDeps = { ...deps, isLegacyMedia: isLegacyPleskMedia };
  for (const eski of [
    "https://www.cicekyolla.com.tr/storage/products/1777361590_69f062b6b9dcd.webp",
    "https://cicekyolla.com.tr/storage/products/a.webp",
    "/storage/products/a.webp",
  ]) {
    assert.equal(sitemapImageLoc(eski, legacyDeps), null, eski);
  }
  assert.equal(sitemapImageLoc("/r2/products/a.webp", legacyDeps), `${SITE}/r2/products/a.webp`, "güncel medya etkilenmez");
  assert.equal(sitemapImageLoc("https://images.unsplash.com/photo-1", legacyDeps), "https://images.unsplash.com/photo-1");
  assert.equal(sitemapImageLoc("/storage/products/a.webp", deps), `${SITE}/storage/products/a.webp`, "bağımlılık verilmezse eski davranış");
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

// ---------------------------------------------------------------------------
// EK — /sitemap.xml (index) ISR ön-üretimidir: 503 saklanırdı → hata fırlatılır
// ---------------------------------------------------------------------------
test("index kaynağı okunamadı: çalışma zamanında 'throw' (ISR son iyi kopyayı korur); derlemede 'legacy' (derleme düşmez, rota ISR kalır)", () => {
  assert.equal(NEXT_BUILD_PHASE, "phase-production-build");
  assert.equal(sitemapIndexFailureAction("phase-production-build"), "legacy");
  for (const phase of ["phase-production-server", "phase-development-server", "", undefined]) {
    assert.equal(sitemapIndexFailureAction(phase), "throw", String(phase));
  }
});

test("KAYNAK: index rotası null'da 503 DÖNMEZ — fırlatır / derlemede bugünkü render; tip rotası (istek başına) 503 yolunda kalır", () => {
  const index = readFileSync(new URL("../app/sitemap.xml/route.ts", import.meta.url), "utf8");
  assert.match(index, /^export const revalidate = 300;$/m, "ISR ömrü değişmedi (rota dinamiğe çevrilmedi)");
  assert.ok(!/force-dynamic/.test(index));
  assert.ok(index.includes("if (xml !== null) return sitemapResponse(xml);"));
  assert.ok(index.includes('if (sitemapIndexFailureAction(process.env.NEXT_PHASE) === "legacy") {'));
  assert.ok(index.includes("return sitemapResponse(await renderSitemapIndex());"));
  assert.match(index, /throw new Error\("sitemap index: /);
  assert.ok(!index.includes("sitemapResponse(null)") && !index.includes("sitemapResponse(await renderSitemapIndexOrNull())"), "index için 503 üretilmez");
  const tip = readFileSync(new URL("../app/sitemaps/[type]/route.ts", import.meta.url), "utf8");
  assert.equal(tip.split("return sitemapResponse(await ").length - 1, 3, "tip rotasının üç dalı da null → 503 üreticisinden geçer");
});
