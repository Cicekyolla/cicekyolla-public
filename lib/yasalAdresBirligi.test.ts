// 6 Kas 2026 — NAP birliği: sözleşme + KVKK adresi site/şema/Google İşletme Profili ile aynı (sahip teyidi: No 37-A, Adalı Sk.).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const ADRES = "Altayçeşme Mah. Adalı Sk. No: 37 A, 34843 Maltepe / İstanbul";

test("yasal metinler: tek adres biçimi; 'Atatürk Caddesi' kalmadı", () => {
  for (const f of ["../app/kvkk/page.tsx", "../app/mesafeli-satis-sozlesmesi/page.tsx"]) {
    const s = oku(f);
    assert.ok(s.includes(ADRES), f);
    assert.doesNotMatch(s, /Atatürk Cad/, f);
  }
});
