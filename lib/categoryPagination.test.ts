// lib/categoryPagination.test.ts — kategori sayfalama bağlantılarının regresyon testleri.
// Çalıştırma: node --test lib/categoryPagination.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCategoryPagination,
  categoryCanonicalPath,
  categoryListingState,
  categoryPageHref,
  categoryPageTitle,
  isCategoryPageBeyondLast,
  isCategoryPageWithoutListing,
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

// ---------------------------------------------------------------------------
// EK (inceleme düzeltmeleri): liste durumu yankıya bağlı değil; bilinmeyen durum;
// listesiz sayfa; numaralı bağlantılar; boş başlık.
// ---------------------------------------------------------------------------
test("liste durumu: karar API'nin sayfa numarasını yankılamasına BAĞLI DEĞİL (total > 0 gerçek yanıttır)", () => {
  // API numarayı kırparsa (page: 4) ya da hiç döndürmezse de son sayfanın ötesi 404'tür.
  assert.equal(categoryListingState(5, { page: 4, page_size: 50, total: 180, total_pages: 4 }), "beyond");
  assert.equal(categoryListingState(5, { page_size: 50, total: 180, total_pages: 4 }), "beyond");
  assert.equal(categoryListingState(999, { page: 1, page_size: 50, total: 180, total_pages: 4 }), "beyond");
  assert.equal(isCategoryPageBeyondLast(5, { page: 4, page_size: 50, total: 180, total_pages: 4 }), true);
  assert.equal(categoryListingState(4, { page: 1, page_size: 50, total: 180, total_pages: 4 }), "ok");
  assert.equal(categoryListingState(2, { page: 2, page_size: 50, total: 180, total_pages: 4 }), "ok");
  // total_pages yoksa total ÷ page_size; o da yoksa karar verilmez.
  assert.equal(categoryListingState(5, { page_size: 50, total: 180 }), "beyond");
  assert.equal(categoryListingState(4, { page_size: 50, total: 180 }), "ok");
  assert.equal(categoryListingState(5, { total: 180 }), "unknown");
});

test("liste durumu: yedek sayfa (okuma başarısız: page 1, total 0) ve liste yokluğu 'unknown' — 404 YOK", () => {
  // fetchProductsPaged hata hâlinde tam olarak bunu döndürür.
  const yedek = { page: 1, page_size: 50, total: 0, total_pages: 1 };
  assert.equal(categoryListingState(3, yedek), "unknown");
  assert.equal(isCategoryPageBeyondLast(3, yedek), false);
  assert.equal(categoryListingState(2, null), "unknown");
  assert.equal(categoryListingState(2, undefined), "unknown");
  assert.equal(categoryListingState(2, {}), "unknown");
  // Gerçekten boş kategori: yalnız API istenen sayfayı yankıladıysa bilinir → ötesi.
  assert.equal(categoryListingState(2, { page: 2, page_size: 50, total: 0, total_pages: 0 }), "beyond");
  assert.equal(categoryListingState(2, { page: 2, page_size: 50, total: 0, total_pages: 1 }), "beyond");
  // Sayfa 1 her koşulda "ok" (hiçbir zaman 404 / çıplak canonical kararı gerekmez).
  for (const p of [null, undefined, {}, yedek]) assert.equal(categoryListingState(1, p), "ok");
});

test("listesiz sayfa: kategori CANLI ağaçta yoksa sayfa ≥ 2 → 404; ağaç statik yedekse / sayfa 1 ise karar yok", () => {
  assert.equal(isCategoryPageWithoutListing(2, { liveTree: true, categoryId: null }), true);
  assert.equal(isCategoryPageWithoutListing(999999, { liveTree: true, categoryId: undefined }), true);
  assert.equal(isCategoryPageWithoutListing(2, { liveTree: false, categoryId: null }), false, "ağaç okunamadı → API kesintisi 404 üretmez");
  assert.equal(isCategoryPageWithoutListing(1, { liveTree: true, categoryId: null }), false, "1. sayfa (yalnız SEO kaydından çizilen sayfa) aynen");
  assert.equal(isCategoryPageWithoutListing(2, { liveTree: true, categoryId: 13 }), false);
});

