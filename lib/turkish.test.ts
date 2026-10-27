// lib/turkish.test.ts — yonelme() zorunlu birim testleri (ADDITIVE).
// Çalıştırma: node --test lib/turkish.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { yonelme, ilgi, ilgiEki } from "./turkish.ts";

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

test("ilgi — İstanbul ilçeleri (canlıda 'in sabit ekiyle bozuk olanlar dahil)", () => {
  assert.equal(ilgi("Maltepe"), "Maltepe'nin");
  assert.equal(ilgi("Kadıköy"), "Kadıköy'ün");
  assert.equal(ilgi("Beşiktaş"), "Beşiktaş'ın");
  assert.equal(ilgi("Tuzla"), "Tuzla'nın");
  assert.equal(ilgi("Beykoz"), "Beykoz'un");
  assert.equal(ilgi("Beyoğlu"), "Beyoğlu'nun");
  assert.equal(ilgi("Beylikdüzü"), "Beylikdüzü'nün");
  assert.equal(ilgi("Üsküdar"), "Üsküdar'ın");
  assert.equal(ilgi("Şişli"), "Şişli'nin");
  assert.equal(ilgi("Zeytinburnu"), "Zeytinburnu'nun");
  assert.equal(ilgi("Esenyurt"), "Esenyurt'un");
  assert.equal(ilgi("Kağıthane"), "Kağıthane'nin");
});

test("ilgi — 'in eki doğru kalan ilçeler değişmez", () => {
  for (const ad of ["Ataşehir", "Başakşehir", "Esenler", "Fatih", "Güngören", "Pendik", "Sarıyer", "Bahçelievler"]) {
    assert.equal(ilgi(ad), `${ad}'in`);
  }
});

test("ilgi — kenar durumlar", () => {
  assert.equal(ilgiEki("  Ankara "), "'nın");
  assert.equal(ilgi("Çorum"), "Çorum'un");
  assert.equal(ilgiEki("XYZ"), "'in");
});
