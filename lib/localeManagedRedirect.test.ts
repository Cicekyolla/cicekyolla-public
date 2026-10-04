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

import { MANAGED_LOCALE_MAX_HOPS, managedLocaleFinalTarget, managedLocaleTarget, managedRedirectSearch } from "./managed-redirects.ts";
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

// EK — zincir / çevrim: harita ziyaret kümesiyle izlenir (managedLocaleFinalTarget).
const harita = (kayitlar: Record<string, { to: string; code?: number }>) =>
  (path: string) => (kayitlar[path] ? { to: kayitlar[path].to, code: kayitlar[path].code ?? 301 } : undefined);

test("managedLocaleFinalTarget: tek kayıt aynen; zincir (A→B→C) TEK adımda nihai hedefe düzleşir", () => {
  assert.deepEqual(managedLocaleFinalTarget("/de/produkt/a", harita({ "/de/produkt/a": { to: "/de/produkt/b" } })), { to: "/de/produkt/b", code: 301 });
  const zincir = harita({ "/de/produkt/a": { to: "/de/produkt/b" }, "/de/produkt/b": { to: "/de/produkt/c" }, "/de/produkt/c": { to: "/de/produkt/d", code: 308 } });
  assert.deepEqual(managedLocaleFinalTarget("/de/produkt/a", zincir), { to: "/de/produkt/d", code: 301 }, "kod ilk kayıttan");
  assert.deepEqual(managedLocaleFinalTarget("/de/produkt/b/", zincir), { to: "/de/produkt/d", code: 301 }, "sondaki / yok sayılır");
  assert.equal(managedLocaleFinalTarget("/de/produkt/d", zincir), null, "nihai hedef yönlendirilmez");
  assert.equal(managedLocaleFinalTarget("/de/produkt/yok", zincir), null);
});

test("managedLocaleFinalTarget: HER uzunlukta çevrim yönlendirilmez (A→B→C→A sonsuz döngü üretmez)", () => {
  const uclu = harita({ "/de/a": { to: "/de/b" }, "/de/b": { to: "/de/c" }, "/de/c": { to: "/de/a" } });
  for (const yol of ["/de/a", "/de/b", "/de/c"]) assert.equal(managedLocaleFinalTarget(yol, uclu), null, yol);
  // Önceki kural yalnız iki adımlı çevrimi görüyordu: aynı kayıtlarda her adım yönlendiriyordu.
  assert.deepEqual(managedLocaleTarget("/de/a", { to: "/de/b", code: 301 }, { to: "/de/c", code: 301 }), { to: "/de/b", code: 301 });
  const ikili = harita({ "/de/a": { to: "/de/b" }, "/de/b": { to: "/de/a" } });
  assert.equal(managedLocaleFinalTarget("/de/a", ikili), null);
  assert.equal(managedLocaleFinalTarget("/de/a", harita({ "/de/a": { to: "/de/a" } })), null, "kendine yönlendirme");
  // Çevrime GİREN zincir (x → a → b → a) de yönlendirilmez.
  assert.equal(managedLocaleFinalTarget("/de/x", harita({ "/de/x": { to: "/de/a" }, "/de/a": { to: "/de/b" }, "/de/b": { to: "/de/a" } })), null);
});

test("managedLocaleFinalTarget: site dışı ilk hedef → null; ilerideki güvensiz adım izlenmez (son güvenli hedef); çok uzun zincir → null", () => {
  assert.equal(managedLocaleFinalTarget("/es/producto/x", harita({ "/es/producto/x": { to: "//evil.example/x" } })), null);
  assert.deepEqual(
    managedLocaleFinalTarget("/es/a", harita({ "/es/a": { to: "/es/b" }, "/es/b": { to: "//evil.example/x" } })),
    { to: "/es/b", code: 301 },
  );
  const uzun: Record<string, { to: string }> = {};
  for (let i = 0; i < MANAGED_LOCALE_MAX_HOPS + 2; i++) uzun[`/de/z${i}`] = { to: `/de/z${i + 1}` };
  assert.equal(managedLocaleFinalTarget("/de/z0", harita(uzun)), null, "sınırdan uzun zincir: tahmin yok → yönlendirme yok");
  assert.deepEqual(managedLocaleFinalTarget("/de/z2", harita(uzun)), { to: `/de/z${MANAGED_LOCALE_MAX_HOPS + 2}`, code: 301 }, "sınır içindeki zincir düzleşir");
});

