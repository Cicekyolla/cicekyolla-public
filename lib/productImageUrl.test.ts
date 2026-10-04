// lib/productImageUrl.test.ts — TEK GÖRSEL KAYNAĞI testleri (ağ YOK).
// Çalıştırma: node --test lib/productImageUrl.test.ts   (npm run test:unit)
//
// SABİTLENEN KURALLAR
//  1) Makineye dönük görsel adresi = görünür <img>'in kararı (resolveProductImage) + MUTLAK adres.
//  2) Stüdyo kopyası olan eski "/storage/products/…" yolu → çalışan /studio/… adresi.
//  3) Stüdyo kopyası OLMAYAN eski yol → null (ölü adres hiçbir çıktıya yazılmaz).
//  4) R2 / "/r2/…" adresi → bugünkü çıktı, bayt bayt.
//  5) Product JSON-LD, image sitemap (TR yeni yol + yedek yol + locale) ve merchant feed
//     aynı yardımcıdan geçer.
//  6) HOST KURALI: yalnız vitrinin kendi hostu (kanonik + www'siz ikizi) kanonik adrese sabitlenir;
//     başka her host (CDN alt alan adı, API hostu, harici) AYNEN basılır.
//  7) Galeri videosu görsel olarak basılmaz; çıktı geçerli URL biçimindedir (boşluk / ASCII dışı
//     yüzde-kodlu), temiz adresin baytları değişmez.
//  8) Kategori karosuna yedek konan ürün kapağı ölü eski yolsa stüdyo kopyası kullanılır.
//
// NOT: lib/productImage.ts uzantısız import + JSON import kullanır; aşağıdaki hook YALNIZ
// bu test sürecinde çalışır — üretim koduna dokunmaz (lib/sitemapProductSource.test.ts ile aynı).
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
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
    const aday = (base: string) => {
      for (const c of [`${base}.ts`, `${base}.tsx`, `${base}.json`, base]) {
        try {
          readFileSync(c);
          return { url: pathToFileURL(c).href, shortCircuit: true };
        } catch { /* sıradaki aday */ }
      }
      return null;
    };
    // Next paketinde "exports" haritası yok: ESM altında uzantı açıkça yazılmalı.
    if (spec === "next/server") return next("next/server.js", ctx);
    if (spec.startsWith("@/")) {
      const hit = aday(path.join(REPO_KOK, spec.slice(2)));
      if (hit) return hit;
    }
    if (spec.startsWith(".")) {
      const parent = (ctx as { parentURL?: string })?.parentURL;
      if (parent?.startsWith("file:") && !parent.includes("/node_modules/")) {
        const hit = aday(path.resolve(path.dirname(fileURLToPath(parent)), spec));
        if (hit) return hit;
      }
    }
    return next(spec, ctx);
  },
  load(url: string, ctx: unknown, next: LoadNext) {
    if (url.endsWith(".json") && !url.includes("/node_modules/")) {
      const src = readFileSync(fileURLToPath(url), "utf8");
      return { format: "module", source: `export default ${src};`, shortCircuit: true };
    }
    return next(url, ctx);
  },
});

const { servedProductImageUrl, firstServedProductImageUrl, productCoverTileUrl } = await import("./productImageUrl.ts");
const { resolveProductImage } = await import("./productImage.ts");
const { mediaUrl, isLegacyPleskMedia } = await import("./media.ts");
const { absoluteUrl } = await import("./site-config.ts");
const { sitemapImageLoc } = await import("./sitemapSources.ts");
const { buildProductJsonLd } = await import("./productSchema.ts");
const { toPlainText } = await import("./richText.ts");
const { renderSitemapOrNull } = await import("./sitemap.ts");
const { renderLocaleSitemapOrNull } = await import("./global/sitemap.ts");

const SITE = "https://www.cicekyolla.com.tr";
const R2 = "https://pub-34f640508a014b148011844b087a4e48.r2.dev";

