// lib/sitemapProductSource.test.ts — sitemap kaynak zincirinin uçtan uca testleri
// (API stub'lanır; ağ YOK). Çalıştırma: node --test lib/sitemapProductSource.test.ts
//
// SABİTLENEN KURALLAR
//  1) products.xml / images.xml = AKTİF ürünler (GET /api/public/seo/product-urls).
//  2) Uç yoksa (404) ya da hata verirse BUGÜNKÜ envanter yolu aynen çalışır
//     (vitrin API'den önce de sonra da yayınlanabilir).
//  3) Upstream hatası boş/eksik 200 üretmez: render*OrNull → null (rota 503).
//     MEŞRU boşluk (yanıt geldi, kayıt yok) null DEĞİLDİR.
//  4) Kullanımdan kalkan <image:title> hiçbir yolda basılmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_KOK = path.resolve(import.meta.dirname, "..");

// SITE_INDEXABLE yalnız gerçek production ortamında true (import ÖNCESİNDE kurulmalı).
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
  renderSitemap,
  renderSitemapOrNull,
  renderSitemapIndex,
  renderSitemapIndexOrNull,
  renderNeighborhoodShard,
  renderNeighborhoodShardOrNull,
} = await import("./sitemap.ts");
const { renderLocaleSitemap, renderLocaleSitemapOrNull } = await import("./global/sitemap.ts");

const SITE = "https://www.cicekyolla.com.tr";
const R2 = "https://pub-34f640508a014b148011844b087a4e48.r2.dev";

// ---------------------------------------------------------------------------
// API stub'ı: yol → yanıt. `undefined` → 404 (uç yayında değil); "throw" → ağ hatası.
// ---------------------------------------------------------------------------
type Stub = { status: number; body?: unknown } | "throw" | undefined;
let routes: Record<string, Stub | ((url: URL) => Stub)> = {};
let istekler: string[] = [];

function kur(next: Record<string, Stub | ((url: URL) => Stub)>) {
  routes = next;
  istekler = [];
  uyarilar = [];
}

(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
  const url = new URL(String(input));
  istekler.push(url.pathname);
  const raw = routes[url.pathname];
  const stub = typeof raw === "function" ? raw(url) : raw;
  if (stub === "throw") throw new Error("other side closed");
  const status = stub?.status ?? 404;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (stub?.body === undefined) throw new Error("gövde yok");
      return stub.body;
    },
  };
};

const PRODUCT_URLS = "/api/public/seo/product-urls";
const INVENTORY = "/api/public/seo/inventory";
const PRODUCTS = "/api/products";
const NEIGHBORHOODS = "/api/public/seo/neighborhood-urls";

const AKTIF = {
  status: 200,
  body: {
    data: [
      { url_path: "/urun/101-kirmizi-gul-buketi", updated_at: "2026-09-15T01:01:29.706Z", image: `${R2}/products/101.webp`, name: "101 Kırmızı Gül Buketi" },
      { url_path: "/urun/yeni-urun-envanterde-yok", updated_at: "2026-10-01T08:00:00.000Z", image: "/r2/products/yeni.webp", name: "Yeni & Güzel" },
      { url_path: "/urun/gorselsiz", updated_at: null, image: null, name: "Görselsiz" },
      { url_path: "/urun/101-kirmizi-gul-buketi", updated_at: "2026-01-01T00:00:00.000Z", image: null, name: "kopya" },
    ],
    total: 4,
  },
};

// EKSİK yanıt: bir aktif ürünün yolu /urun/<küçük-harf-slug> biçiminde değil → satır sitemap'e giremez.
const AKTIF_EKSIK = {
  status: 200,
  body: {
    data: [...AKTIF.body.data, { url_path: "/urun/Buyuk-Harf", updated_at: null, image: null, name: "geçersiz yol" }],
    total: 5,
  },
};

// console.warn yakalanır: eksik / kullanılamayan yanıt GÜNLÜĞE yazılmalı (sessiz kayıp yok) ve test çıktısı kirlenmez.
let uyarilar: string[] = [];
console.warn = (...args: unknown[]) => { uyarilar.push(args.map(String).join(" ")); };

const ENVANTER = {
  status: 200,
  body: {
    data: [
      { page_type: "product", url_path: "/urun/101-kirmizi-gul-buketi", index_state: "index", updated_at: "2026-08-01T00:00:00.000Z", title: "101" },
      { page_type: "product", url_path: "/urun/noindex-urun", index_state: "noindex", updated_at: "2026-08-01T00:00:00.000Z", title: "x" },
      { page_type: "category", url_path: "/kategori/guller", index_state: "index", updated_at: "2026-08-02T00:00:00.000Z", title: "Güller" },
      { page_type: "district", url_path: "/istanbul/kadikoy", index_state: "index", updated_at: "2026-08-03T00:00:00.000Z", title: "Kadıköy" },
      { page_type: "neighborhood", url_path: "/istanbul/kadikoy/moda-mah", index_state: "index", updated_at: "2026-08-03T00:00:00.000Z", title: "Moda" },
    ],
  },
};

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------
// 1) Yeni kaynak: aktif ürünler
// ---------------------------------------------------------------------------

