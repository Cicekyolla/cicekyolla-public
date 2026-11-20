import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isMobileLikeDevice, paytrDisplayMode, readPaytrDisplayEnv } from "./paytrDisplayMode.ts";

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36";

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

test("masaüstü + Türkçe: çerçeve AYNEN kalır", () => {
  assert.equal(paytrDisplayMode({ embedEnabled: true, locale: "tr", userAgent: DESKTOP_UA, viewportWidth: 1440, coarsePointer: false }), "frame");
});

test("bayrak kapalıysa her koşulda tam sayfa (bugünkü davranış)", () => {
  assert.equal(paytrDisplayMode({ embedEnabled: false, locale: "tr", userAgent: DESKTOP_UA, viewportWidth: 1440 }), "fullpage");
});

test("Türkçe dışı dil: masaüstünde de tam sayfa (15 Kas: Yunanistan, masaüstü, İngilizce)", () => {
  for (const locale of ["en", "ar", "ru", "de", "fr", "nl", "it", "es", "pt", "az", "zh", "ja", "ko"]) {
    assert.equal(paytrDisplayMode({ embedEnabled: true, locale, userAgent: DESKTOP_UA, viewportWidth: 1440 }), "fullpage", locale);
  }
});

test("mobil: Türkçede de tam sayfa (19 Kas: Irak, mobil)", () => {
  assert.equal(paytrDisplayMode({ embedEnabled: true, locale: "tr", userAgent: IPHONE_UA, viewportWidth: 390 }), "fullpage");
  assert.equal(paytrDisplayMode({ embedEnabled: true, locale: "tr", userAgent: ANDROID_UA, viewportWidth: 412 }), "fullpage");
  // Kimlik masaüstü görünse de dar pencere telefon düzenidir.
  assert.equal(paytrDisplayMode({ embedEnabled: true, locale: "tr", userAgent: DESKTOP_UA, viewportWidth: 600 }), "fullpage");
  // iPadOS: masaüstü kimliği + dokunmatik.
  assert.equal(paytrDisplayMode({ embedEnabled: true, locale: "tr", userAgent: DESKTOP_UA, viewportWidth: 1024, coarsePointer: true }), "fullpage");
});

test("dokunmatik geniş ekran (dokunmatik dizüstü) masaüstü sayılır", () => {
  assert.equal(isMobileLikeDevice({ userAgent: DESKTOP_UA, viewportWidth: 1920, coarsePointer: true }), false);
});

test("dil bilinmiyorsa Türkçe varsayılır; cihaz bilinmiyorsa masaüstü", () => {
  assert.equal(paytrDisplayMode({ embedEnabled: true, locale: null }), "frame");
  assert.equal(paytrDisplayMode({ embedEnabled: true, locale: "TR" }), "frame");
});

test("sunucuda cihaz okuması boş döner, fırlatmaz", () => {
  assert.deepEqual(readPaytrDisplayEnv(), {});
});

test("sihirbaz kararı bu fonksiyonla verir; adres ve eski yönlendirme satırı aynı", () => {
  const w = src("components/checkout/CheckoutWizard.tsx");
  assert.match(w, /paytrDisplayMode\(\{ embedEnabled: PAYTR_EMBED_ENABLED, locale, \.\.\.readPaytrDisplayEnv\(\) \}\) === "fullpage"/);
  // Tam sayfaya giden adres initPaytr'ın döndürdüğü adresin aynısı.
  const block = w.slice(w.indexOf("if (PAYTR_EMBED_ENABLED)"), w.indexOf("} catch (failure)"));
  assert.equal((block.match(/window\.location\.href = r\.iframe_url/g) ?? []).length, 2);
  assert.match(block, /setPaytrUrl\(r\.iframe_url\)/);
  assert.ok(!/paytr\.com/.test(block), "adres elle kurulmuyor");
});

test("havale ön seçimi: yalnız ?odeme=havale ile, yalnız gösterim", () => {
  const w = src("components/checkout/CheckoutWizard.tsx");
  assert.match(w, /new URLSearchParams\(window\.location\.search\)\.get\("odeme"\) === "havale"/);
  assert.match(w, /setPaymentMethod\("havale"\)/);
});
