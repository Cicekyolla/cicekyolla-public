// lib/redirectPrecedence.test.ts — REDIRECT ÖNCELİĞİ / KATEGORİ ÇAKIŞMASI testleri.
// Çalıştırma: node --test lib/redirectPrecedence.test.ts  (npm run test:unit)
//
// KAPSAM
//  FIX 1 — resolveKategoriLegacy artık yayındaki gerçek kategoriye DOKUNMUYOR.
//          Denetimde kanıtlanan tek gerçek vaka: /kategori/istanbul-teslimat
//          (sitemap'te ilan edilmiş) production'da 301 /istanbul veriyordu.
//  FIX 2 — "-cicekleri" kuralı next.config.js'ten taşındı; hedef hesabı birebir
//          aynı. Kuralın kendisi burada, yönetilen 301'e yol vermesi
//          middleware'de (bkz. yorum satırları).
//  REGRESYON — legacy konum-kategori 301'leri (73 bin URL'lik sistem) aynen sürer.
//
// NOT: legacy modülleri "@/lib/..." takma adını kullanıyor; node --test bunu tek
// başına çözemez. Aşağıdaki hook YALNIZ bu test sürecinde çalışır — üretim
// koduna, build'e ve package.json'a dokunmaz.
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
    if (spec.startsWith("@/")) {
      return { url: pathToFileURL(path.join(REPO_KOK, spec.slice(2))).href, shortCircuit: true };
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

const { resolveKategoriLegacy, resolveCicekleriLegacy } = await import("./legacy-recovery.ts");
const legacyCategorySlugs = (await import("./legacy-category-slugs.json", { with: { type: "json" } })).default;
const publicLocationTargets = (await import("./legacy-location-public-targets.json", { with: { type: "json" } })).default;

const kategoriEnvanteri = legacyCategorySlugs as string[];
const iller = (publicLocationTargets as string[])
  .filter((t) => t.split("/").length === 2)
  .map((t) => t.slice(1));

// ---------------------------------------------------------------------------
// FIX 1 — gerçek kategori koruması
// ---------------------------------------------------------------------------

test("FIX 1: kanıtlanan vaka — /kategori/istanbul-teslimat artık YUTULMUYOR", () => {
  // Düzeltme öncesi production: 301 -> /istanbul (sitemap'te ilan edilmiş URL).
  assert.ok(kategoriEnvanteri.includes("istanbul-teslimat"), "vaka slug'ı envanterde olmalı");
  assert.equal(resolveKategoriLegacy("/kategori/istanbul-teslimat"), null);
});

test("FIX 1: envanterdeki 264 kategori slug'ının HİÇBİRİ yutulmuyor", () => {
  const yutulan = kategoriEnvanteri.filter((s) => resolveKategoriLegacy(`/kategori/${s}`) !== null);
  assert.deepEqual(yutulan, []);
});

test("FIX 1: 81 ilin tamamı için '/kategori/{il}-teslimat' — envanterdeyse korunur", () => {
  assert.ok(iller.length >= 81, `il sayısı beklenenden az: ${iller.length}`);
  for (const il of iller) {
    const slug = `${il}-teslimat`;
    const sonuc = resolveKategoriLegacy(`/kategori/${slug}`);
    if (kategoriEnvanteri.includes(slug)) {
      assert.equal(sonuc, null, `envanterdeki ${slug} korunmalı`);
    } else {
      // Envanterde olmayan slug için davranış BUGÜNKÜYLE AYNI kalır (301).
      assert.equal(sonuc, `/${il}`, `envanterde olmayan ${slug} bugünkü gibi 301 vermeli`);
    }
  }
});

test("REGRESYON: legacy konum-kategori 301'leri aynen çalışıyor", () => {
  const beklenen: Array<[string, string]> = [
    ["/kategori/van-baskale-cicek-yolla", "/van/baskale"],
    ["/kategori/istanbul-kadikoy-cicekci", "/istanbul/kadikoy"],
    ["/kategori/adana-ceyhan-cicek-siparisi", "/adana/ceyhan"],
  ];
  for (const [yol, hedef] of beklenen) assert.equal(resolveKategoriLegacy(yol), hedef, yol);
});

test("REGRESYON: konuma çözülmeyen gerçek kategoriler zaten dokunulmuyordu, öyle kalıyor", () => {
  for (const yol of ["/kategori/guller", "/kategori/orkideler", "/kategori/sevgiliye-cicek", "/kategori/yapay-cicekler"]) {
    assert.equal(resolveKategoriLegacy(yol), null, yol);
  }
});

test("REGRESYON: guard suffix SOYULMADAN ham slug'a bakar — legacy adresler envanterde yok", () => {
  // "van-baskale-cicek-yolla" envanterde OLMADIĞI için 301 sürüyor; eğer guard
  // suffix soyulmuş "van-baskale" ile bakssaydı da envanterde olmadığı için aynı
  // sonucu verirdi — ama ham slug kontrolü niyeti açık tutar.
  assert.equal(kategoriEnvanteri.includes("van-baskale-cicek-yolla"), false);
  assert.equal(resolveKategoriLegacy("/kategori/van-baskale-cicek-yolla"), "/van/baskale");
});

// ---------------------------------------------------------------------------
// FIX 2 — "-cicekleri" kuralı (next.config.js'ten taşındı, hedef hesabı aynı)
// ---------------------------------------------------------------------------

test("FIX 2: hedef hesabı config kuralıyla birebir (id'li ve id'siz form)", () => {
  const beklenen: Array<[string, string | null]> = [
    ["/anneler-gunu-cicekleri", "/kategori/anneler-gunu"],
    ["/anneler-gunu-cicekleri-45", "/kategori/anneler-gunu"],
    ["/sevgililer-gunu-cicekleri", "/kategori/sevgililer-gunu"],
    ["/guller-cicekleri", "/kategori/guller"],
    ["/masa-cicekleri", "/kategori/masa"],
  ];
  for (const [yol, hedef] of beklenen) assert.equal(resolveCicekleriLegacy(yol), hedef, yol);
});

test("FIX 2: greedy bölme config ile aynı — '/kandil-cicekleri-cicekleri'", () => {
  // Production'da doğrulanmıştı: 308 -> /kategori/kandil-cicekleri
  assert.equal(resolveCicekleriLegacy("/kandil-cicekleri-cicekleri"), "/kategori/kandil-cicekleri");
});

test("FIX 2: config davranışı korunur — büyük harf eşleşmez, çok segment eşleşmez", () => {
  for (const yol of [
    "/MASA-CICEKLERI",
    "/Masa-cicekleri",
    "/kategori/mevsim-cicekleri",
    "/blog/gul-cicekleri-hakkinda",
    "/masa-cicekler",
    "/cicekleri",
    "/",
  ]) {
    assert.equal(resolveCicekleriLegacy(yol), null, yol);
  }
});

test("FIX 2: sondaki tek '/' kabul edilir, rakamlı taban reddedilir", () => {
  assert.equal(resolveCicekleriLegacy("/anneler-gunu-cicekleri/"), "/kategori/anneler-gunu");
  // config'teki [a-z-]+ rakam kabul etmiyordu; taban rakam içeriyorsa eşleşme yok.
  assert.equal(resolveCicekleriLegacy("/101-cicekleri"), null);
});

test("FIX 2: bilinen 264 legacy slug'ın tamamı için kural hâlâ doğru hedefi üretiyor", () => {
  const hatali = kategoriEnvanteri.filter(
    (s) => /^[a-z-]+$/.test(s) && resolveCicekleriLegacy(`/${s}-cicekleri`) !== `/kategori/${s}`
  );
  assert.deepEqual(hatali, []);
});

// ---------------------------------------------------------------------------
// MATCHER KAPSAMI — 256'lık production taramasında yakalanan regresyonun guard'ı
//
// Kural next.config.js'ten middleware'e taşınınca, genel matcher dışlama listesi
// önekleri SINIR OLMADAN eşlediği için "/sepette-aranjmanlar-cicekleri" adresi
// "sepet" token'ına takılıp middleware'e hiç ulaşmıyordu:
//   MAIN 308 -> /kategori/sepette-aranjmanlar -> 200   ama   PREVIEW 404
// Matcher'a dar kapsamlı iki girdi eklendi. Bu testler hem sınıfın kapsandığını
// hem de gerçek ticari rotaların kapsam DIŞINDA kaldığını sabitler.
// ---------------------------------------------------------------------------

// Matcher GERÇEK middleware.ts dosyasından okunur. Modülü import etmek yerine
// kaynaktan okumak, testi next/server ve @/ alias zincirine bağımlı kılmaz;
// yine de doğrulanan şey production'da çalışan yapılandırmanın ta kendisidir.
const middlewareSrc = readFileSync(path.join(REPO_KOK, "middleware.ts"), "utf8");
const matcherBlok = middlewareSrc.match(/matcher:\s*\[([\s\S]*?)\n\s*\],/)?.[1];
assert.ok(matcherBlok, "middleware.ts içinde matcher dizisi bulunamadı");
const matcher: string[] = [
  ...matcherBlok!
    // Yorumlar içinde tırnaklı metin var; önce onları çıkar.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .matchAll(/"((?:[^"\\]|\\.)*)"/g),
].map((m) => JSON.parse(`"${m[1]}"`) as string);

/** Matcher girdisindeki ":ad(desen)" parçalarını yakalama grubuna çevirir. */
function matcherRegex(entry: string): RegExp {
  return new RegExp(`^${entry.replace(/:[A-Za-z]+\(([^)]*)\)/g, "($1)")}$`);
}
/** Yol, matcher'daki DAR "-cicekleri" girdilerinden biriyle eşleşiyor mu? */
function darGirdilerEsliyorMu(pathname: string): boolean {
  return matcher
    .filter((e) => e.includes("-cicekleri"))
    .some((e) => matcherRegex(e).test(pathname));
}

test("MATCHER: '-cicekleri' sınıfı için dar girdiler tanımlı", () => {
  const dar = matcher.filter((e) => e.includes("-cicekleri"));
  assert.equal(dar.length, 2, `beklenen 2 dar girdi, bulunan: ${JSON.stringify(dar)}`);
});

test("MATCHER REGRESYON: /sepette-aranjmanlar-cicekleri middleware'e ULAŞIYOR ve doğru hedefi alıyor", () => {
  const yol = "/sepette-aranjmanlar-cicekleri";
  // 1) Genel girdi bu yolu "sepet" öneki yüzünden dışlıyor (regresyonun kaynağı).
  const genel = matcher.find((e) => e.includes("(?!api"))!;
  assert.equal(matcherRegex(genel).test(yol), false, "genel girdi bu yolu hâlâ dışlıyor olmalı");
  // 2) Dar girdi yakalıyor -> middleware çalışıyor.
  assert.equal(darGirdilerEsliyorMu(yol), true);
  // 3) Middleware içinde doğru hedefe çözülüyor.
  assert.equal(resolveCicekleriLegacy(yol), "/kategori/sepette-aranjmanlar");
  assert.ok(kategoriEnvanteri.includes("sepette-aranjmanlar"), "hedef envanterde gerçek bir kategori olmalı");
});

test("MATCHER: gerçek ticari rotalar dar girdilere ALINMIYOR", () => {
  for (const yol of [
    "/sepet",
    "/sepet/hediye-notu",
    "/checkout",
    "/giris",
    "/hesabim",
    "/hesabim/siparislerim",
    "/siparis-takibi",
    "/siparis-takip",
    "/api/orders",
    "/robots.txt",
    "/sitemap.xml",
    "/sitemaps/categories.xml",
  ]) {
    assert.equal(darGirdilerEsliyorMu(yol), false, yol);
  }
});

test("MATCHER: dar girdiler yalnız TEK SEGMENTLİ '-cicekleri' yollarını kapsıyor", () => {
  for (const [yol, beklenen] of [
    ["/anneler-gunu-cicekleri", true],
    ["/anneler-gunu-cicekleri-45", true],
    ["/sepette-aranjmanlar-cicekleri", true],
    ["/kategori/mevsim-cicekleri", false], // çok segment
    ["/MASA-CICEKLERI", false], // büyük harf
    ["/101-cicekleri", false], // rakamlı taban
    ["/masa-cicekler", false],
  ] as Array<[string, boolean]>) {
    assert.equal(darGirdilerEsliyorMu(yol), beklenen, yol);
  }
});