// Stüdyo haritasından GERÇEK bir kayıt (dosya adı → /studio/…): veri testte sabitlenmez.
const STUDIO_MAP = JSON.parse(readFileSync(path.join(REPO_KOK, "lib", "studio-map.json"), "utf8")) as Record<string, string>;
const [STUDIO_KEY, STUDIO_PATH] = Object.entries(STUDIO_MAP).find(([k]) => /^\d{10}_[0-9a-f]+\.webp$/.test(k)) ?? ["", ""];
const [STUDIO_KEY_2, STUDIO_PATH_2] = Object.entries(STUDIO_MAP).filter(([k]) => /^\d{10}_[0-9a-f]+\.webp$/.test(k))[1] ?? ["", ""];
/** Haritada OLMAYAN eski dosya adı (stüdyo kopyası yok → ölü adres). */
const KOPYASIZ = "0000000000_kopyasi-olmayan-eski-dosya.webp";

test("ön koşul: stüdyo haritasında eski adlandırmalı kayıt var, hedef dosya public/studio altında duruyor", () => {
  assert.ok(STUDIO_KEY && STUDIO_PATH.startsWith("/studio/"), "haritada örnek kayıt");
  assert.ok(STUDIO_KEY_2 && STUDIO_PATH_2 !== STUDIO_PATH);
  assert.ok(existsSync(path.join(REPO_KOK, "public", STUDIO_PATH)), `public${STUDIO_PATH}`);
  assert.equal(KOPYASIZ in STUDIO_MAP, false);
});

// ---------------------------------------------------------------------------
// 1) Saf yardımcı
// ---------------------------------------------------------------------------

test("eski '/storage/products/x.webp' stüdyo haritasındaysa → MUTLAK /studio/… (sayfanın gösterdiği dosya)", () => {
  const beklenen = `${SITE}${STUDIO_PATH}`;
  assert.equal(servedProductImageUrl(`/storage/products/${STUDIO_KEY}`), beklenen);
  assert.equal(servedProductImageUrl(`https://www.cicekyolla.com.tr/storage/products/${STUDIO_KEY}`), beklenen);
  assert.equal(servedProductImageUrl(`https://cicekyolla.com.tr/storage/products/${STUDIO_KEY}`), beklenen);
  assert.equal(servedProductImageUrl(`  /storage/products/${STUDIO_KEY}  `), beklenen, "baş/son boşluk kırpılır");
  assert.ok(!beklenen.includes("/storage/"));
});

test("eski yol haritada YOKSA → null (ölü adres basılmaz)", () => {
  for (const olu of [
    `/storage/products/${KOPYASIZ}`,
    `https://www.cicekyolla.com.tr/storage/products/${KOPYASIZ}`,
    `https://cicekyolla.com.tr/storage/products/${KOPYASIZ}`,
    // Eski alan adı (.com) kanonik hosta çevrilince aynı ölü yoldur.
    `https://www.cicekyolla.com/storage/products/${KOPYASIZ}`,
  ]) {
    assert.equal(servedProductImageUrl(olu), null, olu);
  }
});

test("R2 adresi → bugünkü çıktı BAYT BAYT (JSON-LD'nin ve sitemap'in bugün bastığı değer)", () => {
  const r2 = `${R2}/products/1784458921010-mor-orkide-kakt-s-aranjman.webp`;
  const bugunSitemap = sitemapImageLoc(r2, { mediaUrl, absoluteUrl, isLegacyMedia: isLegacyPleskMedia });
  const bugunJsonLd = absoluteUrl(mediaUrl(r2));
  assert.equal(bugunSitemap, `${SITE}/r2/products/1784458921010-mor-orkide-kakt-s-aranjman.webp`);
  assert.equal(servedProductImageUrl(r2), bugunSitemap);
  assert.equal(servedProductImageUrl(r2), bugunJsonLd);
  // Sorgu dizesi de korunur (mediaUrl ile aynı).
  assert.equal(servedProductImageUrl(`${R2}/products/a.webp?v=3`), `${SITE}/r2/products/a.webp?v=3`);
});

