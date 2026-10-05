// <html lang / dir> sunucuda isteğin yolundan — kural + kök layout bağlantısı.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { htmlLangForPath } from "./htmlLang.ts";
import { DIR, GLOBAL_LOCALES, SEGMENTS } from "./global/config.ts";

const root = join(import.meta.dirname, "..");

test("13 dil × ana sayfa / ürün / kategori / lokasyon: lang = sayfanın dili; dir yalnız Arapçada rtl", () => {
  assert.equal(GLOBAL_LOCALES.length, 13);
  let n = 0;
  for (const l of GLOBAL_LOCALES) {
    const paths = [
      `/${l}`, `/${l}/`,
      `/${l}/${SEGMENTS[l].product}/ornek-urun`,
      `/${l}/${SEGMENTS[l].category}/ornek-kategori`,
      `/${l}/istanbul`, `/${l}/istanbul/kadikoy`, `/${l}/antalya/akseki/aksahap-mah`,
      `/${l}?page=2`, `/${l}/istanbul?page=3&category=x`, `/${l}#bolum`,
    ];
    for (const p of paths) {
      const got = htmlLangForPath(p);
      assert.equal(got.lang, l, p);
      assert.equal(got.dir, DIR[l] === "rtl" ? "rtl" : undefined, p);
      n++;
    }
  }
  assert.equal(n, 130);
  assert.deepEqual(htmlLangForPath("/ar/product/x"), { lang: "ar", dir: "rtl" });
  assert.deepEqual(htmlLangForPath("/en/product/x"), { lang: "en" });
});

test("Türkçe yollar ve dil olmayan önekler: lang = tr, dir yazılmaz (Türkçe çıktı değişmez)", () => {
  for (const p of [
    "/", "/urun/kirmizi-gul", "/kategori/guller", "/kategori/guller?page=2", "/istanbul/kadikoy", "/sepet", "/blog/yazi",
    "/english", "/enx/abc", "/entry", "/arama", "/de-olmayan", "/tr", "/tr/urun/x",
    // büyük harfli önek dil sayılmaz (uygulamanın geri kalanıyla aynı karar)
    "/EN/product/x", "/De", "/AR/",
  ]) assert.deepEqual(htmlLangForPath(p), { lang: "tr" }, p);
});

test("yol okunamadıysa / biçimsizse tr (düzeltmeden önceki davranış)", () => {
  for (const p of [null, undefined, "", "en/product/x", "https://www.cicekyolla.com.tr/en"]) {
    assert.deepEqual(htmlLangForPath(p as string | null | undefined), { lang: "tr" }, String(p));
  }
});

test("bağlantı: kök layout dili sunucuda kurar; baştaki dil betiği yerinde; Next iç modülü bu sürümde var", () => {
  const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
  assert.match(layout, /const htmlLang = htmlLangForPath\(currentRequestPath\(\)\);/);
  assert.match(layout, /<html lang=\{htmlLang\.lang\} dir=\{htmlLang\.dir\} suppressHydrationWarning/);
  assert.equal(/<html lang="tr"/.test(layout), false, "sabit lang geri gelmemeli");
  assert.ok(layout.includes('<Script id="cy-lang-dir" strategy="beforeInteractive">'), "istemci betiği kaldırılmadı");
  // headers() / cookies() ile yol okunmaz (bütün rotaları dinamik yapar).
  const helper = readFileSync(join(root, "lib/requestPath.ts"), "utf8");
  assert.equal(/from "next\/headers"/.test(helper), false);
  assert.match(helper, /staticGenerationAsyncStorage\.getStore\(\)\?\.urlPathname/);
  // İç modül ve alanı kurulu Next sürümünde gerçekten var (yükseltmede kırılırsa bu test söyler).
  const dts = join(root, "node_modules/next/dist/client/components/static-generation-async-storage.external.d.ts");
  if (existsSync(dts)) assert.match(readFileSync(dts, "utf8"), /readonly urlPathname: string;/);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  assert.equal(pkg.dependencies?.next, "14.2.5", "Next sürümü değişti: iç depo okumasını (lib/requestPath.ts) ve dil taramasını yeniden doğrula");
});
