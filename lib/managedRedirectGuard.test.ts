// lib/managedRedirectGuard.test.ts — DÖNGÜ GUARD regresyon testleri (ADDITIVE).
// Çalıştırma: node --test lib/managedRedirectGuard.test.ts  (npm run test:unit)
//
// KAPSAM
//  1) Guard'ın saf yüzü (isManagedTargetPath) ve yol normalizasyonu.
//  2) Kök neden: 81 il x 3 "SEO Dili" düğmesi = 243 URL'in tamamı bugün legacy
//     kurala takılıyor; guard devredeyken takılmıyor.
//  3) REGRESYON: guard KAPALIYKEN (bugünkü hâl) legacy davranışı birebir aynı —
//     hiçbir sonek silinmedi, hiçbir canlı/indexable URL bozulmadı.
//  4) FAIL-SAFE: hedef kümesi boşsa (API erişilemez) guard hiç devreye girmez.
//
// NOT: legacy modülleri "@/lib/..." takma adını kullanıyor; node --test bunu
// tek başına çözemez. Aşağıdaki in-process resolver hook'u YALNIZ bu test
// süreci içinde çalışır — üretim koduna, build'e ve package.json'a dokunmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isManagedTargetPath } from "./managed-redirects.ts";

const REPO_KOK = path.resolve(import.meta.dirname, "..");

// @types/node 20 bu Node 22 API'sini henüz tanımıyor; yalnız test sürecinde
// kullanılıyor, üretim kodunda yeri yok.
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

const { resolveLegacyLocation } = await import("./legacy-location-redirect.ts");
const { resolveMidCicek, resolveSayfaLegacy, resolveKategoriLegacy, locationFallback, guardedCategoryTarget } =
  await import("./legacy-recovery.ts");
const legacyCategorySlugs = (await import("./legacy-category-slugs.json", { with: { type: "json" } })).default;
const publicLocationTargets = (await import("./legacy-location-public-targets.json", { with: { type: "json" } })).default;

const categorySlugs = new Set(legacyCategorySlugs as string[]);
const publicTargets = publicLocationTargets as string[];

/**
 * middleware.ts'teki legacy zincirinin aynası (redirect nesnesi yerine hedef
 * string'i döner). Guard middleware'de her giriş noktasını `legacyMuaf`
 * ternary'siyle kapatır; burada aynısı `muaf` parametresiyle modellenir.
 */
function legacyHedefi(pathname: string, muaf = false): string | null {
  const sayfa = muaf ? null : resolveSayfaLegacy(pathname);
  if (sayfa) return sayfa;
  const kategori = muaf ? null : resolveKategoriLegacy(pathname);
  if (kategori) return kategori;
  const loc = muaf ? ({ matched: false } as const) : resolveLegacyLocation(pathname);
  if (loc.matched && loc.destination) return loc.destination;
  if (loc.matched && !loc.destination && loc.suffix === "cicek") {
    const slug = `${loc.normalizedBase}-cicek`;
    if (categorySlugs.has(slug)) return `/kategori/${slug}`;
  }
  if (loc.matched && !loc.destination) return locationFallback(loc.normalizedBase);
  const mid = muaf ? null : resolveMidCicek(pathname);
  if (mid) return mid;
  if (!muaf && !loc.matched) {
    const m = pathname.match(/^\/([a-z0-9-]+)-\d+\/?$/);
    if (m) return guardedCategoryTarget(m[1]);
  }
  return null;
}

/** publicTargets içindeki kök il yolları: "/adana", "/istanbul" … */
const iller = publicTargets.filter((t) => t.split("/").length === 2).map((t) => t.slice(1));

/** Admin > Lokasyon SEO Merkezi > "SEO Dili" üç düğmesinin ürettiği sonekler. */
const SEO_DILI_EKLERI = ["cicekci", "cicek-siparisi", "cicek-gonder"];

// ---------------------------------------------------------------------------
// 1) Saf guard yüzü
// ---------------------------------------------------------------------------

test("isManagedTargetPath: yol normalizasyonu (sondaki /, query, hash, baştaki /)", () => {
  const hedefler = new Set(["/adana-cicekci", "/kategori/orkideler"]);
  for (const yol of [
    "/adana-cicekci",
    "/adana-cicekci/",
    "/adana-cicekci?utm_source=google",
    "/adana-cicekci#bolum",
    "adana-cicekci",
  ]) {
    assert.equal(isManagedTargetPath(yol, hedefler), true, yol);
  }
  assert.equal(isManagedTargetPath("/kategori/orkideler", hedefler), true);
  assert.equal(isManagedTargetPath("/adana", hedefler), false);
  assert.equal(isManagedTargetPath("/adiyaman-cicekci", hedefler), false);
});

test("FAIL-SAFE: hedef kümesi boşsa (API erişilemez) guard hiçbir yolda açılmaz", () => {
  const bos = new Set<string>();
  for (const yol of ["/adana", "/adana-cicekci", "/istanbul", "/kategori/orkideler", "/"]) {
    assert.equal(isManagedTargetPath(yol, bos), false, yol);
  }
});

// ---------------------------------------------------------------------------
// 2) Kök neden — 81 il x 3 düğme
// ---------------------------------------------------------------------------