test("numaralı bağlantılar: 20 sayfada 1 … p-1 p p+1 … son — son sayfa ilk sayfadan TEK adım", () => {
  const p = buildCategoryPagination("/kategori/guller", { sort: "price_asc" }, 1, 20);
  const sayfalar = p.pages.flatMap((it) => (it.kind === "page" ? [it.page] : []));
  assert.deepEqual(sayfalar, [1, 2, 20]);
  assert.deepEqual(p.pages.map((it) => it.kind), ["page", "page", "gap", "page"]);
  const son = p.pages[p.pages.length - 1];
  assert.deepEqual(son, { kind: "page", page: 20, href: "/kategori/guller?sort=price_asc&page=20", current: false });
  assert.deepEqual(p.pages[0], { kind: "page", page: 1, href: "/kategori/guller?sort=price_asc", current: true }, "1. sayfa bağlantısı page taşımaz");

  const orta = buildCategoryPagination("/kategori/guller", undefined, 10, 20);
  assert.deepEqual(orta.pages.map((it) => (it.kind === "page" ? it.page : "…")), [1, "…", 9, 10, 11, "…", 20]);
  assert.equal(orta.pages.filter((it) => it.kind === "page" && it.current).length, 1);
  assert.equal(new Set(orta.pages.map((it) => (it.kind === "gap" ? it.key : `p${it.page}`))).size, orta.pages.length, "React key'leri tekil");
  // Numaralı bağlantılar prev/next ile aynı href kuralından.
  const dokuz = orta.pages.find((it) => it.kind === "page" && it.page === 9);
  assert.equal(dokuz?.kind === "page" ? dokuz.href : null, "/kategori/guller?page=9");
  assert.equal(orta.prev?.href, "/kategori/guller?page=9");
});

test("numaralı bağlantılar: 7 sayfaya kadar hepsi; tek sayfada yalnız [1] (navigasyon basılmaz)", () => {
  assert.deepEqual(buildCategoryPagination("/k", undefined, 3, 6).pages.map((it) => (it.kind === "page" ? it.page : 0)), [1, 2, 3, 4, 5, 6]);
  const tek = buildCategoryPagination("/k", undefined, 1, 1);
  assert.deepEqual(tek.pages, [{ kind: "page", page: 1, href: "/k", current: true }]);
  assert.equal(tek.total, 1);
});

test("başlık: boş / null başlığa ' – Sayfa N' eklenmez ('null – Sayfa 2' üretilmez)", () => {
  assert.equal(categoryPageTitle("", 2), "");
  assert.equal(categoryPageTitle(null as unknown as string, 2), null);
  assert.equal(categoryPageTitle(undefined as unknown as string, 3), undefined);
});

test("KAYNAK: kategori sayfası listesiz / ötesi sayfada 404 verir, bilinmeyen durumda çıplak canonical; numaralı liste ızgaradan bağımsız basılır", () => {
  const landing = readFileSync(new URL("../components/category/CategoryLanding.tsx", import.meta.url), "utf8");
  assert.ok(landing.includes("if (isCategoryPageWithoutListing(pageNum, { liveTree: !!tree && tree !== CATEGORY_TREE_FALLBACK, categoryId })) notFound();"));
  assert.ok(landing.includes("if (isCategoryPageBeyondLast(pageNum, productPage?.pagination)) notFound();"));
  assert.ok(landing.includes("const pageNav = pagination.total > 1 ? ("), "liste toplam sayfa > 1 iken kurulur (ürün ızgarası koşuluna bağlı değil)");
  assert.equal(landing.split("{pageNav}").length - 1, 2, "ürünlü bölümde + ürünsüz (görselsiz sayfa) bölümde");
  assert.ok(landing.includes("{pagination.pages.map((it) =>"));
  assert.ok(landing.includes('<Link href={it.href} prefetch={false} aria-label={`Sayfa ${it.page}`}'), "numaralar gerçek bağlantı; ön-yükleme kapalı");
  assert.ok(landing.includes('<span aria-current="page"'));
  assert.ok(!/Sayfa \{pagination\.current\} \/ \{pagination\.total\}/.test(landing), "'Sayfa X / Y' yazısı yok (sonsuz kaydırmayla çelişmez)");

  const page = readFileSync(new URL("../app/kategori/[...slug]/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('const seoPage = pageNo > 1 && (await mainSeriesState(path, pageNo)) !== "ok" ? 1 : pageNo;'));
  assert.ok(page.includes("const title = categoryPageTitle(managedTitle(page) || page.title_tag, seoPage);"));
  assert.ok(page.includes("const canonicalPath = categoryCanonicalPath(path, seoPage);"));
  // Ana seri okuması CategoryLanding'in sıralamasız/filtresiz isteğiyle AYNI parametreler (istek içi tekilleştirme).
  assert.ok(page.includes('fetchProductsPaged({ category_id: categoryId, page_size: 50, page: pageNo, sort: "created_at_desc" })'));
  assert.ok(landing.includes("category_id: categoryId, page_size: 50, page: pageNum, sort,"));

  const grid = readFileSync(new URL("../components/category/CategoryProductGrid.tsx", import.meta.url), "utf8");
  assert.ok(grid.includes("startPage > 1 ? items.length : Math.max(total, items.length)"), "?page=N'de 'yüklendi' sayısı ekrandaki ürün sayısı");
});