test("products.xml: aktif ürün ucu ok → satırlar tek kaynak (envanterde OLMAYAN ürün de girer), envanter çekilmez", async () => {
  kur({ [PRODUCT_URLS]: AKTIF, [INVENTORY]: ENVANTER });
  const xml = await renderSitemapOrNull("products");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [
    `${SITE}/urun/101-kirmizi-gul-buketi`,
    `${SITE}/urun/yeni-urun-envanterde-yok`,
    `${SITE}/urun/gorselsiz`,
  ]);
  assert.match(xml!, /<lastmod>2026-09-15T01:01:29\.706Z<\/lastmod>/, "lastmod = updated_at (ISO)");
  assert.equal((xml!.match(/<lastmod>/g) ?? []).length, 2, "updated_at null → lastmod yok");
  assert.ok(!xml!.includes("image:"), "products.xml görsel etiketi taşımaz");
  assert.deepEqual(istekler, [PRODUCT_URLS], "~11 MB envanter bu yolda hiç istenmez");
});

test("images.xml: aktif ürün ucu ok → yalnız görseli olan satırlar, mutlak <image:loc>, <image:title> YOK", async () => {
  kur({ [PRODUCT_URLS]: AKTIF, [INVENTORY]: ENVANTER });
  const xml = await renderSitemapOrNull("images");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [`${SITE}/urun/101-kirmizi-gul-buketi`, `${SITE}/urun/yeni-urun-envanterde-yok`]);
  assert.deepEqual(
    [...xml!.matchAll(/<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g)].map((m) => m[1]),
    [`${SITE}/r2/products/101.webp`, `${SITE}/r2/products/yeni.webp`],
  );
  assert.ok(!xml!.includes("image:title"), "kullanımdan kalkan etiket basılmaz");
  assert.match(xml!, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.deepEqual(istekler, [PRODUCT_URLS]);
});

test("temiz yanıt (yinelenen satır dahil) günlüğe yazılmaz; yinelenen satır kayıp sayılmaz", async () => {
  kur({ [PRODUCT_URLS]: AKTIF, [INVENTORY]: ENVANTER });
  await renderSitemapOrNull("products");
  assert.deepEqual(uyarilar, []);
  assert.deepEqual(istekler, [PRODUCT_URLS]);
});

// ---------------------------------------------------------------------------
// 1b) EKSİK yanıt: aktif ürün sessizce kaybolmaz
// ---------------------------------------------------------------------------

test("products.xml: ürün ucu EKSİK (geçersiz yollu satır) → günlüğe yazılır ve eksikler envanterle tamamlanır (birleşim)", async () => {
  // Envanterde: uçta da olan ürün (yinelenmez), ucun atamadığı/atladığı iki ürün ve bir product_location satırı.
  const envanter = {
    status: 200,
    body: {
      data: [
        ...ENVANTER.body.data,
        { page_type: "product", url_path: "/urun/Buyuk-Harf", index_state: "index", updated_at: "2026-08-05T00:00:00.000Z", title: "B" },
        { page_type: "product", url_path: "/urun/yalniz-envanterde", index_state: "index", updated_at: "2026-08-06T00:00:00.000Z", title: "Y" },
        { page_type: "product_location", url_path: "/urun/101-kirmizi-gul-buketi/kadikoy", index_state: "index", updated_at: "2026-08-07T00:00:00.000Z", title: "PL" },
      ],
    },
  };
  kur({ [PRODUCT_URLS]: AKTIF_EKSIK, [INVENTORY]: envanter });
  const xml = await renderSitemapOrNull("products");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [
    `${SITE}/urun/101-kirmizi-gul-buketi`,
    `${SITE}/urun/yeni-urun-envanterde-yok`,
    `${SITE}/urun/gorselsiz`,
    `${SITE}/urun/Buyuk-Harf`,
    `${SITE}/urun/yalniz-envanterde`,
    `${SITE}/urun/101-kirmizi-gul-buketi/kadikoy`,
  ], "aktif satırlar + envanterin KAPSANMAYAN ürün satırları; hiçbir URL iki kez yok");
  assert.deepEqual(istekler, [PRODUCT_URLS, INVENTORY], "envanter yalnız eksik yanıtta okunur");
  assert.equal(uyarilar.length, 1);
  assert.match(uyarilar[0], /^\[sitemap\] product-urls: yanıt eksik — 1 satırın yolu geçersiz \(örnek: \/urun\/Buyuk-Harf\)/);
});

