// lib/llmsOdeme.test.ts — 11 Kas 2026 (ADDITIVE): llms.txt ödeme ve teslimat ifadeleri.
// Çalıştırma: node --test lib/llmsOdeme.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("llms.txt: kapalı ödeme sağlayıcısı (iyzico) anılmaz; PayTR + 3-D Secure + TRY + havale doğru", () => {
  const t = oku("public/llms.txt");
  assert.doesNotMatch(t, /iyzico/i, "iyzico kapalı (fallback_enabled:false) — metinde olmamalı");
  const intl = t.slice(t.indexOf("## International customers"));
  assert.match(intl, /via PayTR with 3-D Secure/);
  assert.match(intl, /Turkish lira \(TRY\)/);
  assert.match(intl, /Bank transfer \(EFT\)/);
  assert.match(t, /- Ödeme: kredi ve banka kartı \(PayTR, 3D Secure\) veya havale\/EFT; tahsilat Türk lirası/);
});

test("llms.txt: 'saatlik' belirsiz vaadi yok; 13 dil ve otel/hastane bağları korunur", () => {
  const t = oku("public/llms.txt");
  assert.doesNotMatch(t, /saatlik/i);
  for (const l of ["en", "de", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"]) {
    assert.ok(t.includes(`https://www.cicekyolla.com.tr/${l}/`), `dil bağı: ${l}`);
  }
  assert.ok(t.includes("/en/hotel-delivery") && t.includes("/en/hospital-delivery"));
});
