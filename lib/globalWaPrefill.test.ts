// C4 (5 Kas 2026) — 13 dil WhatsApp önmetni + sayfa etiketi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WA_PREFILL, globalLocaleOfPath, pageTagOf, withGlobalWaPrefill } from "./global/waPrefill.ts";
import { withWhatsAppRef } from "./adsAttribution.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

const TABAN = "https://www.cicekyolla.com.tr";
const WA = "https://wa.me/905458813450";
const metin = (u: string | null) => (u ? new URL(u).searchParams.get("text") : null);

test("13 dilin hepsinde önmetin var; fiyat/para birimi sözü yok", () => {
  assert.deepEqual(Object.keys(WA_PREFILL).sort(), [...GLOBAL_LOCALES].sort());
  for (const l of GLOBAL_LOCALES) {
    assert.ok(WA_PREFILL[l].trim().length > 3, l);
    assert.ok(!/\n|£|€|₺|\$|\[/.test(WA_PREFILL[l]), l);
  }
});

test("TR ve dil öneki olmayan yollar: hiçbir değişiklik yok", () => {
  for (const p of ["/", "/istanbul", "/urun/kirmizi-gul", "/kategori/guller", "/tr/x", "/english", "", "/xx/istanbul"]) {
    assert.equal(globalLocaleOfPath(p), null, p);
    assert.equal(withGlobalWaPrefill(WA, p, TABAN), null, p);
    assert.equal(withGlobalWaPrefill(`${WA}?text=Merhaba`, p, TABAN), null, p);
  }
});

test("boş bağlantı: o dilde önmetin + aynı satırda sayfa etiketi", () => {
  for (const l of GLOBAL_LOCALES) {
    const t = metin(withGlobalWaPrefill(WA, `/${l}/istanbul`, TABAN));
    assert.equal(t, `${WA_PREFILL[l]} [p: ${l}/istanbul]`, l);
  }
  assert.equal(metin(withGlobalWaPrefill(WA, "/en", TABAN)), "Hello, I'd like to order flowers. [p: en]");
});

test("dolu önmetin korunur; yalnız etiket eklenir; satır sonu tek boşluğa iner", () => {
  const u = `${WA}?text=${encodeURIComponent("Flower delivery to hotels in Istanbul")}`;
  assert.equal(metin(withGlobalWaPrefill(u, "/en/hotel-delivery", TABAN)), "Flower delivery to hotels in Istanbul [p: en/hotel-delivery]");
  const cok = `${WA}?text=${encodeURIComponent("Hello\nsecond line")}`;
  assert.ok(!metin(withGlobalWaPrefill(cok, "/de/x", TABAN))!.includes("\n"));
});

test("etiket ikinci kez eklenmez; WhatsApp olmayan adres elenir", () => {
  const bir = withGlobalWaPrefill(WA, "/ru/istanbul", TABAN)!;
  assert.equal(withGlobalWaPrefill(bir, "/ru/istanbul", TABAN), null);
  assert.equal(withGlobalWaPrefill("https://t.me/cicekyolla", "/en/istanbul", TABAN), null);
  assert.equal(withGlobalWaPrefill("/en/istanbul", "/en/istanbul", TABAN), null);
  assert.ok(withGlobalWaPrefill("https://api.whatsapp.com/send?phone=905458813450", "/en/x", TABAN));
});

test("etiket: sorgu/parça atılır, yalnız güvenli karakter, en çok 60 karakter", () => {
  assert.equal(pageTagOf("/en/istanbul?utm_source=x&gclid=abc#top"), "en/istanbul");
  assert.equal(pageTagOf("/EN/Istanbul/"), null); // büyük harfli önek global yol değil
  assert.equal(pageTagOf("/en/product/101-red-rose-bouquet"), "en/product/101-red-rose-bouquet");
  assert.equal(pageTagOf("/ar/%D9%85%D8%B1/x"), "ar/x");
  const uzun = pageTagOf(`/en/${"a".repeat(200)}`)!;
  assert.ok(uzun.length <= 60);
  assert.match(uzun, /^[a-z0-9/_-]+$/);
});

test("reklam etiketiyle birlikte: tek satır, API desenleri ikisini de bulur", () => {
  const g = withGlobalWaPrefill(WA, "/en/hotel-delivery", TABAN)!;
  const r = withWhatsAppRef(g, "Cj0KCQabc_123-x.y", TABAN)!;
  const t = metin(r)!;
  assert.equal(t, "Hello, I'd like to order flowers. [p: en/hotel-delivery] [ref: Cj0KCQabc_123-x.y]");
  assert.ok(!t.includes("\n"));
  // whatsappOrderBridge.ts REF_DESENI ile birebir
  assert.equal(/\[ref:\s*([A-Za-z0-9._-]{6,255})\s*\]/i.exec(t)?.[1], "Cj0KCQabc_123-x.y");
  assert.equal(/\[p:\s*([a-z0-9/_-]{1,60})\s*\]/.exec(t)?.[1], "en/hotel-delivery");
});

test("dinleyici: global önmetin reklam etiketinden ÖNCE uygulanır; olay her tıklamada gider", () => {
  const src = readFileSync(new URL("../components/AdsWhatsAppRef.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("withGlobalWaPrefill(href, window.location.pathname, window.location.origin)"));
  assert.ok(src.includes("withWhatsAppRef(taban, ref, window.location.origin) : null) ?? globalHref"));
  assert.equal((src.match(/pushEvent\("whatsapp_click"/g) || []).length, 3);
  assert.ok(!/\.href\s*=\s*[^=]/.test(src.replace(/window\.location\.href\s*=/g, "")), "a.href attribute'una yazılmaz");
});