test("products.xml: ürün ucu EKSİK + envanter okunamadı → eldeki aktif satırlar 200 ile verilir (uç yanıt verdi; 503 değil)", async () => {
  kur({ [PRODUCT_URLS]: AKTIF_EKSIK, [INVENTORY]: { status: 502 } });
  const xml = await renderSitemapOrNull("products");
  assert.ok(xml);
  assert.equal(locs(xml!).length, 3);
  assert.equal(uyarilar.length, 1, "eksik yine günlükte");
});

test("images.xml: ürün ucu EKSİK → aktif satırların görselleri + kapsanmayan ürünler eski sayfalı yoldan", async () => {
  kur({
    [PRODUCT_URLS]: {
      status: 200,
      // `total` gelen satır sayısından büyük: kırpılmış yanıt.
      body: { data: AKTIF.body.data, total: 9 },
    },
    [INVENTORY]: {
      status: 200,
      body: {
        data: [
          ...ENVANTER.body.data,
          { page_type: "product", url_path: "/urun/yalniz-envanterde", index_state: "index", updated_at: "2026-08-06T00:00:00.000Z", title: "Y" },
        ],
      },
    },
    [PRODUCTS]: {
      status: 200,
      body: {
        items: [
          { id: 1, slug: "101-kirmizi-gul-buketi", name: "101", cover_image_url: `${R2}/products/eski-101.webp` },
          { id: 9, slug: "yalniz-envanterde", name: "Y", cover_image_url: `${R2}/products/y.webp` },
        ],
        pagination: { page: 1, page_size: 100, total: 2, total_pages: 1 },
      },
    },
  });
  const xml = await renderSitemapOrNull("images");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [
    `${SITE}/urun/101-kirmizi-gul-buketi`,
    `${SITE}/urun/yeni-urun-envanterde-yok`,
    `${SITE}/urun/yalniz-envanterde`,
  ]);
  assert.ok(xml!.includes(`${SITE}/r2/products/101.webp`) && !xml!.includes("eski-101.webp"), "uçta olan ürünün görseli uçtan gelir (yinelenmez)");
  assert.ok(xml!.includes(`${SITE}/r2/products/y.webp`));
  assert.match(uyarilar[0], /total=9 ama 4 satır geldi/);
});

test("images.xml: basılamayan görsel (data:, eski Plesk yolu) satırı images.xml'e girmez; products.xml'de URL kalır", async () => {
  const govde = {
    status: 200,
    body: {
      data: [
        { url_path: "/urun/iyi", updated_at: null, image: "/r2/products/iyi.webp", name: "İyi" },
        { url_path: "/urun/data-uri", updated_at: null, image: "data:image/svg+xml;base64,PHN2Zy8+", name: "Data" },
        { url_path: "/urun/eski-medya", updated_at: null, image: "https://www.cicekyolla.com.tr/storage/products/1.webp", name: "Eski" },
      ],
      total: 3,
    },
  };
  kur({ [PRODUCT_URLS]: govde });
  const images = await renderSitemapOrNull("images");
  assert.deepEqual(locs(images!), [`${SITE}/urun/iyi`]);
  assert.ok(!images!.includes("data:") && !images!.includes("/storage/products/"));
  kur({ [PRODUCT_URLS]: govde });
  assert.equal(locs((await renderSitemapOrNull("products"))!).length, 3);
});

test("ürün ucu 50.000 satırı aşarsa kullanılmaz: envanter yoluna düşülür ve günlüğe yazılır", async () => {
  const cok = { status: 200, body: { data: Array.from({ length: 50_001 }, (_, i) => ({ url_path: `/urun/u-${i}`, updated_at: null, image: null, name: "" })), total: 50_001 } };
  kur({ [PRODUCT_URLS]: cok, [INVENTORY]: ENVANTER });
  const xml = await renderSitemapOrNull("products");
  assert.deepEqual(locs(xml!), [`${SITE}/urun/101-kirmizi-gul-buketi`]);
  assert.match(uyarilar[0], /50001 satır tek sitemap dosyası sınırını \(50000\) aşıyor/);
});

// ---------------------------------------------------------------------------
// 2) Uç yok (404) / hata → bugünkü envanter yolu
// ---------------------------------------------------------------------------

test("products.xml: uç 404 (API henüz yayında değil) → bugünkü envanter mantığı birebir", async () => {
  kur({ [INVENTORY]: ENVANTER });
  const xml = await renderSitemapOrNull("products");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [`${SITE}/urun/101-kirmizi-gul-buketi`], "yalnız index + product");
  assert.equal(xml, await renderSitemap("products"), "eski render ile aynı çıktı");
});

test("products.xml: uç 500 / ağ hatası / boş yanıt → envanter yoluna düşer (boş yanıt sitemap'i silemez)", async () => {
  for (const bozuk of [{ status: 500 }, "throw" as const, { status: 200, body: { data: [] } }, { status: 200, body: "çöp" }]) {
    kur({ [PRODUCT_URLS]: bozuk, [INVENTORY]: ENVANTER });
    const xml = await renderSitemapOrNull("products");
    assert.ok(xml, JSON.stringify(bozuk));
    assert.deepEqual(locs(xml!), [`${SITE}/urun/101-kirmizi-gul-buketi`], JSON.stringify(bozuk));
  }
});