test("göreli '/r2/…' ve site içi yol → MUTLAK; harici http(s) adresi aynen", () => {
  assert.equal(servedProductImageUrl("/r2/products/a.webp"), `${SITE}/r2/products/a.webp`);
  assert.equal(servedProductImageUrl("/uploads/a.jpg"), `${SITE}/uploads/a.jpg`);
  assert.equal(servedProductImageUrl("https://images.unsplash.com/photo-1"), "https://images.unsplash.com/photo-1");
  // Kendi alan adımızdaki mutlak adres kanonik hosta sabitlenir (https://www).
  assert.equal(servedProductImageUrl("https://cicekyolla.com.tr/r2/products/a.webp"), `${SITE}/r2/products/a.webp`);
});

// EK (HOST KURALI): görünür <img> mutlak adresi olduğu gibi gösterir; makineye dönük çıktı başka bir
// hosttaki dosyayı www hostuna "taşıyıp" var olmayan bir adres bildiremez.
test("HOST KURALI: yalnız vitrinin KENDİ hostu kanonik adrese sabitlenir; alt alan adı / benzer adlı / harici host AYNEN", () => {
  // Kendi hostu (www'li, www'siz, http) → kanonik https://www.
  for (const kendi of ["https://www.cicekyolla.com.tr/r2/products/a.webp", "https://cicekyolla.com.tr/r2/products/a.webp", "http://cicekyolla.com.tr/r2/products/a.webp"]) {
    assert.equal(servedProductImageUrl(kendi), `${SITE}/r2/products/a.webp`, kendi);
  }
  // Başka host: görünür <img> ne gösteriyorsa o (bayt bayt).
  for (const baska of [
    "https://cdn.cicekyolla.com.tr/products/1784458921010-x.jpg", // planlanan R2 özel alan adı (lib/media.ts)
    "https://api.cicekyolla.com.tr/uploads/9999.jpg",
    "https://evilcicekyolla.com/x.jpg", // host yalnız "…cicekyolla.com" ile BİTİYOR
    "https://notcicekyolla.com.tr/x.jpg",
    "https://cicekyolla-public-abc123.vercel.app/studio/x.webp",
    "https://images.unsplash.com/photo-1?w=800&q=80",
  ]) {
    assert.equal(servedProductImageUrl(baska), baska, baska);
    assert.equal(servedProductImageUrl(baska), resolveProductImage(baska), "görünür <img> ile aynı adres");
  }
  // Operatörün girdiği og:image de aynı kuraldan geçer (firstServedProductImageUrl).
  assert.equal(firstServedProductImageUrl(["https://cdn.cicekyolla.com.tr/og/kampanya.jpg", "/r2/products/b.webp"]), "https://cdn.cicekyolla.com.tr/og/kampanya.jpg");
});

test("VİDEO: galeri videosu görsel olarak basılmaz (PDP'nin <video> çizdiği uzantılar) — JSON-LD ve og:image adayı dahil", () => {
  for (const video of [
    "/r2/products/1784458921010-tanitim-video.mp4",
    `${R2}/products/tanitim.webm`,
    "/r2/products/tanitim.MOV",
    "/r2/products/tanitim.m4v?v=2",
    "https://cdn.cicekyolla.com.tr/products/tanitim.ogg",
  ]) {
    assert.equal(servedProductImageUrl(video), null, video);
  }
  // Uzantı yalnız SONDA (ya da sorgudan hemen önce) video sayılır: adında "mp4" geçen görsel görseldir.
  assert.equal(servedProductImageUrl("/r2/products/mp4-kapak.webp"), `${SITE}/r2/products/mp4-kapak.webp`);
  assert.equal(servedProductImageUrl("/r2/products/a.mp4.webp"), `${SITE}/r2/products/a.mp4.webp`);
  // og:image adayı: ilk kayıt videoysa sıradaki GÖRSEL seçilir.
  assert.equal(firstServedProductImageUrl([undefined, "/r2/products/tanitim.mp4", "/r2/products/b.webp"]), `${SITE}/r2/products/b.webp`);
  assert.equal(firstServedProductImageUrl(["/r2/products/tanitim.mp4"]), null);
  // Product JSON-LD `image`: kapak + galeri videosu → yalnız görsel yazılır.
  const ld = buildProductJsonLd({
    ...URUN,
    images: [{ url: "/r2/products/kapak.webp", role: "cover" }, { url: "/r2/products/1784458921010-tanitim-video.mp4", role: "gallery" }],
  }, DEPS);
  assert.deepEqual(ld.image, [`${SITE}/r2/products/kapak.webp`]);
  assert.ok(!JSON.stringify(ld).includes(".mp4"));
  // Uzantı listesi PDP'nin video kararıyla AYNI (iki yerde ayrışmasın).
  const pdp = readFileSync(path.join(REPO_KOK, "components", "product", "ProductDetail.tsx"), "utf8");
  const yardimci = readFileSync(path.join(REPO_KOK, "lib", "productImageUrl.ts"), "utf8");
  const desen = "/\\.(mp4|webm|mov|m4v|ogg)(\\?|$)/i";
  assert.ok(pdp.includes(`return ${desen}.test(url);`), "ProductDetail.isVideo");
  assert.ok(yardimci.includes(`const PRODUCT_VIDEO_URL = ${desen};`), "lib/productImageUrl.ts");
});

