// lib/localeManagedRedirect.test.ts — Global locale yollarında yönetilen 301 testleri.
// Çalıştırma: node --test lib/localeManagedRedirect.test.ts   (npm run test:unit)
//
// KAPSAM
//  1) Saf karar (managedLocaleTarget): kayıt yok / kendine yönlendirme / site dışı
//     hedef / çevrim → yönlendirme YOK.
//  2) middleware.ts GERÇEKTEN çalıştırılır (API stub'lanır; ağ YOK):
//       • kaydı olan locale yolu → kalıcı yönlendirme, sorgu dizesi korunur
//       • kaydı olmayan locale yolu → bugünkü gibi doğrudan devam (legacy'ye girmez)
//       • FAIL-OPEN: API erişilemez → yönlendirme yok, sayfa çizilir (soğuk açılış)
//  3) Kaynak nöbeti: locale dalı legacy kurallardan ÖNCE döner.
//
// NOT: middleware "@/lib/..." takma adını ve uzantısız import'ları kullanıyor;
// aşağıdaki hook YALNIZ bu test sürecinde çalışır — üretim koduna dokunmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

import { managedLocaleTarget } from "./managed-redirects.ts";
import { GLOBAL_LOCALES, SEGMENTS } from "./global/config.ts";

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

// ---------------------------------------------------------------------------
// 1) Saf karar
// ---------------------------------------------------------------------------

test("managedLocaleTarget: kayıt varsa ve hedef farklıysa uygulanır (kod kayıttan)", () => {
  assert.deepEqual(
    managedLocaleTarget("/de/produkt/alte-rosen", { to: "/de/produkt/rote-rosen", code: 301 }),
    { to: "/de/produkt/rote-rosen", code: 301 },
  );
  assert.deepEqual(
    managedLocaleTarget("/en/category/old", { to: "/en/category/new", code: 308 }),
    { to: "/en/category/new", code: 308 },
  );
});

test("managedLocaleTarget: kayıt yoksa null (istek bugünkü gibi devam eder)", () => {
  assert.equal(managedLocaleTarget("/de/produkt/rote-rosen", null), null);
});

test("managedLocaleTarget: hedef istek yoluyla aynıysa yönlendirme yok (sondaki /, sorgu yok sayılır)", () => {
  assert.equal(managedLocaleTarget("/de/produkt/x", { to: "/de/produkt/x", code: 301 }), null);
  assert.equal(managedLocaleTarget("/de/produkt/x/", { to: "/de/produkt/x", code: 301 }), null);
  assert.equal(managedLocaleTarget("/de/produkt/x", { to: "/de/produkt/x/?a=1", code: 301 }), null);
});

test("managedLocaleTarget: site dışına çıkan hedef uygulanmaz (açık yönlendirme yok)", () => {
  for (const to of ["//evil.example/x", "/\\evil.example", "//evil.example"]) {
    assert.equal(managedLocaleTarget("/de/produkt/x", { to, code: 301 }), null, to);
  }
});

test("managedLocaleTarget: çevrim (A→B, B→A) yönlendirilmez; zincirin devamı (B→C) engel değildir", () => {
  const hit = { to: "/de/produkt/b", code: 301 };
  assert.equal(managedLocaleTarget("/de/produkt/a", hit, { to: "/de/produkt/a", code: 301 }), null);
  assert.deepEqual(managedLocaleTarget("/de/produkt/a", hit, { to: "/de/produkt/c", code: 301 }), hit);
  assert.deepEqual(managedLocaleTarget("/de/produkt/a", hit, null), hit);
});

// ---------------------------------------------------------------------------
// 2) middleware.ts — gerçek çalıştırma (API stub)
// ---------------------------------------------------------------------------

// Önbellek (5 dk TTL) senaryolar arasında "eskitilir": saat ileri alınır.
const gercekNow = Date.now.bind(Date);
let saatKaymasi = 0;
Date.now = () => gercekNow() + saatKaymasi;
const onbellekEskit = () => { saatKaymasi += 10 * 60_000; };

type RedirectStub = { status: number; redirects?: Array<{ from: string; to: string; code?: number }> } | "throw";
let redirectStub: RedirectStub = { status: 200, redirects: [] };
let redirectIstekSayisi = 0;

(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
  const url = new URL(String(input));
  if (url.pathname === "/api/public/redirects") {
    redirectIstekSayisi++;
    if (redirectStub === "throw") throw new Error("other side closed");
    const stub = redirectStub;
    return { ok: stub.status === 200, status: stub.status, json: async () => ({ redirects: stub.redirects ?? [] }) };
  }
  // Diğer uçlar (legacy mahalle sözlüğü vb.): yok say → mevcut fail-safe yolları.
  return { ok: false, status: 404, json: async () => ({}) };
};

const { NextRequest } = await import("next/server");
const { middleware } = await import("../middleware.ts");

const SITE = "https://www.cicekyolla.com.tr";
const istek = (yol: string) => new NextRequest(`${SITE}${yol}`);
/** NextResponse.next() → "x-middleware-next: 1"; yönlendirme → 3xx + location. */
const devamMi = (res: Response) => res.headers.get("x-middleware-next") === "1";

const KAYITLAR = [
  { from: "/de/produkt/alte-rosen", to: "/de/produkt/rote-rosen", code: 301 },
  { from: "/en/category/old-roses", to: "/en/category/roses", code: 301 },
  { from: "/fr/produit/gecici", to: "/fr/produit/kalici", code: 302 },
  { from: "/it/prodotto/a", to: "/it/prodotto/b", code: 301 },
  { from: "/it/prodotto/b", to: "/it/prodotto/a", code: 301 },
  { from: "/es/producto/dis", to: "//evil.example/x", code: 301 },
  { from: "/cicek-gonder", to: "/", code: 301 },
];