test("images.xml: uç 404 → eski sayfalı yol; çıktıdan <image:title> kalktı", async () => {
  kur({
    [INVENTORY]: ENVANTER,
    [PRODUCTS]: {
      status: 200,
      body: {
        items: [
          { id: 1, slug: "101-kirmizi-gul-buketi", name: "101 Kırmızı Gül", cover_image_url: `${R2}/products/101.webp` },
          { id: 2, slug: "envanterde-yok", name: "Yok", cover_image_url: `${R2}/products/yok.webp` },
        ],
        pagination: { page: 1, page_size: 100, total: 2, total_pages: 1 },
      },
    },
  });
  const xml = await renderSitemapOrNull("images");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [`${SITE}/urun/101-kirmizi-gul-buketi`]);
  assert.match(xml!, /<image:image><image:loc>https:\/\/www\.cicekyolla\.com\.tr\/r2\/products\/101\.webp<\/image:loc><\/image:image>/);
  assert.ok(!xml!.includes("image:title"));
});

// ---------------------------------------------------------------------------
// 3) Upstream hatası boş 200 üretmez
// ---------------------------------------------------------------------------

test("envanter OKUNAMADI → envantere dayanan tüm TR tipleri null (rota 503); eski render boş urlset'te kalır", async () => {
  for (const bozuk of [{ status: 502 }, "throw" as const, { status: 200, body: { hata: true } }]) {
    for (const type of ["categories", "products", "occasions", "locations", "pages", "images"] as const) {
      kur({ [INVENTORY]: bozuk });
      assert.equal(await renderSitemapOrNull(type), null, `${type} ${JSON.stringify(bozuk)}`);
    }
  }
  kur({ [INVENTORY]: { status: 502 } });
  assert.match(await renderSitemap("categories"), /<urlset[^>]*><\/urlset>$/, "eski fonksiyonun davranışı değişmedi");
});

test("ürün ucu ok ise envanter kesintisi products.xml / images.xml'i ETKİLEMEZ", async () => {
  kur({ [PRODUCT_URLS]: AKTIF, [INVENTORY]: { status: 502 } });
  assert.equal(locs((await renderSitemapOrNull("products"))!).length, 3);
  assert.equal(locs((await renderSitemapOrNull("images"))!).length, 2);
});

test("MEŞRU boşluk null DEĞİLDİR: envanter yanıt verdi ama o tipte kayıt yok → 200 boş urlset", async () => {
  kur({ [INVENTORY]: { status: 200, body: { data: [] } } });
  const xml = await renderSitemapOrNull("occasions");
  assert.ok(xml !== null);
  assert.match(xml!, /<urlset[^>]*><\/urlset>$/);
});

test("images.xml eski yol: ürün listesi okunamadı (envanterde ürün varken total 0) → null", async () => {
  kur({ [INVENTORY]: ENVANTER, [PRODUCTS]: { status: 401 } });
  assert.equal(await renderSitemapOrNull("images"), null);
  // İkinci sayfada kesinti: eksik images.xml de 200 ile verilmez.
  kur({
    [INVENTORY]: ENVANTER,
    [PRODUCTS]: (url) =>
      url.searchParams.get("page") === null
        ? {
            status: 200,
            body: {
              items: [{ id: 1, slug: "101-kirmizi-gul-buketi", name: "101", cover_image_url: `${R2}/products/101.webp` }],
              pagination: { page: 1, page_size: 100, total: 150, total_pages: 2 },
            },
          }
        : { status: 502 },
  });
  assert.equal(await renderSitemapOrNull("images"), null);
});

test("blog.xml: envanter okunamasa da yazı listesi (kod güvenlik ağı dahil) tam → null değil", async () => {
  kur({ [INVENTORY]: { status: 502 } });
  const xml = await renderSitemapOrNull("blog");
  assert.ok(xml);
  assert.ok(locs(xml!).includes(`${SITE}/blog`));
});

test("sitemap index: shard sayısı okunamadı → null; okundu → tüm shard'lar listelenir", async () => {
  kur({ [NEIGHBORHOODS]: { status: 503 } });
  assert.equal(await renderSitemapIndexOrNull(), null);
  assert.match(await renderSitemapIndex(), /neighborhoods-1\.xml/, "eski fonksiyon tek shard'a düşmeye devam eder");

  kur({ [NEIGHBORHOODS]: { status: 200, body: { data: { total: 71_406, items: [] } } } });
  const xml = await renderSitemapIndexOrNull();
  assert.ok(xml);
  for (const n of [1, 2, 3, 4]) assert.ok(xml!.includes(`${SITE}/sitemaps/neighborhoods-${n}.xml`), `shard ${n}`);
  assert.ok(!xml!.includes("neighborhoods-5.xml"));
  assert.equal(xml, await renderSitemapIndex(), "başarılı yolda iki render aynı çıktıyı verir");
});