test("ADRES NORMALİZASYONU: boşluk / ASCII dışı karakter yüzde-kodlanır (eski merchant feed çıktısıyla aynı); temiz adres bayt bayt aynı", () => {
  const ham = "/r2/products/9999 yeni çiçek.jpg";
  const beklenen = `${SITE}/r2/products/9999%20yeni%20%C3%A7i%C3%A7ek.jpg`;
  assert.equal(servedProductImageUrl(ham), beklenen);
  // Eski merchant feed bu değeri `new URL(value, SITE_URL).toString()` ile üretiyordu → aynı sonuç.
  assert.equal(servedProductImageUrl(ham), new URL(ham, SITE).toString());
  // Zaten kodlu adres ikinci kez kodlanmaz.
  assert.equal(servedProductImageUrl("/r2/products/9999%20yeni.jpg"), `${SITE}/r2/products/9999%20yeni.jpg`);
  assert.equal(servedProductImageUrl("https://images.unsplash.com/foto 1.jpg"), "https://images.unsplash.com/foto%201.jpg");
  // Temiz adresler: stüdyo haritasının TÜM hedefleri ve örnek R2 anahtarları değişmeden çıkar.
  for (const hedef of new Set(Object.values(STUDIO_MAP))) {
    assert.equal(new URL(`${SITE}${hedef}`).toString(), `${SITE}${hedef}`, hedef);
  }
  for (const temiz of ["/r2/products/1784458921010-mor-orkide-kakt-s-aranjman.webp", "/r2/products/a_b-c.d(1).webp?v=3&w=2", "/uploads/A/B/c.JPG"]) {
    assert.equal(servedProductImageUrl(temiz), `${SITE}${temiz}`, temiz);
  }
});

// EK (KATEGORİ KAROSU YEDEĞİ): kategori görseli yokken karoya ürün kapağı konur; kapak ölü eski yoldaysa
// (404) karo kırık görsel göstermemeli — ürün kartının gösterdiği stüdyo kopyası kullanılır.
test("productCoverTileUrl: çalışan kapak AYNEN; ölü eski yol → stüdyo kopyası; kopya da yoksa null", () => {
  // Çalışan kapaklar: karodaki adres değişmez (stüdyo kopyası olsa bile — görünüm aynı kalır).
  for (const calisan of ["/r2/products/yeni.webp", `/r2/products/${STUDIO_KEY_2}`, "https://images.unsplash.com/photo-1", "/uploads/a.jpg"]) {
    assert.equal(productCoverTileUrl(calisan), calisan, calisan);
  }
  // Ölü eski yol: stüdyo kopyası varsa o (ürün kartı / PDP ile aynı dosya).
  assert.equal(productCoverTileUrl(`/storage/products/${STUDIO_KEY}`), STUDIO_PATH);
  assert.equal(productCoverTileUrl(`https://www.cicekyolla.com.tr/storage/products/${STUDIO_KEY}`), STUDIO_PATH);
  assert.equal(productCoverTileUrl(`https://cicekyolla.com.tr/storage/products/${STUDIO_KEY}`), STUDIO_PATH);
  // Kopyası da yoksa karoya konmaz (çağıran sıradaki adaya / yer tutucuya düşer).
  assert.equal(productCoverTileUrl(`/storage/products/${KOPYASIZ}`), null);
  assert.equal(productCoverTileUrl(`https://www.cicekyolla.com.tr/storage/products/${KOPYASIZ}`), null);
  for (const bos of [null, undefined, "", "   "]) assert.equal(productCoverTileUrl(bos as string | null | undefined), null, String(bos));
});

