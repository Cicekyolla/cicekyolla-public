// lib/ruCommercialMiddleware.test.ts — RU İstanbul ticari URL: middleware GERÇEKTEN çalıştırılır (API stub'lanır; ağ YOK).
// Bu dosya kendi sürecinde (node --test her dosyayı ayrı süreçte koşar) bayrağı production 7 dil + ru ile açar:
//  • 1.015 eski RU adresinin HER BİRİ tek adımda 301 → sözlükteki ticari adrese; gclid/utm sorgusu bayt bayt korunur.
//  • Ticari adres yeniden yönlendirilmez (döngü yok); uydurma slug yönlendirilmez (sayfa 404 verir).
//  • Diğer 7 dilin eski adresleri de kendi ticari adresine gider; kalıbı olmayan dil (ar) dokunulmaz.
// NOT: middleware "@/lib/..." takma adını kullanıyor; aşağıdaki hook YALNIZ bu test sürecinde çalışır.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

process.env.NEXT_PUBLIC_GLOBAL_COMMERCIAL_URL_LOCALES = "en,de,fr,it,nl,es,pt,ru";

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

type Satir = { locale: string; key: string; current: string; proposed: string };
const SOZLUK: Satir[] = readFileSync(path.join(REPO_KOK, "docs/global-istanbul-url-gecis/istanbul-global-url-sozlugu.csv"), "utf8")
  .trim().split(/\r?\n/).slice(1).map((l) => {
    const [locale, key, current, proposed] = l.split(",");
    return { locale, key, current, proposed };
  });
const KEYS = [...new Set(SOZLUK.map((r) => r.key))];

let envanterIstekSayisi = 0;
(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
  const url = new URL(String(input));
  if (url.pathname === "/api/public/redirects") return { ok: true, status: 200, json: async () => ({ redirects: [] }) };
  if (url.pathname === "/api/public/global/pages-inventory") {
    envanterIstekSayisi++;
    return { ok: true, status: 200, json: async () => ({ data: KEYS.map((page_key) => ({ page_key })) }) };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

const { NextRequest } = await import("next/server");
const { middleware } = await import("../middleware.ts");
const SITE = "https://www.cicekyolla.com.tr";
const olay = { waitUntil: () => {} } as unknown as Parameters<typeof middleware>[1];
const iste = (yol: string) => middleware(new NextRequest(`${SITE}${yol}`), olay);
const devamMi = (res: Response) => res.headers.get("x-middleware-next") === "1";
const SORGU = "?gclid=abc123&utm_source=yandex&utm_campaign=%D1%86%D0%B2%D0%B5%D1%82%D1%8B";

test("RU: 1.015 eski adresin her biri tek 301 → ticari adres; gclid/utm korunur; hedef döngüsüz", async () => {
  const ru = SOZLUK.filter((r) => r.locale === "ru");
  assert.equal(ru.length, 1_015);
  for (const r of ru) {
    const res = await iste(`${r.current}${SORGU}`);
    assert.equal(res.status, 301, r.current);
    assert.equal(res.headers.get("location"), `${SITE}${r.proposed}${SORGU}`, r.current);
    const hedef = await iste(r.proposed);
    assert.ok(devamMi(hedef), `${r.proposed} yeniden yönlendirilmez`);
  }
  assert.ok(envanterIstekSayisi >= 1 && envanterIstekSayisi <= 13, "envanter süreç içinde önbelleklenir");
});

test("RU: sondaki / ve sorgusuz istek de aynı hedefe; uydurma ticari slug ve kalıp dışı yollar yönlendirilmez", async () => {
  const res = await iste("/ru/istanbul/maltepe/cevizli-mah/");
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `${SITE}/ru/dostavka-tsvetov-cevizli-maltepe-stambul`);
  for (const yol of ["/ru/dostavka-tsvetov-netakogo-stambul", "/ru/istanbul/yok-ilce", "/ru/product/gul", "/ru/antalya/muratpasa", "/ru"]) {
    assert.ok(devamMi(await iste(yol)), yol);
  }
});

test("Diğer diller: 7 dil kendi ticari adresine (bayrak açık); kalıbı olmayan AR adresi değişmez", async () => {
  for (const r of SOZLUK.filter((x) => ["en", "de", "fr", "it", "nl", "es", "pt"].includes(x.locale) && x.key.split("/").length === 3).slice(0, 70)) {
    const res = await iste(r.current);
    assert.equal(res.status, 301, r.current);
    assert.equal(res.headers.get("location"), `${SITE}${r.proposed}`);
  }
  assert.ok(devamMi(await iste("/ar/istanbul/kadikoy")));
});
