// lib/guvenceKosullari.test.ts — 12 Kas 2026 (ADDITIVE): sahip kararıyla güvence metinlerinin koşulları.
// Kararlar: fotoğraf İSTEK ÜZERİNE; iade YALNIZ teslim edilemezse, AYNI GÜN BAŞLATILIR (hesaba geçiş bankaya bağlı);
// Western Union WhatsApp'tan ayarlanır; havale / EFT ödeme adımında seçilir (13 Kas 2026: checkout'ta 14 dilde mevcut).
// Hizmetler korunur, yalnız vaat koşula uyar.
// Çalıştırma: node --test lib/guvenceKosullari.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOBAL_LOCALES } from "./global/config.ts";

const src = readFileSync(new URL("./global/assuranceCopy.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const block = (l: string) => {
  const m = new RegExp(`\\n\\s*${l}: \\{`).exec(src);
  assert.ok(m, `blok ${l}`);
  return src.slice(m.index, src.indexOf("\n  },", m.index + 1));
};
const line = (l: string, k: string) => (new RegExp(`\\n\\s*${k}: \\[(.*)\\],`).exec(block(l)) ?? [])[1] ?? "";

test("13 dil: üç madde var; Western Union korunur ve WhatsApp'a yönlendirilir; iyzico yok", () => {
  const wa = /WhatsApp|واتساب/;
  const wu = /Western Union|ويسترن يونيون|西联|웨스턴유니온/;
  for (const l of GLOBAL_LOCALES) {
    for (const k of ["pay", "photo", "refund"]) assert.ok(line(l, k).length > 20, `${l} ${k}`);
    assert.match(line(l, "pay"), wu, `${l}: Western Union korunur`);
    assert.match(line(l, "pay"), wa, `${l}: Western Union WhatsApp'tan ayarlanır`);
    assert.match(line(l, "photo"), wa, `${l}: foto WhatsApp'tan`);
    assert.doesNotMatch(block(l), /iyzico/i, l);
  }
});

test("EN: fotoğraf istek üzerine; iade yalnız teslim edilemezse, aynı gün başlatılır, banka süresi belirtilir", () => {
  assert.match(line("en", "photo"), /Just ask/);
  assert.doesNotMatch(line("en", "photo"), /We send you a photo/, "koşulsuz vaat kalmadı");
  const r = line("en", "refund");
  assert.match(r, /can't deliver/i);
  assert.match(r, /start your refund the same day/);
  assert.match(r, /bank's timeline/);
  assert.doesNotMatch(r, /any problem/i, "koşulsuz 'her sorunda' vaadi kalmadı");
  assert.doesNotMatch(line("en", "pay"), /any card/i, "'her kart' abartısı kalmadı");
});

test("diğer dillerde eski koşulsuz ifadeler kalmadı (örnek: de/fr/ru/ja)", () => {
  assert.doesNotMatch(line("de", "refund"), /Gibt es ein Problem/);
  assert.match(line("de", "photo"), /Auf Wunsch/);
  assert.doesNotMatch(line("fr", "refund"), /En cas de problème/);
  assert.match(line("fr", "photo"), /Sur simple demande/);
  assert.doesNotMatch(line("ru", "refund"), /возникла проблема/);
  assert.match(line("ja", "photo"), /ご希望/);
});


test("13 dil: havale / EFT ödeme adımında seçilir; checkout etiketiyle aynı ad, WhatsApp'a gönderilmez", () => {
  const label: Record<string, string> = {
    en: "Bank Transfer", de: "Überweisung", fr: "Virement bancaire", nl: "Bankoverschrijving", it: "Bonifico bancario", es: "Transferencia bancaria",
    pt: "Transferência bancária", az: "Bank köçürməsi", ru: "Банковский перевод", ar: "تحويل بنكي", zh: "银行转账", ja: "銀行振込", ko: "계좌이체",
  };
  for (const l of GLOBAL_LOCALES) {
    const pay = line(l, "pay");
    assert.ok(pay.includes(label[l]), `${l}: checkout etiketi geçer`);
    const dict = readFileSync(new URL(`./i18n/dict/${l}.ts`, import.meta.url), "utf8");
    assert.ok(dict.includes(`"co.pay.bank": "${label[l]}"`), `${l}: etiket checkout sözlüğüyle aynı`);
  }
  assert.doesNotMatch(line("en", "pay"), /bank transfer or Western Union\? Message us on WhatsApp/);
});