test("istenebilir görsel adresi olmayan değer → null (boş, 'null', data:, blob:, protokol-göreli, şemasız, bozuk)", () => {
  for (const kotu of [
    null, undefined, "", "   ", "null", "undefined",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "blob:https://www.cicekyolla.com.tr/1b2c",
    "//evil.example/a.jpg",
    "javascript:alert(1)",
    "products/a.webp",
    "ftp://x/a.jpg",
    "https://",
  ]) {
    assert.equal(servedProductImageUrl(kotu as string | null | undefined), null, String(kotu));
  }
});

test("karar görünür <img> ile AYNI: çıktı = resolveProductImage sonucu + mutlak adres (ölü eski yol hariç)", () => {
  for (const ham of [
    `/storage/products/${STUDIO_KEY}`,
    `${R2}/products/${STUDIO_KEY_2}`,
    `/r2/products/${STUDIO_KEY_2}`,
    `${R2}/products/yeni-urun-kopyasiz.webp`,
    "/r2/products/yeni-urun-kopyasiz.webp",
    "https://images.unsplash.com/photo-1",
  ]) {
    const gorunen = resolveProductImage(ham);
    assert.ok(gorunen, ham);
    assert.equal(servedProductImageUrl(ham), absoluteUrl(gorunen!), ham);
  }
  // Stüdyo kopyası R2'deki görsel için de önceliklidir (kart ve PDP /studio/… dosyasını gösterir).
  assert.equal(servedProductImageUrl(`${R2}/products/${STUDIO_KEY_2}`), `${SITE}${STUDIO_PATH_2}`);
});

test("firstServedProductImageUrl: öncelik sırasıyla sunulabilen İLK aday; hiçbiri yoksa null", () => {
  assert.equal(
    firstServedProductImageUrl([null, `/storage/products/${KOPYASIZ}`, "/r2/products/b.webp", "/r2/products/c.webp"]),
    `${SITE}/r2/products/b.webp`,
  );
  assert.equal(firstServedProductImageUrl([`/storage/products/${STUDIO_KEY}`, "/r2/products/b.webp"]), `${SITE}${STUDIO_PATH}`);
  assert.equal(firstServedProductImageUrl([undefined, "", `/storage/products/${KOPYASIZ}`]), null);
  assert.equal(firstServedProductImageUrl([]), null);
});

// ---------------------------------------------------------------------------
// 2) Product JSON-LD
// ---------------------------------------------------------------------------

const URUN = {
  name: "Mor Orkide & Kaktüs Aranjmanı",
  slug: "mor-orkide-kaktus-aranjmani",
  productId: 1243,
  priceMinor: 299900,
  currency: "TRY",
  stockQuantity: 12,
  ratingCount: 0,
};
const DEPS = { absolute: absoluteUrl, plainText: toPlainText, image: servedProductImageUrl };

test("JSON-LD: eski yoldaki kapak stüdyo adresiyle, kapak İLK sırada; ölü galeri görseli atlanır", () => {
  const ld = buildProductJsonLd({
    ...URUN,
    images: [
      { url: "/r2/products/galeri-1.webp", role: "gallery" },
      { url: `/storage/products/${KOPYASIZ}`, role: "gallery" },
      { url: `/storage/products/${STUDIO_KEY}`, role: "cover" },
      { url: "/r2/products/galeri-2.webp", role: "gallery" },
    ],
  }, DEPS);
  assert.deepEqual(ld.image, [`${SITE}${STUDIO_PATH}`, `${SITE}/r2/products/galeri-1.webp`, `${SITE}/r2/products/galeri-2.webp`]);
  assert.ok(!JSON.stringify(ld).includes("/storage/products/"), "ölü adres şemada yok");
});

