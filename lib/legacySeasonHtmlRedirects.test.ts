// lib/legacySeasonHtmlRedirects.test.ts — eski yılbaşı / kokina ".html" adresleri testleri.
// Çalıştırma: node --test lib/legacySeasonHtmlRedirects.test.ts  (npm run test:unit)
//
// Kurallar Next'in kendi path-to-regexp derlemesiyle eşlenir (next.config redirect'leriyle aynı motor)
// ve next.config.js'teki GERÇEK sıra kullanılır: ilk eşleşen kazanır.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { pathToRegexp } = require("next/dist/compiled/path-to-regexp") as {
  pathToRegexp: (source: string, keys?: unknown[], opts?: { strict?: boolean; sensitive?: boolean; delimiter?: string }) => RegExp;
};
const nextConfig = require("../next.config.js") as {
  redirects: () => Promise<Array<{ source: string; destination: string; permanent: boolean; has?: unknown }>>;
};
const { LEGACY_SEASON_HTML_REDIRECTS } = require("./legacySeasonHtmlRedirects.js") as {
  LEGACY_SEASON_HTML_REDIRECTS: Array<{ source: string; destination: string; permanent: boolean }>;
};

/** next.config sırasıyla ilk eşleşen kuralın hedefi (host koşullu apex kuralı hariç). */
async function hedef(yol: string): Promise<string | null> {
  const kurallar = (await nextConfig.redirects()).filter((k) => !k.has);
  for (const k of kurallar) {
    if (pathToRegexp(k.source, [], { strict: true, sensitive: false, delimiter: "/" }).test(yol)) return k.destination;
  }
  return null;
}

// Search Console'da 1 Kas 2025 – 10 Oca 2026 arasında gösterim almış gerçek adresler.
const BEKLENEN: Array<[string, string]> = [
  ["/54517-Kokina-Cicegi.html", "/kategori/kokina"],
  ["/63030-Gold-Saksi-icerisinde-Kokina-Aranjmani.html", "/kategori/kokina"],
  ["/54519-Yilbasi-Cicegi-Kokina-Buketi.html", "/kategori/kokina"],
  ["/63114-Kokina-ve-Kozalakli-Yilbasi-Buketi.html", "/kategori/kokina"],
  ["/63140-Yilbasi-Ozel-Kirmizi-Gul-ve-Kokina-Aranjmani.html", "/kategori/kokina"],
  ["/63116-Kokinali-Zarif-Cicek-Buketi-.html", "/kategori/kokina"],
  ["/63105--Yilbasi-Kokina-ve-Sukulent-Aranjmani.html", "/kategori/kokina"],
  ["/63071-Yilbasi-Masa-Cicegi.html", "/kategori/yilbasi-sofra-cicegi"],
  ["/63162-Yilbasi-Gul-Buketi-.html", "/kategori/yilbasi-gul"],
  ["/63592-Kirmizi-Gul-Yeni-Yil-Buketi.html", "/kategori/yilbasi-gul"],
  ["/63579-Turuncu-Gul-ve-Portakal-Detayli-Yeni-Yil-Buketi.html", "/kategori/yilbasi-gul"],
  ["/63160-Yilbasi-Kutulu-Cicek-Aranjmani.html", "/kategori/yilbasi-kutuda-cicek"],
  ["/63618-Kirmizi-Yilbasi-Kutulu-Mumlu-Aranjman-.html", "/kategori/yilbasi-kutuda-cicek"],
  ["/63142-Yilbasi-Ozel-Cicek-Buketi.html", "/kategori/yilbasi-buket"],
  ["/63621-Noel-Baba-Figurlu-Yeni-Yil-Kirmizi-Buketi.html", "/kategori/yilbasi-buket"],
  ["/63593-Yeni-Yil-Cam-Buketi.html", "/kategori/yilbasi-buket"],
  ["/63032-Yilbasi-Aranjmani.html", "/kategori/yilbasi-aranjman"],
  ["/63028-Dogal-Kozalak-Yilbasi-Aranjmani.html", "/kategori/yilbasi-aranjman"],
  ["/63582-Portakal-Dilimli-Yilbasi-Cam-Vazo-Aranjmani.html", "/kategori/yilbasi-aranjman"],
  ["/54527-Yilbasi-Agaci.html", "/kategori/yilbasi"],
  ["/52099-Ozel-Yeni-Yil-Teraryum.html", "/kategori/yilbasi"],
  ["/52710-Vivi-Kirmizi-Yeni-Yil-Aski.html", "/kategori/yilbasi"],
  ["/63090-Vera-Yeni-Yil-Serisi.html", "/kategori/yilbasi"],
  ["/yeni-yil-cicek-siparisi", "/kategori/yilbasi"],
];

test("eski yılbaşı / kokina adresleri tek adımda doğru kategoriye gider", async () => {
  for (const [yol, beklenen] of BEKLENEN) {
    assert.equal(await hedef(yol), beklenen, yol);
  }
});

test("kapsam dışı .html ürün adresleri genel kuralda kalır", async () => {
  for (const yol of ["/52604-Renkli-Lavantali.html", "/61234-Kirmizi-Gul-Buketi.html", "/50001-Beyaz-Orkide-Aranjmani.html"]) {
    assert.equal(await hedef(yol), "/urun/:slug", yol);
  }
});

test("hiçbir sezon kuralı ana sayfaya ya da /urun/ altına yönlendirmez", () => {
  const IZINLI = new Set([
    "/kategori/kokina", "/kategori/yilbasi", "/kategori/yilbasi-sofra-cicegi", "/kategori/yilbasi-gul",
    "/kategori/yilbasi-kutuda-cicek", "/kategori/yilbasi-buket", "/kategori/yilbasi-aranjman",
  ]);
  for (const k of LEGACY_SEASON_HTML_REDIRECTS) {
    assert.ok(IZINLI.has(k.destination), k.destination);
    assert.equal(k.permanent, true);
    assert.match(k.source, /\\\.html$/);
  }
});

test("sezon kuralları next.config'te genel .html kuralından önce gelir", async () => {
  const kaynaklar = (await nextConfig.redirects()).map((k) => k.source);
  const genel = kaynaklar.indexOf("/:id(\\d+)-:slug(.+)\\.html");
  assert.ok(genel > 0);
  for (const k of LEGACY_SEASON_HTML_REDIRECTS) {
    const i = kaynaklar.indexOf(k.source);
    assert.ok(i >= 0 && i < genel, k.source);
  }
});
