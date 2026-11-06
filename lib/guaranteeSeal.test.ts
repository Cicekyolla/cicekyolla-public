// C3 (6 Kas 2026) — Garanti mührü sayfa dilinde; TR mühür 30 Ağu kaynağıyla birebir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SEAL_TEXT, sealTextFor } from "./guaranteeSeal.ts";

const LOCALES = ["tr", "en", "de", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"];

test("TR kilidi: metin, boyut, harf aralığı 30 Ağu kaynağıyla aynı; bilinmeyen dil → TR", () => {
  assert.deepEqual(SEAL_TEXT.tr, { top: "%100 ", bottom: "GARANTİSİ", bottomSpacing: 3.0, bottomSize: 14 });
  for (const v of [null, undefined, "", "xx", "TR"]) assert.equal(sealTextFor(v), SEAL_TEXT.tr);
});

test("14 dil eksiksiz; marka çevrilmez; iade/para iade yok; yalnız AR sağdan sola", () => {
  assert.deepEqual(Object.keys(SEAL_TEXT).sort(), [...LOCALES].sort());
  for (const l of LOCALES) {
    const s = SEAL_TEXT[l as keyof typeof SEAL_TEXT];
    assert.ok(s.bottom.trim().length > 0 && /100/.test(s.top), l);
    assert.ok(s.bottomSize >= 14 && s.bottomSize <= 20 && s.bottomSpacing >= 0 && s.bottomSpacing <= 12, l);
    assert.doesNotMatch(s.bottom, /refund|iade|rückerstatt|rembours|возврат/i, l);
    assert.equal(s.dir === "rtl", l === "ar", l);
    if (l !== "tr") assert.equal(s.top, "100% ", l);
  }
  assert.equal(SEAL_TEXT.en.bottom, "GUARANTEE");
  assert.equal(SEAL_TEXT.ru.bottom, "ГАРАНТИЯ");
});

test("bileşen: geometri kilitli; TR yolunda aria-label/lang/boyut/aralık sabit; global dilde çevrili etiket", () => {
  const c = readFileSync(new URL("../components/FlowerGuaranteeBadge.tsx", import.meta.url), "utf8");
  for (const g of ['viewBox="0 0 200 200"', 'r="90" stroke={color} strokeWidth="5"', 'r="79" stroke={color} strokeWidth="1.5"',
    'd="M 35 100 A 65 65 0 0 1 165 100"', 'd="M 35 100 A 65 65 0 0 0 165 100"',
    '"M 100 129 C 87 120 70 108 70 94 C 70 79 83 65 100 74 C 117 65 130 79 130 94 C 130 108 113 120 100 129 Z"',
    'fontSize="15" fontWeight="800" letterSpacing="1.2">ÇİÇEKYOLLA</tspan>']) assert.ok(c.includes(g), g);
  assert.match(c, /aria-label=\{isTr \? "%100 ÇiçekYolla Garantisi" : i18n\.t\("pdp\.guaranteeTitle"\)\}/);
  assert.match(c, /lang=\{isTr \? "tr" : lang\}/);
  assert.match(c, /fontSize=\{isTr \? "14" : String\(seal\.bottomSize\)\}/);
  assert.match(c, /letterSpacing=\{isTr \? "3\.0" : String\(seal\.bottomSpacing\)\}/);
});