test("mahalle shard'ı: sayfa okunamadı → null (eksik shard 200 ile verilmez); aralık dışı shard meşru boş", async () => {
  kur({ [NEIGHBORHOODS]: { status: 502 } });
  assert.equal(await renderNeighborhoodShardOrNull(1), null);
  assert.match(await renderNeighborhoodShard(1), /<urlset[^>]*><\/urlset>$/);

  // İlk sayfa geldi, ikinci sayfa kesildi → eksik shard.
  const dolu: Array<[string, string]> = Array.from({ length: 10_000 }, (_, i) => [`/il/ilce/mah-${i}`, "2026-08-29T20:45:00.000Z"]);
  kur({
    [NEIGHBORHOODS]: (url) =>
      url.searchParams.get("offset") === "0" ? { status: 200, body: { data: { total: 15_000, items: dolu } } } : "throw",
  });
  assert.equal(await renderNeighborhoodShardOrNull(1), null);

  kur({ [NEIGHBORHOODS]: { status: 200, body: { data: { total: 71_406, items: [] } } } });
  const bos = await renderNeighborhoodShardOrNull(9);
  assert.ok(bos !== null);
  assert.match(bos!, /<urlset[^>]*><\/urlset>$/);
});

// ---------------------------------------------------------------------------
// 4) Locale sitemap'leri
// ---------------------------------------------------------------------------

const LOCALE_INV = "/api/public/translations/surface/inventory";
const LOCALE_PAGES = "/api/public/global/pages-inventory";
const SAYFALAR = { status: 200, body: { data: [{ page_key: "home", updated_at: "2026-09-03T11:27:15.143Z" }, { page_key: "istanbul", updated_at: "2026-09-03T11:27:15.143Z" }] } };

test("locale sitemap: `image` alanı yokken (eski API) çıktı bugünküyle bayt bayt aynı", async () => {
  kur({
    [LOCALE_INV]: { status: 200, body: { data: { products: [{ slug: "101-red-rose-bouquet", updated_at: "2026-09-15T00:58:31.861Z" }], categories: [{ slug: "roses", updated_at: "2026-09-29T21:27:53.959Z" }] } } },
    [LOCALE_PAGES]: SAYFALAR,
  });
  const xml = await renderLocaleSitemapOrNull("en");
  assert.equal(
    xml,
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      `<url><loc>${SITE}/en</loc><lastmod>2026-09-03T11:27:15.143Z</lastmod></url>` +
      `<url><loc>${SITE}/en/istanbul</loc><lastmod>2026-09-03T11:27:15.143Z</lastmod></url>` +
      `<url><loc>${SITE}/en/product/101-red-rose-bouquet</loc><lastmod>2026-09-15T00:58:31.861Z</lastmod></url>` +
      `<url><loc>${SITE}/en/category/roses</loc><lastmod>2026-09-29T21:27:53.959Z</lastmod></url>` +
      "</urlset>",
  );
  assert.equal(xml, await renderLocaleSitemap("en"), "eski render ile aynı çıktı");
});