test("managedLocaleFinalTarget: zincirde geçici (302/307) adım varsa sonuç da geçicidir", () => {
  assert.deepEqual(
    managedLocaleFinalTarget("/fr/a", harita({ "/fr/a": { to: "/fr/b", code: 301 }, "/fr/b": { to: "/fr/c", code: 302 } })),
    { to: "/fr/c", code: 302 },
  );
  assert.deepEqual(managedLocaleFinalTarget("/fr/a", harita({ "/fr/a": { to: "/fr/b", code: 307 } })), { to: "/fr/b", code: 307 });
  assert.deepEqual(
    managedLocaleFinalTarget("/fr/a", harita({ "/fr/a": { to: "/fr/b", code: 308 }, "/fr/b": { to: "/fr/c", code: 301 } })),
    { to: "/fr/c", code: 308 },
  );
});

// EK (TR YÖNETİLEN 301 — TAŞINAN SORGU DİZESİ): saf karar.
test("managedRedirectSearch: site içi hedefte sorgu bayt bayt taşınır; `page` düşer; site dışı hedefte hiçbir şey taşınmaz", () => {
  // Site içi hedef: izleme parametreleri aynen (yeniden kodlama yok, sıra aynı).
  assert.equal(managedRedirectSearch("/urun/yeni-slug", "?gclid=abc123&utm_source=google&utm_campaign=g%C3%BCl"), "?gclid=abc123&utm_source=google&utm_campaign=g%C3%BCl");
  assert.equal(managedRedirectSearch("/", "?gclid=x"), "?gclid=x");
  assert.equal(managedRedirectSearch("/kategori/yeni", "?a=1+2&b=%20&c"), "?a=1+2&b=%20&c", "ham parçalar korunur");
  // Sorgu yoksa Location'a "?" eklenmez.
  assert.equal(managedRedirectSearch("/urun/yeni-slug", ""), "");
  assert.equal(managedRedirectSearch("/urun/yeni-slug", "?"), "");
  // `page` taşınmaz (hedef başka bir liste olabilir → olmayan sayfaya 301 → 404 zinciri kurulmaz).
  assert.equal(managedRedirectSearch("/kategori/yeni", "?page=7"), "");
  assert.equal(managedRedirectSearch("/kategori/yeni", "?gclid=abc&page=7"), "?gclid=abc");
  assert.equal(managedRedirectSearch("/kategori/yeni", "?page=7&gclid=abc&utm_source=x"), "?gclid=abc&utm_source=x");
  assert.equal(managedRedirectSearch("/kategori/yeni", "?sort=price_asc&page=2&page=3"), "?sort=price_asc", "yinelenen page de düşer");
  assert.equal(managedRedirectSearch("/kategori/yeni", "?%70age=7&gclid=abc"), "?gclid=abc", "yüzde-kodlu anahtar da page'dir");
  // Yalnız anahtarı TAM `page` olan parametre düşer.
  assert.equal(managedRedirectSearch("/kategori/yeni", "?pages=2&mypage=3&Page=4"), "?pages=2&mypage=3&Page=4");
  assert.equal(managedRedirectSearch("/kategori/yeni", "?%E0%A4%A=1&gclid=abc"), "?%E0%A4%A=1&gclid=abc", "bozuk kodlu anahtar fırlatmaz, aynen kalır");
  // Site dışına çözülen hedef (normalize() "//host/yol" biçimini korur): tıklama kimliği / utm üçüncü hosta VERİLMEZ.
  for (const dis of ["//evil.example/x", "/\\evil.example/x", "", "https://evil.example/x"]) {
    assert.equal(managedRedirectSearch(dis, "?gclid=abc&utm_source=google&token=gizli"), "", JSON.stringify(dis));
  }
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
/** Harita ucunun yanıt gecikmesi (ms) — "API yavaş" senaryosu. */
let redirectGecikmeMs = 0;

(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
  const url = new URL(String(input));
  if (url.pathname === "/api/public/redirects") {
    redirectIstekSayisi++;
    const stub = redirectStub;
    if (redirectGecikmeMs > 0) await new Promise((resolve) => setTimeout(resolve, redirectGecikmeMs));
    if (stub === "throw") throw new Error("other side closed");
    return { ok: stub.status === 200, status: stub.status, json: async () => ({ redirects: stub.redirects ?? [] }) };
  }
  // Diğer uçlar (legacy mahalle sözlüğü vb.): yok say → mevcut fail-safe yolları.
  return { ok: false, status: 404, json: async () => ({}) };
};

const { NextRequest } = await import("next/server");
const { middleware } = await import("../middleware.ts");

const SITE = "https://www.cicekyolla.com.tr";
const istek = (yol: string) => new NextRequest(`${SITE}${yol}`);
// Edge'in `event.waitUntil` karşılığı: locale dalı süresi dolmuş haritayı ARKA PLANDA yeniler; testte o
// yenileme `yenilemeyiBekle()` ile beklenir (deterministik). Middleware'in kendisi yenilemeyi BEKLEMEZ.
const bekleyen: Promise<unknown>[] = [];
const olay = { waitUntil: (p: Promise<unknown>) => { bekleyen.push(p); } } as unknown as Parameters<typeof middleware>[1];
const yenilemeyiBekle = async () => { await Promise.all(bekleyen.splice(0)); };
/** Locale isteği + (varsa) arka plan yenilemesinin bitmesi. Yanıt, yenilemeden ÖNCEKİ haritayla verilmiştir. */
async function localeIstek(yol: string): Promise<Response> {
  const res = await middleware(istek(yol), olay);
  await yenilemeyiBekle();
  return res;
}
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
    const res = await localeIstek("/de/produkt/alte-rosen");
    assert.equal(devamMi(res), true, JSON.stringify(bozuk));
    assert.equal(res.headers.get("location"), null, JSON.stringify(bozuk));
    assert.ok(redirectIstekSayisi > once, "harita yeniden istenir (kısa hata TTL'i)");
  }
});