test("FAIL-OPEN (soğuk açılış): API erişilemez / 5xx / 404 → harita boş, locale yolu yönlendirilmez, doğrudan devam eder", async () => {
  // Bu test İLK çalışır: süreçte henüz başarılı bir harita yok (eldeki eski harita kullanılamaz).
  for (const bozuk of ["throw" as const, { status: 502 }, { status: 404 }]) {
    onbellekEskit();
    redirectStub = bozuk;
    const once = redirectIstekSayisi;
    const res = await middleware(istek("/de/produkt/alte-rosen"));
    assert.equal(devamMi(res), true, JSON.stringify(bozuk));
    assert.equal(res.headers.get("location"), null, JSON.stringify(bozuk));
    assert.ok(redirectIstekSayisi > once, "harita yeniden istenir (kısa hata TTL'i)");
  }
});

test("middleware: kaydı olan locale yolu kalıcı yönlendirilir (301), hedef aynı origin", async () => {
  onbellekEskit();
  redirectStub = { status: 200, redirects: KAYITLAR };
  const res = await middleware(istek("/de/produkt/alte-rosen"));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `${SITE}/de/produkt/rote-rosen`);
  const kategori = await middleware(istek("/en/category/old-roses"));
  assert.equal(kategori.status, 301);
  assert.equal(kategori.headers.get("location"), `${SITE}/en/category/roses`);
});

test("middleware: sorgu dizesi korunur; kod kayıttan gelir (varsayılan 301)", async () => {
  const res = await middleware(istek("/de/produkt/alte-rosen?gclid=abc&utm_source=google"));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `${SITE}/de/produkt/rote-rosen?gclid=abc&utm_source=google`);
  const gecici = await middleware(istek("/fr/produit/gecici"));
  assert.equal(gecici.status, 302, "kayıt 302 ise 302 (operatör kararı)");
  assert.equal(gecici.headers.get("location"), `${SITE}/fr/produit/kalici`);
});

test("middleware: kaydı OLMAYAN locale yolu bugünkü gibi doğrudan devam eder (13 dil, kök + ürün + kategori)", async () => {
  for (const l of GLOBAL_LOCALES) {
    for (const yol of [`/${l}`, `/${l}/${SEGMENTS[l].product}/herhangi-bir-urun`, `/${l}/${SEGMENTS[l].category}/herhangi`, `/${l}/istanbul/kadikoy`]) {
      const res = await middleware(istek(yol));
      assert.equal(devamMi(res), true, yol);
      assert.equal(res.headers.get("location"), null, yol);
    }
  }
  // Yönlendirmenin HEDEFİ de devam eder (zincir/döngü yok).
  assert.equal(devamMi(await middleware(istek("/de/produkt/rote-rosen"))), true);
});

test("middleware: çevrim (A↔B) ve site dışı hedef yönlendirilmez — sayfa çizilir", async () => {
  for (const yol of ["/it/prodotto/a", "/it/prodotto/b", "/es/producto/dis"]) {
    const res = await middleware(istek(yol));
    assert.equal(devamMi(res), true, yol);
  }
});

test("middleware: harita süreç içinde önbelleklidir — locale istekleri API'ye tekrar gitmez (ucuz)", async () => {
  const once = redirectIstekSayisi;
  for (let i = 0; i < 25; i++) await middleware(istek(`/de/produkt/urun-${i}`));
  await middleware(istek("/de/produkt/alte-rosen"));
  assert.equal(redirectIstekSayisi, once, "5 dk TTL içinde ek ağ isteği yok");
});

test("REGRESYON: TR yolunda yönetilen 301 aynen çalışır (locale dalı TR'yi etkilemez)", async () => {
  onbellekEskit();
  redirectStub = { status: 200, redirects: KAYITLAR };
  const res = await middleware(istek("/cicek-gonder"));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `${SITE}/`);
});

// ---------------------------------------------------------------------------
// 3) Kaynak nöbeti
// ---------------------------------------------------------------------------

test("kaynak nöbeti: locale dalı legacy kurallardan ÖNCE döner ve yalnız tam yol kaydına bakar", () => {
  const src = readFileSync(path.join(REPO_KOK, "middleware.ts"), "utf8");
  const dalBasi = src.indexOf("if (isGlobalLocalePath(req.nextUrl.pathname)) {");
  // Dal, bir sonraki bloğun açıklamasında (DÖNGÜ GUARD) biter.
  const dalSonu = src.indexOf("/* EK (DÖNGÜ GUARD)");
  assert.ok(dalBasi > 0 && dalSonu > dalBasi, "locale dalı döngü guard'ından (legacyMuaf) önce");
  assert.ok(dalSonu < src.indexOf("const legacyMuaf"));
  const dal = src.slice(dalBasi, dalSonu);
  assert.match(dal, /await resolveManagedRedirect\(req\.nextUrl\.pathname\)/);
  assert.match(dal, /managedLocaleTarget\(/);
  assert.match(dal, /return NextResponse\.next\(\);\s*\}\s*$/, "kayıt yoksa hemen devam; dal burada kapanır");
  for (const legacy of ["resolveLegacyLocation", "resolveKategoriLegacy", "resolveSayfaLegacy", "resolveCicekleriLegacy", "resolveLegacyNeighborhoodRedirect", "isManagedRedirectTarget"]) {
    assert.ok(!dal.includes(legacy), `locale dalı ${legacy} çağırmaz`);
  }
});