test("locale sitemap: `image` taşıyan ürün satırı <image:image><image:loc> alır; ad alanı bildirilir", async () => {
  kur({
    [LOCALE_INV]: {
      status: 200,
      body: {
        data: {
          products: [
            { slug: "101-rote-rosen", updated_at: "2026-09-15T00:58:31.861Z", image: `${R2}/products/101.webp`, tr_slug: "101-kirmizi-gul-buketi" },
            { slug: "ohne-bild", updated_at: "2026-09-15T00:58:31.861Z", image: null, tr_slug: "gorselsiz" },
          ],
          categories: [{ slug: "rosen", updated_at: "2026-09-29T21:27:53.959Z" }],
        },
      },
    },
    [LOCALE_PAGES]: SAYFALAR,
  });
  const xml = await renderLocaleSitemapOrNull("de");
  assert.ok(xml);
  assert.match(xml!, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1">/);
  assert.ok(
    xml!.includes(
      `<url><loc>${SITE}/de/produkt/101-rote-rosen</loc><lastmod>2026-09-15T00:58:31.861Z</lastmod><image:image><image:loc>${SITE}/r2/products/101.webp</image:loc></image:image></url>`,
    ),
  );
  assert.ok(xml!.includes(`<url><loc>${SITE}/de/produkt/ohne-bild</loc><lastmod>2026-09-15T00:58:31.861Z</lastmod></url>`), "görselsiz satır bugünkü gibi");
  assert.equal((xml!.match(/<image:image>/g) ?? []).length, 1);
  assert.ok(!xml!.includes("image:title"));
});

test("locale sitemap: iki kaynaktan biri okunamadı → null; yanıt geldi ama liste boş → meşru boş urlset", async () => {
  const INV_OK = { status: 200, body: { data: { products: [], categories: [] } } };
  kur({ [LOCALE_INV]: { status: 502 }, [LOCALE_PAGES]: SAYFALAR });
  assert.equal(await renderLocaleSitemapOrNull("en"), null);
  kur({ [LOCALE_INV]: INV_OK, [LOCALE_PAGES]: "throw" });
  assert.equal(await renderLocaleSitemapOrNull("en"), null);
  kur({ [LOCALE_INV]: { status: 200, body: {} }, [LOCALE_PAGES]: SAYFALAR });
  assert.equal(await renderLocaleSitemapOrNull("en"), null, "200 ama zarf bozuk");
  kur({});
  assert.equal(await renderLocaleSitemapOrNull("en"), null, "iki uç da 404");

  kur({ [LOCALE_INV]: INV_OK, [LOCALE_PAGES]: { status: 200, body: { data: [] } } });
  const bos = await renderLocaleSitemapOrNull("ko");
  assert.ok(bos !== null);
  assert.match(bos!, /<urlset[^>]*><\/urlset>$/);
});

// ---------------------------------------------------------------------------
// 5) categories.xml — KATEGORİ YASASI ("kategori yalnız en az bir aktif ürün listelediği
//    sürece index'e değerdir"). Kaynak: GET /api/public/seo/category-urls (yeni uç).
// ---------------------------------------------------------------------------

const CATEGORY_URLS = "/api/public/seo/category-urls";
const satir = (page_type: string, url_path: string, index_state = "index") => (
  { page_type, url_path, index_state, updated_at: "2026-08-02T00:00:00.000Z", title: url_path }
);
const KATEGORI_ENVANTERI = {
  status: 200,
  body: {
    data: [
      satir("category", "/kategori/guller"),
      satir("category", "/kategori/bos-kategori"),
      satir("category_location", "/maltepe-cicek-siparisi"),
      satir("category", "/kategori/turkiye-geneli-kargo"),
      satir("category", "/kategori/noindex-kategori", "noindex"),
      satir("category", "/kategori/yalniz-envanterde"),
      satir("product", "/urun/101-kirmizi-gul-buketi"),
      satir("district", "/istanbul/kadikoy"),
    ],
  },
};
const KATEGORI_UCU = {
  status: 200,
  body: {
    data: [
      { url_path: "/kategori/guller", updated_at: "2026-10-01T08:00:00.000Z", active_products: 37 },
      { url_path: "/kategori/bos-kategori", updated_at: "2026-09-01T08:00:00.000Z", active_products: 0 },
      { url_path: "/kategori/yeni-kategori-envanterde-yok", updated_at: null, active_products: 4 },
      { url_path: "/kategori/turkiye-geneli-kargo", updated_at: "2026-09-20T08:00:00.000Z", active_products: 0 },
    ],
    total: 4,
  },
};
/** Bugünkü çıktı: envanterdeki index + (category | category_location) satırları, envanter sırasıyla. */
const BUGUNKU_KATEGORILER = [
  `${SITE}/kategori/guller`,
  `${SITE}/kategori/bos-kategori`,
  `${SITE}/maltepe-cicek-siparisi`,
  `${SITE}/kategori/turkiye-geneli-kargo`,
  `${SITE}/kategori/yalniz-envanterde`,
];

test("categories.xml: kategori ucu ok → ucun HER satırı (yayında + index kayıt; ürün sayısı sitemap'ten DÜŞÜRMEZ, lastmod = updated_at) + ucun kapsamadığı envanter satırları", async () => {
  kur({ [CATEGORY_URLS]: KATEGORI_UCU, [INVENTORY]: KATEGORI_ENVANTERI });
  const xml = await renderSitemapOrNull("categories");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [
    `${SITE}/kategori/guller`,
    `${SITE}/kategori/bos-kategori`,
    `${SITE}/kategori/yeni-kategori-envanterde-yok`,
    `${SITE}/maltepe-cicek-siparisi`,
    `${SITE}/kategori/turkiye-geneli-kargo`,
  ]);
  // KURAL (5 Eki 2026): yayında + index kaydı olan kategori ürünsüz olsa da sitemap'te KALIR (index durumunu kayıt belirler).
  assert.ok(xml!.includes(`<loc>${SITE}/kategori/bos-kategori</loc><lastmod>2026-09-01T08:00:00.000Z</lastmod>`), "ürünsüz ama yayında + index kategori listelenir");
  assert.equal(locs(xml!).filter((l) => l === `${SITE}/kategori/turkiye-geneli-kargo`).length, 1, "kendi rotasından sunulan kategori tek kez (envanter satırı)");
  assert.ok(!xml!.includes("/kategori/yalniz-envanterde"), "ucun listelemediği ürün kategorisi (yayınlı + index değil) girmez");
  assert.ok(!xml!.includes("noindex-kategori"));
  assert.ok(xml!.includes(`<loc>${SITE}/kategori/guller</loc><lastmod>2026-10-01T08:00:00.000Z</lastmod>`), "lastmod uçtan");
  assert.ok(xml!.includes(`<url><loc>${SITE}/kategori/yeni-kategori-envanterde-yok</loc></url>`), "updated_at null → lastmod yok");
  assert.ok(xml!.includes(`<loc>${SITE}/maltepe-cicek-siparisi</loc><lastmod>2026-08-02T00:00:00.000Z</lastmod>`), "category_location satırı envanterden AYNEN");
  assert.deepEqual([...istekler].sort(), [INVENTORY, CATEGORY_URLS].sort(), "iki okuma (paralel)");
  assert.deepEqual(uyarilar, []);
  assert.equal(xml, await renderSitemap("categories"), "iki render aynı çıktı");
});