test("UCUZ HARİTA: süresi dolmuş haritada locale isteği API'yi BEKLEMEZ — eldeki haritayla karar verir, yenileme arka planda", async () => {
  // Elde (önceki testten) boş bir harita var ve süresi doldu; API yavaş (300 ms) ama sağlıklı.
  onbellekEskit();
  redirectStub = { status: 200, redirects: KAYITLAR };
  redirectGecikmeMs = 300;
  try {
    const once = redirectIstekSayisi;
    const t0 = gercekNow();
    const res = await middleware(istek("/de/produkt/alte-rosen"), olay);
    const sure = gercekNow() - t0;
    assert.ok(sure < 150, `istek yenilemeyi beklemedi (${sure} ms)`);
    assert.equal(devamMi(res), true, "eldeki (bayat) haritada kayıt yok → bugünkü gibi devam");
    assert.equal(redirectIstekSayisi, once + 1, "yenileme başlatıldı");
    assert.equal(bekleyen.length, 1, "yenileme waitUntil'e teslim edildi (Edge isteği kesmez)");
    // Yenileme sürerken gelen diğer locale istekleri de beklemez ve İKİNCİ bir istek atmaz.
    const t1 = gercekNow();
    await middleware(istek("/en/category/old-roses"), olay);
    assert.ok(gercekNow() - t1 < 150);
    assert.equal(redirectIstekSayisi, once + 1, "aynı anda tek yenileme");
    await yenilemeyiBekle();
    // Yenileme bitti: sonraki istek yeni haritayla yönlendirilir.
    const sonra = await localeIstek("/de/produkt/alte-rosen");
    assert.equal(sonra.status, 301);
    assert.equal(redirectIstekSayisi, once + 1, "taze harita için ek istek yok");
  } finally {
    redirectGecikmeMs = 0;
  }
});

test("SOĞUK AÇILIŞ: süreçte hiç harita yokken locale isteği haritayı BEKLER (eski adres 404 değil 301 görür)", async () => {
  // Modülün taze bir örneği = yeni Edge isolate'i (önbellek boş).
  const tazeModul: string = "./managed-redirects.ts?soguk-acilis";
  const taze = (await import(tazeModul)) as typeof import("./managed-redirects.ts");
  redirectStub = { status: 200, redirects: KAYITLAR };
  redirectGecikmeMs = 120;
  try {
    const ertelenen: Promise<unknown>[] = [];
    const t0 = gercekNow();
    const hit = await taze.resolveManagedLocaleRedirect("/de/produkt/alte-rosen", (p) => { ertelenen.push(p); });
    assert.ok(gercekNow() - t0 >= 100, "harita beklendi");
    assert.deepEqual(hit, { to: "/de/produkt/rote-rosen", code: 301 });
    assert.equal(ertelenen.length, 0, "beklenen okuma arka plana atılmaz");
  } finally {
    redirectGecikmeMs = 0;
  }
});

