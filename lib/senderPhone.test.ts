import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isValidSenderPhone, isValidTRPhone, normalizeInternationalPhone, senderPhoneForApi } from "./senderPhone.ts";

/* --------------------------------------------------------------------------
 * P0-1: checkout gönderen telefonu yurt dışı numarayı reddediyordu.
 * Kırmızı çizgiler: (1) TR biçimleri ve TR'de API'ye giden değer DEĞİŞMEZ;
 * (2) yurt dışı numara API'ye "+<hane>" gider (backend customer_phone
 * z.string().min(7).max(30); PayTR user_phone en çok 20 karakter).
 * ------------------------------------------------------------------------ */

const TR_OK = ["0532 123 45 67", "05321234567", "532 123 45 67", "+90 532 123 45 67", "905321234567", "+90 (532) 123-45-67"];

test("Türkiye: mevcut 05xx / 5xx / +90 / 90 biçimleri kabul ve API'ye YAZILDIĞI GİBİ gider", () => {
  for (const p of TR_OK) {
    assert.equal(isValidSenderPhone(p), true, p);
    assert.equal(isValidTRPhone(p), true, p);
    assert.equal(senderPhoneForApi(p), p, p);
  }
});

// Canlı denetimde reddedilen 13 numaranın tamamı + E.164'e dönüşüm.
const INTL: Array<[string, string]> = [
  ["+49 1512 3456789", "+4915123456789"], // Almanya
  ["+44 7700 900123", "+447700900123"], // İngiltere
  ["+1 212 555 0100", "+12125550100"], // ABD
  ["+1 (505) 555-0100", "+15055550100"], // ABD, TR ön ekine benzeyen alan kodu
  ["+33 6 12 34 56 78", "+33612345678"],
  ["+31 6 12345678", "+31612345678"],
  ["+994 50 123 45 67", "+994501234567"],
  ["+7 916 123-45-67", "+79161234567"],
  ["+971 50 123 4567", "+971501234567"],
  ["+86 138 0013 8000", "+8613800138000"],
  ["+81 90-1234-5678", "+819012345678"],
  ["+82 10-1234-5678", "+821012345678"],
  ["+39 312 345 6789", "+393123456789"],
  ["+34 612 34 56 78", "+34612345678"],
  ["+351 912 345 678", "+351912345678"],
  ["0049 1512 3456789", "+4915123456789"], // 00 uluslararası ön eki
  ["+49.1512.3456789", "+4915123456789"],
];

test("Uluslararası: +49, +44, +1 ve diğer ülkeler kabul; API'ye E.164 gider", () => {
  for (const [raw, e164] of INTL) {
    assert.equal(isValidSenderPhone(raw), true, raw);
    assert.equal(senderPhoneForApi(raw), e164, raw);
  }
});

test("Eksik, fazla uzun ve geçersiz numaralar reddedilir", () => {
  const bad = [
    "", "   ", "0532 123 45", "0532 123 45 678", "532 123", // eksik/fazla TR
    "+49 1234", "+1 555 01", // 8 haneden kısa
    "+49 1512 3456789 12345", // 15 haneden uzun
    "+90 212 555 00 00", "+90 532 123 45", "0090 212 555 0000", // TR ama cep değil / eksik
    "+0 123 456 789", // ülke kodu 0 olamaz
    "4915123456789", "447700900123", // ülke kodu var ama + / 00 yok
    "+49 1512 ABC 6789", "+44 7700 900123 ext 5", "++44 7700 900123", "+", "00",
  ];
  for (const p of bad) assert.equal(isValidSenderPhone(p), false, JSON.stringify(p));
  assert.equal(normalizeInternationalPhone("+90 532 123 45 67"), null, "TR numarası uluslararası yoldan geçmez");
});

test("API sözleşmesi: üretilen değer backend (7–30) ve PayTR user_phone (≤20) sınırına uyar", () => {
  for (const [raw] of INTL) {
    const v = senderPhoneForApi(raw);
    assert.ok(v.length >= 7 && v.length <= 20, `${raw} → ${v}`);
    assert.match(v, /^\+[1-9]\d{7,14}$/);
  }
  // En uzun izinli (15 hane) bile ≤ 20 karakter.
  assert.equal(senderPhoneForApi("+123 456 789 012 345").length, 16);
});

test("Checkout bağlantısı: gönderen kontrolü ve sipariş gövdesi yeni kuralı kullanır; alıcı telefonu değişmedi", () => {
  const src = readFileSync(new URL("../components/checkout/CheckoutWizard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, /isValidTRPhone\(/, "eski TR-only kontrol checkout'ta kalmamalı");
  assert.equal((src.match(/isValidSenderPhone\(senderPhone\)/g) ?? []).length, 2, "adım kapısı + gönderim kontrolü");
  assert.match(src, /customer_phone: senderPhoneForApi\(senderPhone\)/);
  assert.match(src, /recipient_phone: recipientPhone \|\| null/, "alıcı telefonu olduğu gibi gider");
  assert.match(src, /placeholder=\{t\("co\.phonePh"\)\}/);
});
