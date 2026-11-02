// PDP satın alma kapısı — 23 Eyl 2026 denetimi.
// Kanıt: canlı mobil ölçümde ana CTA sunucudan `disabled` geliyordu; teslimat
// planlayıcı y=754, ölü düğme y=2268 (3 ekran aşağıda). Trafiğin %85'i mobil.
// Kural: düğme TIKLANABİLİR olacak ama teslimat seçilmeden sepete YAZMAYACAK.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(join(import.meta.dirname, "..", "components/product/ProductDetail.tsx"), "utf8");

test("ana satın alma düğmesi ölü değil: teslimat yoksa planlayıcıya götürür", () => {
  // Ana CTA'da `disabled={!deliverySelection}` KALMADI.
  assert.doesNotMatch(SRC, /disabled=\{!deliverySelection\}/, "ana CTA artık disabled olmamalı");
  // Teslimat yoksa planlayıcıya kaydırma davranışı var.
  const kapi = /if \(!deliverySelection\) \{\s*\n\s*document\.getElementById\("cy-teslimat-planlayici"\)\?\.scrollIntoView/;
  assert.match(SRC, kapi, "teslimat seçilmemişken planlayıcıya kaydırmalı");
});

test("FAIL-CLOSED korunur: teslimat seçilmeden sepete yazılmaz", () => {
  // addItem çağrıları yalnız deliverySelection doğruyken yapılır.
  const cagrilar = [...SRC.matchAll(/addItem\(\{[\s\S]{0,400}?\}, quantity\)/g)];
  assert.ok(cagrilar.length >= 2, "masaüstü + mobil olmak üzere en az iki çağrı var");
  for (const c of cagrilar) {
    const once = SRC.slice(Math.max(0, c.index - 320), c.index);
    assert.match(once, /if \(!deliverySelection\)/, "her addItem öncesinde teslimat kapısı olmalı");
    assert.match(c[0], /delivery: deliverySelection/, "sepete yazılan satır teslimat taşımalı");
  }
});

test("düğme metni duruma göre değişir (ölü gri kutu yerine yönlendirme)", () => {
  assert.match(SRC, /deliverySelection \? t\("pdp\.order"\) : t\("pdp\.planDelivery"\)/);
  // Mobil alt çubuk zaten aynı davranışı kullanıyordu; iki yol da aynı kapıya bakar.
  // 1 çıpa tanımı + masaüstü CTA'da aria bağı + masaüstü ve mobil kaydırma çağrıları.
  assert.equal((SRC.match(/cy-teslimat-planlayici/g) ?? []).length, 4, "çıpa: 1 tanım + 1 aria + 2 kaydırma");
});
