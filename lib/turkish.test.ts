// lib/turkish.test.ts — yonelme() zorunlu birim testleri (ADDITIVE).
// Çalıştırma: node --test lib/turkish.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { yonelme } from "./turkish.ts";

test("yonelme — zorunlu örnekler", () => {
  assert.equal(yonelme("Ankara"), "Ankara'ya");
  assert.equal(yonelme("Beşiktaş"), "Beşiktaş'a");
  assert.equal(yonelme("Şişli"), "Şişli'ye");
  assert.equal(yonelme("Kadıköy"), "Kadıköy'e");
  assert.equal(yonelme("İzmir"), "İzmir'e");
  assert.equal(yonelme("Maltepe"), "Maltepe'ye");
  assert.equal(yonelme("Üsküdar"), "Üsküdar'a");
  assert.equal(yonelme("Bursa"), "Bursa'ya");
  assert.equal(yonelme("Kartal"), "Kartal'a");
  assert.equal(yonelme("Çorum"), "Çorum'a");
});

test("yonelme — ISTISNALAR tablosu (Beyoğlu iyelik ekiyle biter)", () => {
  assert.equal(yonelme("Beyoğlu"), "Beyoğlu'na");
});

test("yonelme — sık kullanılan diğer ilçe/il adları (gerçek üretimde kullanılacak)", () => {
  assert.equal(yonelme("Sarıyer"), "Sarıyer'e");
  assert.equal(yonelme("Fatih"), "Fatih'e");
  assert.equal(yonelme("Silivri"), "Silivri'ye");
  assert.equal(yonelme("Kütahya"), "Kütahya'ya");
  assert.equal(yonelme("Adana"), "Adana'ya");
  assert.equal(yonelme("Muğla"), "Muğla'ya");
});
