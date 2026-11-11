// 6 Kas 2026 — Taze Çiçek karşılaştırması adım 1+2: doğrulanmış ücretsiz teslimat sözü + fotoğraf onayı garantisi.
// Kanıt: canlı /api/delivery-check İstanbul 1,9–37,8 km ücret ₺0; sahip kararı "beğenmezse yeniden hazırlanır".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import tr from "./i18n/dict/tr.ts";
import { GLOBAL_DICTS } from "./i18n/dicts.ts";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("güven şeridi: iki yeni söz + mevcut ikisi korunur; 'büyük bölümüne' sınırlaması (45 km+ ücretli)", () => {
  const s = oku("../components/home/TrustBar.tsx");
  assert.ok(s.includes(`text: "İstanbul'un büyük bölümüne ücretsiz aynı gün teslimat"`));
  assert.ok(s.includes(`text: "İsterseniz teslimattan önce fotoğraf"`));
  assert.ok(s.includes(`text: "Taptaze Garantisi"`) && s.includes(`text: "Güvenli Ödeme"`));
  assert.doesNotMatch(s, /text: "[^"]*(Tüm İstanbul|her yere|garantili saat|\d+ ?dk)/i);
});

test("SSS: somut saat + ücret + fotoğraf cevabı; adrese özel güncel bilgi kaydı; çelişki yok", () => {
  const s = oku("../app/sik-sorulan-sorular/page.tsx");
  assert.ok(s.includes("20:00") && s.includes("18:00") && s.includes("17:00"));
  assert.ok(s.includes("Adresinize özel güncel son saat, sipariş adımında gösterilir."));
  assert.ok(s.includes("İstanbul'da 45 km'ye kadar aynı gün teslimat ücretsizdir."));
  assert.ok(s.includes("ödemeden önce gösterilir"));
  assert.ok(s.includes("beğenmezseniz yeniden hazırlarız"));
  assert.doesNotMatch(s, /Teslimat ücreti seçilen bölge ve teslimat seçeneğine göre sipariş özetinde/);
  // FAQPage şeması aynı listeden (görünen = şema)
  assert.match(s, /mainEntity:items\.map/);
});

test("PDP: 'fotoğraftaki ürün gönderilir' kalktı; 14 dilde fotoğraf onayı + yeniden hazırlama", () => {
  // 12 Kas 2026 (sahip kararı): fotoğraf İSTEK ÜZERİNE — etiket her siparişte gönderim izlenimi vermez.
  assert.equal(tr["pdp.trust.photo"], "İsterseniz teslimattan önce fotoğraf");
  assert.ok(tr["pdp.visualDesc"].includes("beğenmezseniz yeniden hazırlarız"));
  for (const [l, d] of Object.entries(GLOBAL_DICTS)) {
    assert.ok(d["pdp.trust.photo"].trim().length > 0 && d["pdp.trust.photo"] !== tr["pdp.trust.photo"], l);
    assert.ok(d["pdp.visualDesc"].trim().length > 20 && d["pdp.visualDesc"] !== tr["pdp.visualDesc"], l);
    assert.doesNotMatch(d["pdp.trust.photo"], /as pictured|wie abgebildet|comme sur la photo|كما في الصورة/i, l);
  }
  assert.equal(GLOBAL_DICTS.en["pdp.trust.photo"], "Photo before delivery, on request");
});
