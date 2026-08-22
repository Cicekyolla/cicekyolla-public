// lib/managedSeoContent.test.ts — operatör-onaylı içerik kapısının testleri.
// Çalıştırma: node --test lib/managedSeoContent.test.ts  (npm run test:unit)
//
// REGRESYON GARANTİSİ: bugün yayındaki lokasyon sayfalarının içerik kaynağı
// NULL (057 envanteri) veya 'ai-content' — bu testler o durumlarda kapının
// KAPALI kaldığını (null → şablon davranışı birebir sürer) kanıtlar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOperatorManaged, managedTitle, managedDescription, managedH1 } from "./managedSeoContent.ts";

const base = {
  title_tag: "Kızılay Çiçek Gönder",
  meta_description: "Kızılay'a aynı gün çiçek gönder.",
  h1: "Kızılay Çiçek Gönder",
};

test("kapı KAPALI: source NULL (057 envanter şablonu) → tüm alanlar null, canlı davranış değişmez", () => {
  const page = { ...base, content_source: null };
  assert.equal(managedTitle(page), null);
  assert.equal(managedDescription(page), null);
  assert.equal(managedH1(page), null);
});

test("kapı KAPALI: source undefined (eski API cevabı) → null", () => {
  const page = { ...base, content_source: undefined };
  assert.equal(managedTitle(page), null);
});

test("kapı KAPALI: otomatik AI üretimi (ai-content) operatör sayılmaz", () => {
  assert.equal(isOperatorManaged("ai-content"), false);
  assert.equal(isOperatorManaged("ai"), false);
  assert.equal(isOperatorManaged("template"), false);
});

test("kapı AÇIK: seo-merkezi / haiku-approved / manual / restore", () => {
  for (const src of ["seo-merkezi", "haiku-approved", "manual", "restore"]) {
    const page = { ...base, content_source: src };
    assert.equal(managedTitle(page), "Kızılay Çiçek Gönder", src);
    assert.equal(managedDescription(page), "Kızılay'a aynı gün çiçek gönder.", src);
    assert.equal(managedH1(page), "Kızılay Çiçek Gönder", src);
  }
});

test("kapı AÇIK ama alan boş → o alan null (şablon o alan için sürer)", () => {
  const page = { content_source: "seo-merkezi", title_tag: "  ", meta_description: "", h1: "Gerçek H1" };
  assert.equal(managedTitle(page), null);
  assert.equal(managedDescription(page), null);
  assert.equal(managedH1(page), "Gerçek H1");
});