test("categories.xml: kendi statik rotasından sunulan kategori (turkiye-geneli-kargo) envanter kararında kalır; uçta da doluysa TEK kez basılır", async () => {
  // Uç 0 sayıyor (kategoriye bağlı ürün yok) ama sayfa ürünlerini teslimat profilinden listeler → envanterden kalır (yukarıdaki test).
  // Uç > 0 sayıyorsa da URL bir kez ve envanter satırıyla basılır.
  const dolu = { status: 200, body: { data: [...KATEGORI_UCU.body.data.slice(0, 3), { url_path: "/kategori/turkiye-geneli-kargo", updated_at: "2026-09-20T08:00:00.000Z", active_products: 9 }], total: 4 } };
  kur({ [CATEGORY_URLS]: dolu, [INVENTORY]: KATEGORI_ENVANTERI });
  const xml = await renderSitemapOrNull("categories");
  assert.equal(locs(xml!).filter((l) => l === `${SITE}/kategori/turkiye-geneli-kargo`).length, 1);
  assert.ok(xml!.includes(`<loc>${SITE}/kategori/turkiye-geneli-kargo</loc><lastmod>2026-08-02T00:00:00.000Z</lastmod>`));
  // Envanterde YOKSA uç ne sayarsa saysın categories.xml'e uçtan GİRMEZ: bu rota için karar envanterdedir,
  // kayıt yoksa pages.xml listeler (aşağıdaki test) → aynı URL iki sitemap'e yazılmaz.
  const envantersiz = { status: 200, body: { data: KATEGORI_ENVANTERI.body.data.filter((s) => s.url_path !== "/kategori/turkiye-geneli-kargo") } };
  kur({ [CATEGORY_URLS]: dolu, [INVENTORY]: envantersiz });
  assert.ok(!locs((await renderSitemapOrNull("categories"))!).includes(`${SITE}/kategori/turkiye-geneli-kargo`));
  kur({ [CATEGORY_URLS]: KATEGORI_UCU, [INVENTORY]: envantersiz });
  assert.ok(!locs((await renderSitemapOrNull("categories"))!).includes(`${SITE}/kategori/turkiye-geneli-kargo`));
});

// EK: /kategori/turkiye-geneli-kargo index,follow yayınlanır ama envanterde kaydı olmadığında hiçbir
// sitemap'te yer almıyordu (4 Eki 2026: canlı envanterde bu yolun kaydı yok).
test("pages.xml: kendi statik rotasından sunulan kategori envanterde index kaydı yoksa burada listelenir; kayıt varsa yalnız categories.xml'de", async () => {
  const KARGO = `${SITE}/kategori/turkiye-geneli-kargo`;
  const envantersiz = { status: 200, body: { data: KATEGORI_ENVANTERI.body.data.filter((r) => r.url_path !== "/kategori/turkiye-geneli-kargo") } };

  // 1) Envanterde kaydı YOK → pages.xml'de bir kez, lastmod'suz; categories.xml'de (iki yolda da) yok.
  kur({ [INVENTORY]: envantersiz });
  const sayfalar = await renderSitemapOrNull("pages");
  assert.ok(sayfalar);
  assert.equal(locs(sayfalar!).filter((l) => l === KARGO).length, 1);
  assert.ok(sayfalar!.includes(`<url><loc>${KARGO}</loc></url>`), "statik rotalarla aynı biçim");
  // Mevcut statik rotalar AYNEN ve aynı sırada; yeni satır yalnız sona eklenir.
  const oncekiler = locs(sayfalar!).filter((l) => l !== KARGO);
  assert.deepEqual(locs(sayfalar!), [...oncekiler, KARGO]);
  assert.deepEqual(oncekiler.slice(0, 3), [`${SITE}/`, `${SITE}/hakkimizda`, `${SITE}/iletisim`]);
  assert.equal(oncekiler.length, 10, "statik kurumsal rota sayısı değişmedi");
  kur({ [INVENTORY]: envantersiz });
  assert.ok(!locs((await renderSitemapOrNull("categories"))!).includes(KARGO), "uç yokken (envanter yolu)");
  kur({ [CATEGORY_URLS]: KATEGORI_UCU, [INVENTORY]: envantersiz });
  assert.ok(!locs((await renderSitemapOrNull("categories"))!).includes(KARGO), "uç varken");

  // 2) Envanterde index kaydı VAR → categories.xml'de (envanter satırı, lastmod'lu); pages.xml'de YOK (aynı URL iki sitemap'e yazılmaz).
  kur({ [INVENTORY]: KATEGORI_ENVANTERI });
  assert.ok(!locs((await renderSitemapOrNull("pages"))!).includes(KARGO));
  kur({ [INVENTORY]: KATEGORI_ENVANTERI });
  assert.ok(locs((await renderSitemapOrNull("categories"))!).includes(KARGO));

  // 3) Liste tek kaynaktan gelir (yol kodda ikinci kez yazılmadı).
  const src = readFileSync(path.join(REPO_KOK, "lib", "sitemap.ts"), "utf8");
  assert.ok(src.includes("...[...DEDICATED_CATEGORY_PATHS].filter((p) => !allPaths.has(p)).map(pathNode),"));
  assert.ok(!src.includes('"/kategori/turkiye-geneli-kargo"'), "yol sabit olarak yazılmadı");
});

