// lib/categoryPagination.test.ts — kategori sayfalama bağlantılarının regresyon testleri.
// Çalıştırma: node --test lib/categoryPagination.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCategoryPagination,
  categoryCanonicalPath,
  categoryPageHref,
  categoryPageTitle,
  isCategoryPageBeyondLast,
  parseCategoryPageParam,
} from "./categoryPagination.ts";

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

// ---------------------------------------------------------------------------
// EK (SEO YAYIN ZİNCİRİ): her sayfa kendi canonical'ı + başlığı; geçersiz sayfa 404.
// ---------------------------------------------------------------------------
test("parseCategoryPageParam: parametre yok → 1; pozitif tam sayı → kendisi", () => {
  assert.equal(parseCategoryPageParam(undefined), 1);
  assert.equal(parseCategoryPageParam("1"), 1);
  assert.equal(parseCategoryPageParam("2"), 2);
  assert.equal(parseCategoryPageParam("37"), 37);
});

test("parseCategoryPageParam: pozitif tam sayı olmayan her şey null (rota 404 verir)", () => {
  for (const bad of ["0", "-1", "1.5", "abc", "", " 2", "2 ", "02", "1e3", "2abc", "9999999", "NaN", "Infinity"]) {
    assert.equal(parseCategoryPageParam(bad), null, JSON.stringify(bad));
  }
  assert.equal(parseCategoryPageParam(["2", "3"]), null, "yinelenen parametre");
  assert.equal(parseCategoryPageParam([]), null);
});

test("canonical: sayfa 1 çıplak yol (bugünkü hâl); N ≥ 2 → YALNIZ ?page=N", () => {
  assert.equal(categoryCanonicalPath("/kategori/guller", 1), "/kategori/guller");
  assert.equal(categoryCanonicalPath("/kategori/guller", 2), "/kategori/guller?page=2");
  assert.equal(categoryCanonicalPath("/kategori/cicekler/guller", 14), "/kategori/cicekler/guller?page=14");
  // sort/filtre parametresi canonical'a hiçbir yoldan giremez (imza yalnız yol + sayfa alır).
  assert.ok(!categoryCanonicalPath("/kategori/guller", 3).includes("sort"));
});

test("başlık: sayfa 1 aynen; N ≥ 2 → ' – Sayfa N' eki", () => {
  assert.equal(categoryPageTitle("Güller", 1), "Güller");
  assert.equal(categoryPageTitle("Güller", 2), "Güller – Sayfa 2");
  assert.equal(categoryPageTitle("Orkide Siparişi ve Çeşitleri", 11), "Orkide Siparişi ve Çeşitleri – Sayfa 11");
});

test("son sayfanın ötesi: API o sayfayı yankıladıysa ve toplamı aşıyorsa true", () => {
  assert.equal(isCategoryPageBeyondLast(12, { page: 12, total_pages: 11 }), true);
  assert.equal(isCategoryPageBeyondLast(2, { page: 2, total_pages: 1 }), true, "tek sayfalık / boş kategori");
  assert.equal(isCategoryPageBeyondLast(999, { page: 999, total_pages: 3 }), true);
});

test("son sayfa ve öncesi geçerli; sayfa 1 hiçbir koşulda 404 olmaz", () => {
  assert.equal(isCategoryPageBeyondLast(11, { page: 11, total_pages: 11 }), false);
  assert.equal(isCategoryPageBeyondLast(2, { page: 2, total_pages: 11 }), false);
  assert.equal(isCategoryPageBeyondLast(1, { page: 1, total_pages: 1 }), false);
  assert.equal(isCategoryPageBeyondLast(1, { page: 1, total_pages: 0 }), false);
  assert.equal(isCategoryPageBeyondLast(1, null), false);
});

test("FAIL-OPEN: API okunamadıysa (yedek sayfa page=1 taşır / liste yok) geçerli ?page=N 404'e ÇEVRİLMEZ", () => {
  // fetchProductsPaged hata hâlinde { page: 1, total: 0, total_pages: 1 } döndürür.
  assert.equal(isCategoryPageBeyondLast(5, { page: 1, total_pages: 1 }), false);
  assert.equal(isCategoryPageBeyondLast(5, null), false);
  assert.equal(isCategoryPageBeyondLast(5, undefined), false);
  assert.equal(isCategoryPageBeyondLast(5, {}), false);
});
