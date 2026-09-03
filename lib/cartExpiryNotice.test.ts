import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* --------------------------------------------------------------------------
 * Sepet süre-aşımı BİLDİRİMİ birikimli olmalı.
 *
 * Temizlik İKİ turda çalışır: (1) tarayıcı saati + 60 dk emniyet payı ile
 * ihtiyatlı tur, (2) /api/now ile sunucuya demirlenmiş kesin tur. Bildirim
 * ezilirse müşteri 3 satır kaybedip "1 ürün kaldırıldı" okur — canlı
 * read-back'te (03.09.2026, İstanbul 23:00) tam olarak bu görüldü.
 * ------------------------------------------------------------------------ */

const CART = readFileSync(join(process.cwd(), "lib/cart.tsx"), "utf8");

test("bildirim ezilmez, önceki turun üstüne EKLENİR", () => {
  assert.match(CART, /setExpiredNotice\(\(prev\) => \(prev/);
  assert.match(CART, /count: prev\.count \+ fresh\.length/);
  assert.match(CART, /names: \[\.\.\.prev\.names, \.\.\.fresh\.map\(\(row\) => row\.name\)\]/);
});

test("aynı satır iki kez sayılmaz (noticeSeen kapısı korunuyor)", () => {
  assert.match(CART, /const fresh = expired\.filter\(\(row\) => !noticeSeen\.current\.has\(row\.key\)\)/);
  assert.match(CART, /for \(const row of fresh\) noticeSeen\.current\.add\(row\.key\)/);
});

test("kapatınca bildirim tamamen sıfırlanır", () => {
  assert.match(CART, /dismissExpiredNotice\(\) \{ setExpiredNotice\(null\); \}/);
});

/** Birikim mantığının kendisi (React'sız, saf simülasyon). */
function birikim(
  onceki: { count: number; names: string[] } | null,
  fresh: string[],
): { count: number; names: string[] } {
  return onceki
    ? { count: onceki.count + fresh.length, names: [...onceki.names, ...fresh] }
    : { count: fresh.length, names: fresh };
}

test("iki turlu temizlikte toplam sayı ve adlar doğru", () => {
  const tur1 = birikim(null, ["DÜN", "BUGÜN GEÇMİŞ"]);
  assert.deepEqual(tur1, { count: 2, names: ["DÜN", "BUGÜN GEÇMİŞ"] });
  const tur2 = birikim(tur1, ["BUGÜN SLOT BİTTİ"]);
  assert.equal(tur2.count, 3);
  assert.deepEqual(tur2.names, ["DÜN", "BUGÜN GEÇMİŞ", "BUGÜN SLOT BİTTİ"]);
});

test("tek turda davranış değişmedi", () => {
  assert.deepEqual(birikim(null, ["TEK"]), { count: 1, names: ["TEK"] });
});