test("categories.xml: uç 404 (API henüz yayında değil) → bugünkü envanter mantığı BİREBİR", async () => {
  kur({ [INVENTORY]: KATEGORI_ENVANTERI });
  const xml = await renderSitemapOrNull("categories");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), BUGUNKU_KATEGORILER);
  assert.equal(
    xml,
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      BUGUNKU_KATEGORILER.map((loc) => `<url><loc>${loc}</loc><lastmod>2026-08-02T00:00:00.000Z</lastmod></url>`).join("") +
      "</urlset>",
    "çıktı bayt bayt bugünkü",
  );
  assert.deepEqual(uyarilar, [], "uç yayınlanmadan önce günlük kirlenmez");
});

test("categories.xml: uç 5xx / ağ hatası / eksik / hiçbir kategori dolu değil → envanter mantığı; kullanılamayan 200 günlüğe yazılır", async () => {
  const senaryolar: Array<[Stub, RegExp | null]> = [
    [{ status: 500 }, null],
    ["throw", null],
    [{ status: 200, body: "çöp" }, /zarf bozuk/],
    [{ status: 200, body: { data: [] } }, /ürün listeleyen kategori yok/],
    [{ status: 200, body: { data: KATEGORI_UCU.body.data.map((r) => ({ ...r, active_products: 0 })), total: 4 } }, /ürün listeleyen kategori yok/],
    [{ status: 200, body: { data: KATEGORI_UCU.body.data, total: 243 } }, /total=243 ama 4 satır geldi/],
    [{ status: 200, body: { data: [...KATEGORI_UCU.body.data, { url_path: "/kategori/sayimsiz" }], total: 5 } }, /1 satır geçersiz/],
  ];
  for (const [stub, uyari] of senaryolar) {
    kur({ [CATEGORY_URLS]: stub, [INVENTORY]: KATEGORI_ENVANTERI });
    const xml = await renderSitemapOrNull("categories");
    assert.ok(xml, JSON.stringify(stub));
    assert.deepEqual(locs(xml!), BUGUNKU_KATEGORILER, JSON.stringify(stub));
    if (uyari) {
      assert.equal(uyarilar.length, 1, JSON.stringify(stub));
      assert.match(uyarilar[0], /^\[sitemap\] category-urls: /);
      assert.match(uyarilar[0], uyari);
    } else {
      assert.deepEqual(uyarilar, [], JSON.stringify(stub));
    }
  }
});

test("categories.xml: envanter OKUNAMADI → uç ok olsa da null (rota 503): ucun kapsamadığı satırlar eksik kalırdı", async () => {
  for (const bozuk of [{ status: 502 }, "throw" as const, { status: 200, body: { hata: true } }]) {
    kur({ [CATEGORY_URLS]: KATEGORI_UCU, [INVENTORY]: bozuk });
    assert.equal(await renderSitemapOrNull("categories"), null, JSON.stringify(bozuk));
    kur({ [INVENTORY]: bozuk });
    assert.equal(await renderSitemapOrNull("categories"), null, "iki kaynak da okunamadı");
  }
});

test("kategori ucu yalnız categories.xml için okunur — diğer tipler ona istek atmaz", async () => {
  for (const type of ["products", "images", "occasions", "locations", "pages", "blog"] as const) {
    kur({ [CATEGORY_URLS]: KATEGORI_UCU, [INVENTORY]: KATEGORI_ENVANTERI, [PRODUCT_URLS]: AKTIF });
    await renderSitemapOrNull(type);
    assert.ok(!istekler.includes(CATEGORY_URLS), type);
  }
});
