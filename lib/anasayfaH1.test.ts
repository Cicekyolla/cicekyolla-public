// lib/anasayfaH1.test.ts — ana sayfa H1 nöbetçisi.
// Çalıştırma: node --test lib/anasayfaH1.test.ts   (npm run test:unit)
//
// NEDEN KAYNAK DOSYA OKUYOR: HomeHero bir client component (motion/react +
// lucide-react) — node test ortamına alınamaz. Korunan şey davranış değil,
// H1 metninin kendisi ve İKİ TANIMIN SENKRONU.
//
// ⚠️ GERÇEK FOOTGUN: HomeHero'da varsayılan başlık İKİ YERDE duruyor —
// (1) `headline` değişkeninin `||` varsayılanı, (2) JSX'teki degrade'li
// fallback bloğu. Sayfa `hasCustomHeadline`e göre BİRİNİ seçer: admin CMS'te
// başlık varsa (1) düz metin olarak basılır (degrade GİDER), yoksa (2) basılır.
// Biri güncellenip diğeri unutulursa CMS'li ve CMS'siz kurulumlar farklı H1
// gösterir ve kimse fark etmez. Bu test o ayrışmayı yakalar.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const AYIRICI = String.fromCharCode(92) + "n"; // ters bolu + n (kaynak dosyada gecen bicim)
const kaynak = readFileSync(new URL("../components/home/HomeHero.tsx", import.meta.url), "utf8");

/** `headline` değişkeninin varsayılanındaki satırlar. */
function varsayilanSatirlar(): string[] {
  const m = kaynak.match(/const headline = config\.headline\?\.trim\(\) \|\| "([^"]+)"/);
  assert.ok(m, "headline varsayılanı bulunamadı — dosyanın yapısı değişmiş olabilir");
  return m[1].split(AYIRICI).map((x) => x.trim()).filter(Boolean);
}

/** JSX degrade'li fallback bloğunun metni. */
function jsxFallback(): string {
  const i = kaynak.indexOf("hasCustomHeadline ?");
  assert.ok(i > 0, "JSX fallback bloğu bulunamadı");
  return kaynak.slice(i, i + 1200);
}

test("H1'de sitenin en güçlü kelimesi 'Çiçek Yolla' geçer", () => {
  assert.ok(varsayilanSatirlar().join(" ").includes("Çiçek Yolla"));
  assert.ok(jsxFallback().includes("Çiçek Yolla"));
});

test("iki başlık tanımı SENKRON — CMS'li ve CMS'siz kurulum aynı H1'i gösterir", () => {
  const satirlar = varsayilanSatirlar();
  assert.equal(satirlar.length, 3, "başlık üç satır olmalı (hero düzeni buna göre)");
  const jsx = jsxFallback();
  for (const s of satirlar) {
    assert.ok(jsx.includes(s), `"${s}" satırı JSX fallback'inde yok — iki tanım ayrışmış`);
  }
});

test("degrade stili KORUNUYOR — orta satır <em> içinde", () => {
  // Degrade yalnız JSX dalında var; kaybolursa hero'nun görsel imzası gider.
  const jsx = jsxFallback();
  assert.match(jsx, /<em[\s\S]*?linear-gradient\(135deg, #C084FC/, "degrade stili kaybolmuş");
  assert.match(jsx, /<em[\s\S]*?>Çiçek Yolla<\/em>/, "degrade orta satırı sarmıyor");
});
