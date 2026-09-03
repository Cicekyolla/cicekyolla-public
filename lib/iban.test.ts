import test from "node:test";
import assert from "node:assert/strict";
import { isValidIban, normalizeIban, ibanPretty } from "./payment.ts";

/* Canlıdaki gerçek kayıt (03.09.2026): ülke ön eki DÜŞMÜŞ hâlde saklanıyor.
   Doğru IBAN mod-97 ile matematiksel olarak doğrulanabiliyor. */
const CANLI_KAYIT = "830006200020500006291174";        // 24 hane, TR eki yok
const DOGRU_IBAN = "TR830006200020500006291174";       // sağlaması GEÇEN tek varyant

test("mod-97: doğru IBAN geçerli, bozulmuş varyantlar geçersiz", () => {
  assert.equal(isValidIban(DOGRU_IBAN), true);
  assert.equal(isValidIban("TR840006200020500006291174"), false, "yanlış kontrol hanesi");
  assert.equal(isValidIban("TR830006200020500006291175"), false, "son hane değişti");
  assert.equal(isValidIban(CANLI_KAYIT), false, "ön eki olmayan değer IBAN değildir");
  assert.equal(isValidIban(""), false);
  assert.equal(isValidIban("TR83 0006 2000 2050 0006 2911 74"), true, "boşluklu doğru yazım kabul edilir");
});

test("normalizeIban: eksik TR ön eki YALNIZCA sağlama geçerse tamamlanır", () => {
  assert.equal(normalizeIban(CANLI_KAYIT), DOGRU_IBAN);
  assert.equal(normalizeIban("8300 0620 0020 5000 0629 1174"), DOGRU_IBAN, "boşluklu yazım");
});

test("normalizeIban: sağlama GEÇMEYEN 24 haneye ASLA TR eklenmez (tahmin yok)", () => {
  const uydurma = "123456789012345678901234"; // 24 hane ama TR+... sağlaması geçmez
  assert.equal(isValidIban(`TR${uydurma}`), false);
  assert.equal(normalizeIban(uydurma), uydurma, "değer olduğu gibi kalır");
});

test("normalizeIban: zaten doğru yazılmış IBAN'a dokunulmaz (çift ön ek yok)", () => {
  assert.equal(normalizeIban(DOGRU_IBAN), DOGRU_IBAN);
  assert.equal(normalizeIban("tr83 0006 2000 2050 0006 2911 74"), DOGRU_IBAN, "küçük harf + boşluk");
  assert.ok(!normalizeIban(DOGRU_IBAN).startsWith("TRTR"));
});

test("normalizeIban: yabancı IBAN'a müdahale edilmez", () => {
  const de = "DE89370400440532013000";
  assert.equal(isValidIban(de), true);
  assert.equal(normalizeIban(de), de);
});

test("ibanPretty: 4'lü gruplama + tamamlanmış ön ek", () => {
  assert.equal(ibanPretty(CANLI_KAYIT), "TR83 0006 2000 2050 0006 2911 74");
  assert.equal(ibanPretty(DOGRU_IBAN), "TR83 0006 2000 2050 0006 2911 74");
});

test("ibanPretty: boş/bozuk girdi çökertmez", () => {
  assert.equal(ibanPretty(""), "");
  assert.equal(normalizeIban(undefined as unknown as string), "");
});