test("JSON-LD: kullanılabilir görsel kalmazsa `image` HİÇ yazılmaz (ölü adres basmaktansa)", () => {
  const ld = buildProductJsonLd({ ...URUN, images: [{ url: `/storage/products/${KOPYASIZ}`, role: "cover" }] }, DEPS);
  assert.ok(!("image" in ld));
  assert.equal(ld["@type"], "Product", "şemanın geri kalanı aynen");
});

test("JSON-LD: R2 görsellerinde çıktı bugünküyle aynı; `image` bağımlılığı verilmezse davranış AYNEN (absolute)", () => {
  const images = [
    { url: "/r2/1784458921010-mor-orkide-kakt-s-aranjman.webp", role: "cover" },
    { url: "/r2/ikinci-gorsel.webp", role: "gallery" },
  ];
  const yeni = buildProductJsonLd({ ...URUN, images }, DEPS);
  const eski = buildProductJsonLd({ ...URUN, images }, { absolute: absoluteUrl, plainText: toPlainText });
  assert.deepEqual(yeni, eski);
  // Bağımlılık yokken eski yol olduğu gibi mutlaklaşır (önceki davranış; yardımcı bunu değiştirir).
  const bagimsiz = buildProductJsonLd({ ...URUN, images: [{ url: `/storage/products/${KOPYASIZ}`, role: "cover" }] }, { absolute: absoluteUrl, plainText: toPlainText });
  assert.deepEqual(bagimsiz.image, [`${SITE}/storage/products/${KOPYASIZ}`]);
});

test("JSON-LD: aynı stüdyo dosyasına çözülen iki kayıt bir kez yazılır", () => {
  const ld = buildProductJsonLd({
    ...URUN,
    images: [{ url: `/storage/products/${STUDIO_KEY}`, role: "cover" }, { url: `${R2}/products/${STUDIO_KEY}`, role: "gallery" }],
  }, DEPS);
  assert.deepEqual(ld.image, [`${SITE}${STUDIO_PATH}`]);
});

// ---------------------------------------------------------------------------
// 3) Image sitemap (API stub) — TR yeni yol, TR yedek yol, locale
// ---------------------------------------------------------------------------

type Stub = { status: number; body?: unknown } | undefined;
let routes: Record<string, Stub> = {};
(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
  const url = new URL(String(input));
  const stub = routes[url.pathname];
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

const imageLocs = (xml: string) => [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test("images.xml (yeni yol): eski yoldaki kapak /studio/… ile basılır; kopyasız ölü kapak satırı girmez; R2 aynen", async () => {
  routes = {
    "/api/public/seo/product-urls": {
      status: 200,
      body: {
        data: [
          { url_path: "/urun/eski-kapak-studyolu", updated_at: null, image: `https://www.cicekyolla.com.tr/storage/products/${STUDIO_KEY}`, name: "A" },
          { url_path: "/urun/eski-kapak-kopyasiz", updated_at: null, image: `/storage/products/${KOPYASIZ}`, name: "B" },
          { url_path: "/urun/r2-kapak", updated_at: null, image: `${R2}/products/yeni.webp`, name: "C" },
        ],
        total: 3,
      },
    },
  };
  const xml = await renderSitemapOrNull("images");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [`${SITE}/urun/eski-kapak-studyolu`, `${SITE}/urun/r2-kapak`]);
  assert.deepEqual(imageLocs(xml!), [`${SITE}${STUDIO_PATH}`, `${SITE}/r2/products/yeni.webp`]);
  assert.ok(!xml!.includes("/storage/products/"));
});

test("images.xml (yedek yol — uç 404): aynı kural; ölü kapak artık basılmaz", async () => {
  routes = {
    "/api/public/seo/inventory": {
      status: 200,
      body: {
        data: ["eski-kapak-studyolu", "eski-kapak-kopyasiz", "r2-kapak"].map((slug) => (
          { page_type: "product", url_path: `/urun/${slug}`, index_state: "index", updated_at: "2026-08-01T00:00:00.000Z", title: slug }
        )),
      },
    },
    "/api/products": {
      status: 200,
      body: {
        items: [
          { id: 1, slug: "eski-kapak-studyolu", name: "A", cover_image_url: `https://www.cicekyolla.com.tr/storage/products/${STUDIO_KEY}` },
          { id: 2, slug: "eski-kapak-kopyasiz", name: "B", cover_image_url: `https://www.cicekyolla.com.tr/storage/products/${KOPYASIZ}` },
          { id: 3, slug: "r2-kapak", name: "C", cover_image_url: `${R2}/products/yeni.webp` },
        ],
        pagination: { page: 1, page_size: 100, total: 3, total_pages: 1 },
      },
    },
  };
  const xml = await renderSitemapOrNull("images");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [`${SITE}/urun/eski-kapak-studyolu`, `${SITE}/urun/r2-kapak`]);
  assert.deepEqual(imageLocs(xml!), [`${SITE}${STUDIO_PATH}`, `${SITE}/r2/products/yeni.webp`]);
  assert.ok(!xml!.includes("/storage/products/"));
});