test("middleware: kaydı olan locale yolu kalıcı yönlendirilir (301), hedef aynı origin", async () => {
  onbellekEskit();
  redirectStub = { status: 200, redirects: KAYITLAR };
  // Süresi dolmuş haritayı ilk locale isteği arka planda yeniler (yanıtı eski haritayla verir).
  await localeIstek("/de");
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

test("middleware: zincir (A→B→C) tek 301 ile nihai hedefe gider (sorgu korunur); üçlü çevrim hiçbir adımda yönlendirmez", async () => {
  onbellekEskit();
  redirectStub = {
    status: 200,
    redirects: [
      { from: "/de/produkt/z1", to: "/de/produkt/z2", code: 301 },
      { from: "/de/produkt/z2", to: "/de/produkt/z3", code: 301 },
      { from: "/nl/product/c1", to: "/nl/product/c2", code: 301 },
      { from: "/nl/product/c2", to: "/nl/product/c3", code: 301 },
      { from: "/nl/product/c3", to: "/nl/product/c1", code: 301 },
    ],
  };
  await localeIstek("/de");
  const res = await middleware(istek("/de/produkt/z1?gclid=abc&page=2"));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `${SITE}/de/produkt/z3?gclid=abc&page=2`, "iki ayrı 301 yerine tek adım");
  assert.equal((await middleware(istek("/de/produkt/z2"))).headers.get("location"), `${SITE}/de/produkt/z3`);
  assert.equal(devamMi(await middleware(istek("/de/produkt/z3"))), true);
  // Üçlü çevrim: önceden her adım yönlendiriyordu (ERR_TOO_MANY_REDIRECTS); artık sayfa çizilir.
  for (const yol of ["/nl/product/c1", "/nl/product/c2", "/nl/product/c3"]) {
    const r = await middleware(istek(yol));
    assert.equal(devamMi(r), true, yol);
    assert.equal(r.headers.get("location"), null, yol);
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

// EK (SORGU DİZESİ KORUNUR): TR yönetilen 301 dalı da isteğin sorgu dizesini hedefe taşır.
test("TR yönetilen 301: sorgu dizesi korunur (gclid / utm); `page` taşınmaz; site dışı hedefe sorgu verilmez; kod kayıttan", async () => {
  onbellekEskit();
  redirectStub = {
    status: 200,
    redirects: [
      ...KAYITLAR,
      { from: "/urun/eski-slug", to: "/urun/yeni-slug", code: 301 },
      { from: "/kategori/eski-kategori", to: "/kategori/yeni-kategori", code: 308 },
      { from: "/dis", to: "//evil.example/x", code: 301 },
    ],
  };
  const urun = await middleware(istek("/urun/eski-slug?gclid=abc123&utm_source=google&utm_campaign=g%C3%BCl"));
  assert.equal(urun.status, 301);
  assert.equal(urun.headers.get("location"), `${SITE}/urun/yeni-slug?gclid=abc123&utm_source=google&utm_campaign=g%C3%BCl`, "sorgu bayt bayt taşınır");
  // EK: `page` taşınmaz — birleştirilen kategoride hedefte olmayan sayfaya (404) değil, hedefin 1. sayfasına (200) inilir.
  const kategori = await middleware(istek("/kategori/eski-kategori?page=3"));
  assert.equal(kategori.status, 308, "kod kayıttan");
  assert.equal(kategori.headers.get("location"), `${SITE}/kategori/yeni-kategori`);
  const kategoriReklam = await middleware(istek("/kategori/eski-kategori?gclid=abc&page=7&utm_source=google"));
  assert.equal(kategoriReklam.headers.get("location"), `${SITE}/kategori/yeni-kategori?gclid=abc&utm_source=google`, "izleme parametreleri kalır");
  // EK: hedef site dışına çözülüyorsa yönlendirme önceki hâliyle aynıdır (sorgusuz) — tıklama kimliği dış hosta gitmez.
  const dis = await middleware(istek("/dis?gclid=abc&utm_source=google"));
  assert.equal(dis.status, 301);
  assert.equal(dis.headers.get("location"), "https://evil.example/x");
  assert.equal((await middleware(istek("/dis"))).headers.get("location"), "https://evil.example/x", "sorgusuz istekte Location aynı");
  const kok = await middleware(istek("/cicek-gonder?gclid=x"));
  assert.equal(kok.headers.get("location"), `${SITE}/?gclid=x`);
  // Sorgusuz istekte Location bugünküyle aynı (sonda "?" yok).
  assert.equal((await middleware(istek("/urun/eski-slug"))).headers.get("location"), `${SITE}/urun/yeni-slug`);
  assert.equal((await middleware(istek("/urun/eski-slug?"))).headers.get("location"), `${SITE}/urun/yeni-slug`);
  // Kaydı olmayan TR yolu sorguyla da bugünkü gibi devam eder.
  assert.equal(devamMi(await middleware(istek("/urun/yeni-slug?gclid=abc123"))), true);
});

test("kaynak nöbeti: TR yönetilen 301 dalı sorguyu saf karardan (managedRedirectSearch) geçirerek taşır; locale dalı aynen", () => {
  const src = readFileSync(path.join(REPO_KOK, "middleware.ts"), "utf8");
  const trDal = src.slice(src.indexOf("const managed = await resolveManagedRedirect(req.nextUrl.pathname);"), src.indexOf("const res = NextResponse.next();"));
  assert.ok(trDal.includes("const target = new URL(managed.to, req.nextUrl.origin);"));
  assert.ok(trDal.includes("target.search = managedRedirectSearch(managed.to, req.nextUrl.search);"));
  assert.ok(!trDal.includes("target.search = req.nextUrl.search;"), "TR dalı sorguyu süzmeden kopyalamaz");
  assert.ok(trDal.includes("return NextResponse.redirect(target, managed.code);"));
  assert.equal(src.split("target.search = req.nextUrl.search;").length - 1, 1, "yalnız locale dalı (hedefi zaten site içi doğrulanmış; yalnız slug değişimi)");
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
  // EK: zincir / çevrim kararı + beklemeyen harita tek çağrıda; arka plan yenilemesi Edge'in waitUntil'ine teslim edilir.
  assert.ok(dal.includes("const localeManaged = await resolveManagedLocaleRedirect(req.nextUrl.pathname, (refresh) => event?.waitUntil(refresh));"));
  assert.ok(!/resolveManagedRedirect\(/.test(dal.replace(/\/\*[\s\S]*?\*\//g, "")), "locale dalı haritayı BEKLEYEN okumayı kullanmaz");
  assert.ok(src.includes("export async function middleware(req: NextRequest, event?: NextFetchEvent) {"));
  assert.ok(dal.includes("target.search = req.nextUrl.search;"), "sorgu dizesi korunur");
  // TR dalı aynen: haritayı bekleyen okuma + son sıradaki yönetilen 301.
  assert.ok(src.includes("const legacyMuaf = await isManagedRedirectTarget(req.nextUrl.pathname);"));
  assert.ok(src.includes("const managed = await resolveManagedRedirect(req.nextUrl.pathname);"));
  const lib = readFileSync(path.join(REPO_KOK, "lib", "managed-redirects.ts"), "utf8");
  const mapFn = lib.slice(lib.indexOf("async function getMapForLocale("), lib.indexOf("export async function resolveManagedLocaleRedirect("));
  assert.ok(mapFn.includes("if (!cache) return getMap();"), "soğuk açılışta beklenir");
  assert.ok(mapFn.includes("if (defer) defer(refresh);") && mapFn.includes("return stale;"), "süresi dolmuş harita hemen döner");
  assert.match(dal, /return NextResponse\.next\(\);\s*\}\s*$/, "kayıt yoksa hemen devam; dal burada kapanır");
  for (const legacy of ["resolveLegacyLocation", "resolveKategoriLegacy", "resolveSayfaLegacy", "resolveCicekleriLegacy", "resolveLegacyNeighborhoodRedirect", "isManagedRedirectTarget"]) {
    assert.ok(!dal.includes(legacy), `locale dalı ${legacy} çağırmaz`);
  }
});
