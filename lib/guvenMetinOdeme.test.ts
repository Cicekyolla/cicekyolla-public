// 6 Kas 2026 — işletme eksik analizi: kanıtlanamayan üstünlük iddiası kalkar, SSS ödeme cevabı somutlaşır.
// Kanıt: api paymentController PayTR iFrame (no_installment=1 → tek çekim); havale/EFT ödeme yolu canlı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("footer: 'en prestijli' iddiası yok; gerçeğe dayalı atölye cümlesi var", () => {
  const s = oku("../components/Footer.tsx");
  assert.doesNotMatch(s, /en prestijli/i);
  assert.ok(s.includes("Maltepe atölyemizden İstanbul'a aynı gün, Türkiye'ye kargo ile çiçek."));
});

test("SSS: ödeme cevabı somut (PayTR, 3D Secure, havale/EFT, tek çekim); boş cevap kalktı", () => {
  const s = oku("../app/sik-sorulan-sorular/page.tsx");
  assert.ok(s.includes("PayTR güvenli ödeme altyapısı"));
  assert.ok(s.includes("3D Secure") && s.includes("havale/EFT") && s.includes("tek çekimdir"));
  assert.doesNotMatch(s, /Aktif ödeme yöntemleri ödeme adımında güvenli biçimde gösterilir/);
  assert.doesNotMatch(s, /taksit imkân|taksitle ödeyebilirsiniz/i);
});