test("locale sitemap: ürün görseli aynı yardımcıdan — stüdyo adresi; kopyasız ölü görselde ürün URL'si görselsiz kalır", async () => {
  routes = {
    "/api/public/translations/surface/inventory": {
      status: 200,
      body: {
        data: {
          products: [
            { slug: "alte-rosen", updated_at: null, image: `/storage/products/${STUDIO_KEY}` },
            { slug: "ohne-kopie", updated_at: null, image: `/storage/products/${KOPYASIZ}` },
            { slug: "r2-bild", updated_at: null, image: `${R2}/products/yeni.webp` },
          ],
          categories: [],
        },
      },
    },
    "/api/public/global/pages-inventory": { status: 200, body: { data: [] } },
  };
  const xml = await renderLocaleSitemapOrNull("de");
  assert.ok(xml);
  assert.deepEqual(locs(xml!), [`${SITE}/de/produkt/alte-rosen`, `${SITE}/de/produkt/ohne-kopie`, `${SITE}/de/produkt/r2-bild`]);
  assert.deepEqual(imageLocs(xml!), [`${SITE}${STUDIO_PATH}`, `${SITE}/r2/products/yeni.webp`]);
});

// ---------------------------------------------------------------------------
// 4) Merchant feed (rota GERÇEKTEN çalıştırılır; API stub)
// ---------------------------------------------------------------------------

test("merchant feed: image_link sayfanın gösterdiği dosya; sunulabilir görseli olmayan ürün feed'e girmez", async () => {
  const urun = (id: number, slug: string, cover: string) => ({
    id, slug, name: slug, price_minor: 100000, sale_price_minor: null, currency: "TRY", status: "active",
    product_type: "flower", stock_quantity: 3, cover_image_url: cover, same_day_available: true, delivery_scope: "istanbul",
  });
  routes = {
    "/api/products": {
      status: 200,
      body: {
        items: [
          urun(1, "eski-kapak-studyolu", `https://www.cicekyolla.com.tr/storage/products/${STUDIO_KEY}`),
          urun(2, "eski-kapak-kopyasiz", `https://www.cicekyolla.com.tr/storage/products/${KOPYASIZ}`),
          urun(3, "r2-kapak", `${R2}/products/yeni.webp`),
        ],
        pagination: { page: 1, page_size: 100, total: 3, total_pages: 1 },
      },
    },
  };
  const { GET } = await import("../app/api/merchant-feed.xml/route.ts");
  const res = await GET(new Request(`${SITE}/api/merchant-feed.xml`));
  assert.equal(res.status, 200);
  const xml = await res.text();
  assert.deepEqual(
    [...xml.matchAll(/<g:image_link>([^<]+)<\/g:image_link>/g)].map((m) => m[1]),
    [`${SITE}${STUDIO_PATH}`, `${SITE}/r2/products/yeni.webp`],
  );
  assert.deepEqual(
    [...xml.matchAll(/<g:link>([^<]+)<\/g:link>/g)].map((m) => m[1]),
    [`${SITE}/urun/eski-kapak-studyolu`, `${SITE}/urun/r2-kapak`],
  );
  assert.ok(!xml.includes("/storage/products/"));
  assert.equal(res.headers.get("x-merchant-products"), "2");
  assert.equal(res.headers.get("x-merchant-skipped"), "1");
});

