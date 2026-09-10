// lib/categoryPagination.test.ts — kategori sayfalama bağlantılarının regresyon testleri.
// Çalıştırma: node --test lib/categoryPagination.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { buildCategoryPagination, categoryPageHref } from "./categoryPagination.ts";

test("sayfa 1 → kök yol (?page=1 ikiz URL üretilmez)", () => {
  assert.equal(categoryPageHref("/kategori/guller", undefined, 1), "/kategori/guller");
  assert.equal(categoryPageHref("/kategori/guller", { page: "3" }, 1), "/kategori/guller");
});

test("sayfa N → ?page=N; mevcut parametreler korunur, page en sonda", () => {
  assert.equal(categoryPageHref("/kategori/guller", undefined, 2), "/kategori/guller?page=2");
  assert.equal(
    categoryPageHref("/kategori/guller", { sort: "price_asc", same_day: "1", page: "9" }, 4),
    "/kategori/guller?sort=price_asc&same_day=1&page=4",
  );
});

test("dizi/boş parametreler yok sayılır (yalnız string değerler taşınır)", () => {
  assert.equal(categoryPageHref("/kategori/guller", { type: ["a", "b"], q: "" }, 2), "/kategori/guller?page=2");
});

test("ilk sayfada yalnız sonraki, son sayfada yalnız önceki bağlantı vardır", () => {
  const ilk = buildCategoryPagination("/kategori/guller", undefined, 1, 11);
  assert.equal(ilk.prev, null);
  assert.deepEqual(ilk.next, { page: 2, href: "/kategori/guller?page=2" });

  const son = buildCategoryPagination("/kategori/guller", undefined, 11, 11);
  assert.deepEqual(son.prev, { page: 10, href: "/kategori/guller?page=10" });
  assert.equal(son.next, null);
});

test("orta sayfa: önceki 1 ise kök yol, sonraki ?page=3", () => {
  const p = buildCategoryPagination("/kategori/guller", { sort: "name_asc" }, 2, 11);
  assert.deepEqual(p.prev, { page: 1, href: "/kategori/guller?sort=name_asc" });
  assert.deepEqual(p.next, { page: 3, href: "/kategori/guller?sort=name_asc&page=3" });
});

test("tek sayfalık kategoride bağlantı yok (bugünkü SSR çıktısı değişmez)", () => {
  const p = buildCategoryPagination("/kategori/yucca", undefined, 1, 1);
  assert.equal(p.prev, null);
  assert.equal(p.next, null);
});

test("aralık dışı sayfa numarası sıkıştırılır (0, NaN, toplamdan büyük)", () => {
  assert.equal(buildCategoryPagination("/k", undefined, 0, 5).current, 1);
  assert.equal(buildCategoryPagination("/k", undefined, Number.NaN, 5).current, 1);
  assert.equal(buildCategoryPagination("/k", undefined, 99, 5).current, 5);
  assert.equal(buildCategoryPagination("/k", undefined, 3, 0).total, 1);
});