test("kök neden: 81 ilin ÜÇ SEO Dili varyantının TAMAMI bugün legacy'ye takılıyor", () => {
  assert.ok(iller.length >= 81, `il sayısı beklenenden az: ${iller.length}`);
  const carpisan: string[] = [];
  for (const il of iller) {
    for (const ek of SEO_DILI_EKLERI) {
      if (legacyHedefi(`/${il}-${ek}`) !== null) carpisan.push(`/${il}-${ek}`);
    }
  }
  assert.equal(carpisan.length, iller.length * SEO_DILI_EKLERI.length);
});

test("guard: yönetilen 301'in HEDEFİ olan yol legacy'ye takılmaz (döngü kırılır)", () => {
  for (const il of iller) {
    for (const ek of SEO_DILI_EKLERI) {
      const yol = `/${il}-${ek}`;
      const hedefler = new Set([yol]); // "/il → /il-{ek}" kaydının hedefi
      assert.equal(isManagedTargetPath(yol, hedefler), true, yol);
      assert.equal(legacyHedefi(yol, true), null, yol);
    }
  }
});

test("Adana senaryosu: guard yalnız hedefi muaf tutar, diğer iller aynen 301", () => {
  const hedefler = new Set(["/adana-cicekci"]);
  assert.equal(isManagedTargetPath("/adana-cicekci", hedefler), true);
  assert.equal(legacyHedefi("/adana-cicekci", true), null);
  // Komşu iller etkilenmez: guard kapalı, legacy 301 aynen çalışır
  assert.equal(isManagedTargetPath("/adiyaman-cicekci", hedefler), false);
  assert.equal(legacyHedefi("/adiyaman-cicekci"), "/adiyaman");
  assert.equal(legacyHedefi("/istanbul-cicekci"), "/istanbul");
});

// ---------------------------------------------------------------------------
// 3) REGRESYON — guard KAPALIYKEN bugünkü davranış korunuyor
// ---------------------------------------------------------------------------

test("REGRESYON: rezerve sonekler silinmedi — legacy 301'ler aynen çalışıyor", () => {
  const beklenen: Array<[string, string]> = [
    ["/istanbul-cicekci", "/istanbul"],
    ["/adana-cicekci", "/adana"],
    ["/ankara-cicek-siparisi", "/ankara"],
    ["/izmir-cicek-yolla", "/izmir"],
    ["/bursa-cicek-gonderme", "/bursa"],
    ["/adana-cicek-gonder", "/adana"],
    ["/istanbul-kadikoy-cicekci", "/istanbul/kadikoy"],
  ];
  for (const [yol, hedef] of beklenen) assert.equal(legacyHedefi(yol), hedef, yol);
});

test("REGRESYON: canlı indexable URL'ler legacy'ye HİÇ girmiyor (guard'dan bağımsız)", () => {
  for (const il of iller) assert.equal(legacyHedefi(`/${il}`), null, `/${il}`);
  for (const yol of [
    "/adana/ceyhan",
    "/adana/ceyhan/yesildam-mah",
    "/istanbul/kadikoy",
    "/kategori/guller",
    "/kategori/orkideler",
    "/kategori/sevgiliye-cicek",
    "/urun/101-kirmizi-gul-buketi",
    "/hakkimizda",
    "/iletisim",
    "/teslimat-bolgeleri",
    "/blog",
    "/blog/gul-renklerinin-anlamlari",
    "/",
  ]) {
    assert.equal(legacyHedefi(yol), null, yol);
  }
});

test("REGRESYON: bugün yayındaki yönetilen 301'lerin hedefi legacy'ye takılmıyor → guard NO-OP", () => {
  for (const hedef of [
    "/ankara",
    "/",
    "/kategori/az-isik-isteyen-saksi-bitkileri",
    "/kategori/romantik-buketler",
    "/kategori/araba-susleme",
    "/kategori/indirimli-urunler",
    "/kategori/kafe-dekorasyonu",
    "/kategori/mevsim-cicekleri",
    "/kategori/sevgiliye-cicek",
    "/kategori/yapay-cicekler",
    "/kategori/yapay-zeytin-agaci",
    "/kategori/nikah-masasi-cicekleri",
    "/kategori/orkideler",
  ]) {
    assert.equal(legacyHedefi(hedef), null, hedef);
  }
  for (const kaynak of [
    "/ankara-cankaya-ccekci",
    "/cicek-gonder",
    "/cicek-siparisi",
    "/cicek-yolla",
    "/masa-cicekleri",
    "/orkide-siparisi",
    "/kategori/taze-cicek",
    "/kategori/butik-cicek",
    "/kategori/yapay-cicek",
  ]) {
    assert.equal(legacyHedefi(kaynak), null, kaynak);
  }
});

test("REGRESYON: guard yalnız TAM eşleşen hedefi muaf tutar, alt yolları değil", () => {
  const hedefler = new Set(["/adana-cicekci"]);
  assert.equal(isManagedTargetPath("/adana-cicekci-2", hedefler), false);
  assert.equal(isManagedTargetPath("/adana-cicekci/ceyhan", hedefler), false);
  assert.equal(legacyHedefi("/adana-cicekci-2"), "/adana");
});