// ---------------------------------------------------------------------------
// 5) Kaynak nöbeti — makineye dönük her çıktı aynı yardımcıdan geçer
// ---------------------------------------------------------------------------

test("KAYNAK: JSON-LD, og:image, image sitemap ve merchant feed tek yardımcıyı kullanır; görünür render dokunulmadı", () => {
  const oku = (p: string) => readFileSync(path.join(REPO_KOK, p), "utf8");
  const urun = oku("app/urun/[slug]/page.tsx");
  assert.ok(urun.includes("const ogImage = firstServedProductImageUrl([seo?.og_image, data.images.find((i) => i.role === \"cover\")?.url, data.images[0]?.url]);"));
  assert.ok(urun.includes("{ absolute: absoluteUrl, plainText: toPlainText, image: servedProductImageUrl }"));
  const motor = oku("lib/global/page.tsx");
  assert.ok(motor.includes("{ absolute: absoluteUrl, plainText: toPlainText, image: servedProductImageUrl }"));
  assert.ok(motor.includes("const cover = firstServedProductImageUrl(["));
  const sitemap = oku("lib/sitemap.ts");
  assert.equal(sitemap.split("servedProductImageUrl(").length - 1, 2, "yeni yol (productRowNode) + yedek yol (imageNodes)");
  assert.ok(!sitemap.includes("sitemapImageLoc("), "ikinci bir görsel kararı kalmadı");
  const locale = oku("lib/global/sitemap.ts");
  assert.ok(locale.includes("const imageLoc = servedProductImageUrl(image);") && !locale.includes("sitemapImageLoc("));
  const feed = oku("app/api/merchant-feed.xml/route.ts");
  assert.ok(feed.includes("const imageLink = servedProductImageUrl(product.cover_image_url);"));
  assert.ok(feed.includes("<g:image_link>${esc(imageLink)}</g:image_link>"));
  // Yardımcı kararı YENİDEN yazmaz: görünür <img>'in çözücüsünü çağırır.
  const yardimci = oku("lib/productImageUrl.ts");
  assert.ok(yardimci.includes("const served = value ? resolveProductImage(value) : null;"));
  // Görünür bileşen bu yardımcıyı KULLANMAZ (render değişmedi).
  assert.ok(!oku("components/product/ProductImage.tsx").includes("productImageUrl"));
});

test("KAYNAK: kategori karosu yedeği dört yerde de aynı yardımcıdan geçer (ana sayfa, ilgili koleksiyonlar, alt kategoriler, /api/category-image)", () => {
  const oku = (p: string) => readFileSync(path.join(REPO_KOK, p), "utf8");
  const ana = oku("app/page.tsx");
  assert.ok(ana.includes("const image = candidates.map((product) => productCoverTileUrl(product.cover_image_url)).find(Boolean);"));
  const landing = oku("components/category/CategoryLanding.tsx");
  assert.ok(landing.includes("const cover = productCoverTileUrl(firstProduct?.cover_image_url);"), "ilgili koleksiyonlar");
  assert.ok(landing.includes("if (cover) return { ...cat, image: cover };"));
  assert.ok(landing.includes("const productImage = candidates.map((product) => productCoverTileUrl(product.cover_image_url)).find(Boolean);"), "alt kategoriler");
  const rota = oku("app/api/category-image/[slug]/route.ts");
  assert.ok(rota.includes(".map((product) => productCoverTileUrl(product.cover_image_url))"));
  // Ham kapak artık doğrudan karoya konmuyor.
  for (const [ad, kaynak] of [["app/page.tsx", ana], ["CategoryLanding", landing], ["category-image", rota]] as const) {
    assert.ok(!kaynak.includes("?.cover_image_url;"), ad);
  }
  assert.ok(!landing.includes("image: firstProduct.cover_image_url"));
});
