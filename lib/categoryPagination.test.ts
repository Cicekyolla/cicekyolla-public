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
  categoryPageList,
  categoryPageTitle,
  isCategoryPageBeyondLast,
  isCategoryPageWithoutListing,
  isCategoryWithoutListing,
  isConfirmedEmptyCategory,
  isConfirmedEmptyListing,
  parseCategoryPageParam,
  CATEGORY_FULL_PAGE_LIST_MAX,
  CATEGORY_PAGE_STEP,
  CATEGORY_PAGE_WINDOW,
  EMPTY_CATEGORY_ROBOTS,
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

// EK (TAM NUMARALI LİSTE): 40 sayfaya kadar HER sayfa numarası bağlantı — önceki kompakt liste
// (1 … p-1 p p+1 … son) 22 sayfalık kategoride orta sayfaları birkaç adım uzakta bırakıyordu.
test("numaralı bağlantılar: 20 sayfada HER sayfa listelenir (boşluk yok) — her sayfa her sayfadan TEK adım", () => {
  const p = buildCategoryPagination("/kategori/guller", { sort: "price_asc" }, 1, 20);
  const sayfalar = p.pages.flatMap((it) => (it.kind === "page" ? [it.page] : []));
  assert.deepEqual(sayfalar, Array.from({ length: 20 }, (_, i) => i + 1));
  assert.ok(p.pages.every((it) => it.kind === "page"), "40 sayfaya kadar '…' yok");
  const son = p.pages[p.pages.length - 1];
  assert.deepEqual(son, { kind: "page", page: 20, href: "/kategori/guller?sort=price_asc&page=20", current: false });
  assert.deepEqual(p.pages[0], { kind: "page", page: 1, href: "/kategori/guller?sort=price_asc", current: true }, "1. sayfa bağlantısı page taşımaz");

  const orta = buildCategoryPagination("/kategori/guller", undefined, 10, 20);
  assert.deepEqual(orta.pages.map((it) => (it.kind === "page" ? it.page : "…")), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(orta.pages.filter((it) => it.kind === "page" && it.current).length, 1);
  assert.equal(new Set(orta.pages.map((it) => (it.kind === "gap" ? it.key : `p${it.page}`))).size, orta.pages.length, "React key'leri tekil");
  // Numaralı bağlantılar prev/next ile aynı href kuralından.
  const dokuz = orta.pages.find((it) => it.kind === "page" && it.page === 9);
  assert.equal(dokuz?.kind === "page" ? dokuz.href : null, "/kategori/guller?page=9");
  assert.equal(orta.prev?.href, "/kategori/guller?page=9");
});

test("categoryPageList: toplam ≤ 40 → 1 … toplam, hepsi; sınır tam 40'ta (en büyük kategori 31 sayfa)", () => {
  assert.equal(CATEGORY_FULL_PAGE_LIST_MAX, 40);
  for (const toplam of [1, 2, 7, 8, 22, 31, 40]) {
    for (const gecerli of [1, Math.ceil(toplam / 2), toplam]) {
      assert.deepEqual(categoryPageList(gecerli, toplam), Array.from({ length: toplam }, (_, i) => i + 1), `${gecerli}/${toplam}`);
    }
  }
  // Aralık dışı girdiler sıkıştırılır.
  assert.deepEqual(categoryPageList(99, 3), [1, 2, 3]);
  assert.deepEqual(categoryPageList(Number.NaN, 0), [1]);
  assert.deepEqual(categoryPageList(1, Number.NaN), [1]);
});

test("categoryPageList: toplam > 40 → pencere + ilk + son + HER 10. sayfa; boşluklar '…'", () => {
  assert.deepEqual(categoryPageList(1, 41), [1, 2, 3, 4, 5, 6, "gap", 10, "gap", 20, "gap", 30, "gap", 40, 41]);
  assert.deepEqual(
    categoryPageList(25, 60),
    [1, "gap", 10, "gap", 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, "gap", 40, "gap", 50, "gap", 60],
  );
  assert.deepEqual(categoryPageList(60, 60), [1, "gap", 10, "gap", 20, "gap", 30, "gap", 40, "gap", 50, "gap", 55, 56, 57, 58, 59, 60]);
  // Tek sayfalık boşluk "…" yerine sayfanın kendisiyle doldurulur (8 ile 10 arasındaki 9).
  assert.deepEqual(categoryPageList(3, 45).slice(0, 11), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "gap"]);
  for (const [gecerli, toplam] of [[1, 41], [17, 53], [44, 44], [70, 137], [100, 250]] as const) {
    const liste = categoryPageList(gecerli, toplam);
    const sayfalar = liste.filter((n): n is number => n !== "gap");
    assert.ok(sayfalar.includes(1) && sayfalar.includes(toplam), "ilk + son");
    for (let n = CATEGORY_PAGE_STEP; n < toplam; n += CATEGORY_PAGE_STEP) assert.ok(sayfalar.includes(n), `her 10. sayfa: ${n} (${gecerli}/${toplam})`);
    for (let n = Math.max(1, gecerli - CATEGORY_PAGE_WINDOW); n <= Math.min(toplam, gecerli + CATEGORY_PAGE_WINDOW); n++) assert.ok(sayfalar.includes(n), `pencere: ${n}`);
    assert.deepEqual(sayfalar, [...new Set(sayfalar)].sort((a, b) => a - b), "artan, tekrarsız");
    assert.ok(!liste.some((n, i) => n === "gap" && liste[i + 1] === "gap"), "art arda iki boşluk yok");
  }
});

test("categoryPageList: uzun seride HER sayfa en çok İKİ adımda (herhangi bir sayfa → 10'luk sayfa → hedef)", () => {
  for (const toplam of [41, 47, 49, 60, 137]) {
    const birAdim = (kaynak: number) => new Set(categoryPageList(kaynak, toplam).filter((n): n is number => n !== "gap"));
    for (const kaynak of [1, Math.ceil(toplam / 2), toplam]) {
      const ilk = birAdim(kaynak);
      const iki = new Set<number>(ilk);
      for (const ara of ilk) for (const n of birAdim(ara)) iki.add(n);
      for (let hedef = 1; hedef <= toplam; hedef++) assert.ok(iki.has(hedef), `${kaynak} → ${hedef} (toplam ${toplam})`);
    }
  }
});

test("numaralı bağlantılar: 41+ sayfada model boşluk + bağlantı taşır; geçerli sayfa tek ve bağlantıları href kuralından", () => {
  const p = buildCategoryPagination("/kategori/cicekler", undefined, 25, 60);
  assert.deepEqual(
    p.pages.map((it) => (it.kind === "page" ? it.page : "…")),
    [1, "…", 10, "…", 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, "…", 40, "…", 50, "…", 60],
  );
  assert.equal(p.pages.filter((it) => it.kind === "page" && it.current).length, 1);
  assert.equal(new Set(p.pages.map((it) => (it.kind === "gap" ? it.key : `p${it.page}`))).size, p.pages.length, "React key'leri tekil");
  const kirk = p.pages.find((it) => it.kind === "page" && it.page === 40);
  assert.equal(kirk?.kind === "page" ? kirk.href : null, "/kategori/cicekler?page=40");
  assert.deepEqual(p.prev, { page: 24, href: "/kategori/cicekler?page=24" });
  assert.deepEqual(p.next, { page: 26, href: "/kategori/cicekler?page=26" });
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
  // EK (TEK KATEGORİ SIRASI): ikisi de varsayılan sırayı (CATEGORY_DEFAULT_SORT) ister.
  assert.ok(page.includes("fetchProductsPaged({ category_id: categoryId, page_size: 50, page: pageNo, sort: CATEGORY_DEFAULT_SORT })"));
  assert.ok(landing.includes("category_id: categoryId, page_size: 50, page: pageNum, sort,"));
  assert.ok(landing.includes("const sort = categorySortOf(searchParams?.sort);"));
  // EK (TAM NUMARALI LİSTE): numara listesi satıra sığmazsa sarar; önceki / sonraki bağlantıları rel taşır.
  assert.ok(landing.includes('<ol className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1">'));
  assert.ok(landing.includes('<Link href={pagination.prev.href} rel="prev" prefetch={false}'));
  assert.ok(landing.includes('<Link href={pagination.next.href} rel="next" prefetch={false}'));

  const grid = readFileSync(new URL("../components/category/CategoryProductGrid.tsx", import.meta.url), "utf8");
  assert.ok(grid.includes("startPage > 1 ? items.length : Math.max(total, items.length)"), "?page=N'de 'yüklendi' sayısı ekrandaki ürün sayısı");
});

// ---------------------------------------------------------------------------
// EK (KATEGORİ YASASI): "kategori sayfası yalnız en az bir aktif ürün listelediği sürece
// index'e değerdir" — boş kategori noindex,follow; bilinmeyen durumda karar yok.
// ---------------------------------------------------------------------------
test("isConfirmedEmptyListing: yalnız API GERÇEKTEN yanıt verdi + total 0 + satır yok → true", () => {
  const sayfa = (total: unknown) => ({ page: 1, page_size: 50, total, total_pages: 1 });
  assert.equal(isConfirmedEmptyListing({ answered: true, items: [], pagination: sayfa(0) }), true);
  assert.equal(isConfirmedEmptyListing({ answered: true, items: [], pagination: sayfa("0") }), true, "sayım metin olarak gelse de");
  assert.equal(isConfirmedEmptyListing({ answered: true, pagination: sayfa(0) }), true, "items alanı yok");
});

test("isConfirmedEmptyListing: FAIL-OPEN — okuma başarısız / bilinmeyen / dolu liste → false (bugünkü robots)", () => {
  // fetchProductsPaged hata hâlinde tam olarak bunu döndürür (`answered` YOK).
  const yedek = { items: [], pagination: { page: 1, page_size: 50, total: 0, total_pages: 1 } };
  assert.equal(isConfirmedEmptyListing(yedek), false, "yedek sayfa 'kategori boş' demek değildir");
  assert.equal(isConfirmedEmptyListing(null), false);
  assert.equal(isConfirmedEmptyListing(undefined), false);
  assert.equal(isConfirmedEmptyListing({ answered: true, items: [] }), false, "pagination yok");
  assert.equal(isConfirmedEmptyListing({ answered: true, items: [], pagination: null }), false);
  for (const total of [undefined, null, "", "abc", Number.NaN, -1, 1, 37, "12"]) {
    assert.equal(isConfirmedEmptyListing({ answered: true, items: [], pagination: { total } }), false, String(total));
  }
  // total 0 dense de satır geldiyse çelişki var → karar verilmez.
  assert.equal(isConfirmedEmptyListing({ answered: true, items: [{ id: 1 }], pagination: { total: 0 } }), false);
  // `answered` yalnız kesin true iken sayılır.
  for (const answered of [false, undefined, 1, "true"]) {
    assert.equal(isConfirmedEmptyListing({ answered, items: [], pagination: { total: 0 } }), false, String(answered));
  }
});

test("boş kategorinin robots değeri: noindex, follow", () => {
  assert.deepEqual(EMPTY_CATEGORY_ROBOTS, { index: false, follow: true });
});

// EK: "kategori boş" kararı yalnız 1. sayfanın yanıtıyla verilir. Liste ucu `total`'ı satırlardan sayar
// (COUNT(*) OVER()): son sayfanın ötesindeki sayfa DOLU kategoride de total 0 + satırsız döner.
test("isConfirmedEmptyCategory: yalnız 1. sayfanın yanıtı kanıttır — son sayfanın ötesindeki 'total 0' kategoriyi boş saydırmaz", () => {
  const bos = (page: number) => ({ answered: true, items: [], pagination: { page, page_size: 50, total: 0, total_pages: 1 } });
  assert.equal(isConfirmedEmptyCategory(1, bos(1)), true, "1. sayfa, API yanıt verdi, total 0 → kategori boş");
  // Dolu kategoride son sayfanın ötesi: API tam olarak bunu döndürür (sayfa yankılı ya da yankısız).
  assert.equal(isConfirmedEmptyListing(bos(9)), true, "ön koşul: yanıtın kendisi 'boş liste' gibi görünür");
  assert.equal(isConfirmedEmptyCategory(9, bos(9)), false, "sayfa 9'un yanıtı kategori için kanıt değil");
  assert.equal(isConfirmedEmptyCategory(999, { answered: true, items: [], pagination: { total: 0 } }), false, "sayfa yankısı olmasa da");
  assert.equal(isConfirmedEmptyCategory(2, bos(2)), false);
  // 1. sayfada fail-open kuralları aynen (isConfirmedEmptyListing).
  // fetchProductsPaged hata hâlinde tam olarak bunu döndürür (`answered` YOK).
  const yedek = { items: [], pagination: { page: 1, page_size: 50, total: 0, total_pages: 1 } };
  assert.equal(isConfirmedEmptyCategory(1, yedek), false, "yedek sayfa (answered yok)");
  assert.equal(isConfirmedEmptyCategory(1, { answered: true, items: [{ id: 1 }], pagination: { total: 37 } }), false, "dolu kategori");
  assert.equal(isConfirmedEmptyCategory(1, null), false);
  assert.equal(isConfirmedEmptyCategory(1, undefined), false);
});

test("isCategoryWithoutListing: canlı ağaçta karşılığı olmayan ÜRÜN KATEGORİSİ sayfası ürün listelemez → index'e değmez", () => {
  assert.equal(isCategoryWithoutListing({ liveTree: true, categoryId: null, pageType: "category" }), true);
  assert.equal(isCategoryWithoutListing({ liveTree: true, categoryId: undefined, pageType: "category" }), true);
  // Kategori ağaçta varsa karar ürün sayısına bakar (bu kural devreye girmez).
  assert.equal(isCategoryWithoutListing({ liveTree: true, categoryId: 13, pageType: "category" }), false);
  // FAIL-OPEN: ağaç okunamadı (statik yedek) → karar verilmez.
  assert.equal(isCategoryWithoutListing({ liveTree: false, categoryId: null, pageType: "category" }), false);
  // Konum + kategori sayfaları (ve türü bilinmeyen sayfa) ürün kategorisi değildir → dokunulmaz.
  for (const pageType of ["category_location", "special_day", "brand", "", null, undefined]) {
    assert.equal(isCategoryWithoutListing({ liveTree: true, categoryId: null, pageType }), false, String(pageType));
  }
});

test("KAYNAK: Türkçe kategori sayfası boş kategoride noindex,follow basar ve hreflang kümesi basmaz; boş durum metni doğruyu söyler", () => {
  const page = readFileSync(new URL("../app/kategori/[...slug]/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("const emptyCategory = SITE_INDEXABLE && page.index_state === \"index\" && (await isCategoryConfirmedEmpty(path, pageNo, page.page_type));"));
  assert.ok(page.includes("robots: emptyCategory ? EMPTY_CATEGORY_ROBOTS : indexRobots(page.index_state),"), "karar yoksa bugünkü robots");
  assert.ok(page.includes("if (pageNo === 1 && page.index_state === \"index\" && !emptyCategory) {"), "noindex sayfa hreflang ailesine girmez");
  // Karar yalnız CANLI ağaç + başarılı ürün okumasıyla verilir; istek ana serinin isteğiyle aynı.
  const fn = page.slice(page.indexOf("async function isCategoryConfirmedEmpty("), page.indexOf("export async function generateMetadata"));
  assert.ok(fn.includes("if (!tree || tree === CATEGORY_TREE_FALLBACK) return false;"));
  // EK: karar yalnız 1. sayfada; okuma da ancak o zaman yapılır (sayfa ≥ 2'de ek istek yok).
  assert.ok(fn.includes("if (pageNo !== 1) return false;"));
  assert.ok(fn.indexOf("if (pageNo !== 1) return false;") < fn.indexOf("await getCategoryTree()"), "sayfa ≥ 2'de hiçbir okuma yapılmaz");
  // EK: ağaçta çözülemeyen ürün kategorisi sayfası listesizdir (konum + kategori sayfaları hariç).
  assert.ok(fn.includes("if (!categoryId) return isCategoryWithoutListing({ liveTree: true, categoryId, pageType });"));
  assert.ok(fn.includes("return isConfirmedEmptyCategory("));
  assert.ok(fn.includes("await fetchProductsPaged({ category_id: categoryId, page_size: 50, page: pageNo, sort: CATEGORY_DEFAULT_SORT }),"));
  assert.match(page, /^export const revalidate = 300;$/m, "rota ayarı değişmedi");

  const landing = readFileSync(new URL("../components/category/CategoryLanding.tsx", import.meta.url), "utf8");
  assert.ok(landing.includes("const categoryEmpty = !filterType && !sameDay && !bestseller && !isNew && isConfirmedEmptyCategory(pageNum, productPage);"));
  assert.ok(landing.includes('{categoryEmpty ? "Bu koleksiyonda şu anda ürün bulunmuyor." : "Seçtiğin filtrelere uygun ürün bulunamadı."}'));
  // Bağlantı metni hedefini söyler: boş kategoride hedef ana sayfadır ("/").
  assert.ok(landing.includes('<Link href={categoryEmpty ? "/" : path} scroll={categoryEmpty}'));
  assert.ok(landing.includes('{categoryEmpty ? "Ana sayfaya dön" : "Filtreleri temizle"}'));
  assert.ok(!landing.includes("Tüm koleksiyonlara göz at"), "metin hedefle çelişmez");
  assert.ok(landing.includes('<section className="max-w-[1440px] mx-auto px-6 lg:px-14 py-16 text-center">'), "boş durum işaretlemesi aynı");
  assert.ok(landing.includes('className="inline-block mt-4 text-[13px] font-semibold text-[#7C3AED] hover:underline"'));

  // Locale kategori sayfası: o dilde ürün listelemiyorsa noindex,follow + hreflang yok.
  const motor = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(motor.includes("const emptyCategory = surface.indexable && Array.isArray(surface.products) && surface.products.length === 0;"));
  assert.ok(motor.includes("robots: emptyCategory ? EMPTY_CATEGORY_ROBOTS : surface.indexable ? undefined : NOINDEX,"));
  assert.ok(motor.includes("if (surface.indexable && !emptyCategory) {"));
});

// ---------------------------------------------------------------------------
// EK: /kategori/turkiye-geneli-kargo — sayfalama kuralları BİLEREK uygulanmadı.
// Rota sayfalı bir seri değildir: sorguyu hiç okumaz, kargoya uygun TÜM ürünleri tek sayfada
// basar (ürün tipi sekmeleri istemcide süzer). `?page=N` yok sayılan bir parametredir ve çıplak
// canonical o adresi doğru biçimde tek sayfada toplar. Buraya sayfa başına canonical / 404 /
// numaralı bağlantı eklemek, var olmayan bir sayfalama UYDURMAK olurdu (görünür liste dilimlenir,
// bugün 200 dönen adres 404'e döner). Bu nöbet, rota ileride GERÇEKTEN sayfalanırsa kuralların
// (lib/categoryPagination.ts) ona da uygulanması gerektiğini hatırlatır.
// ---------------------------------------------------------------------------
test("KAYNAK: /kategori/turkiye-geneli-kargo sayfalı seri DEĞİLDİR — ?page okunmaz, tüm ürünler tek sayfada, canonical çıplak yol", () => {
  const kargo = readFileSync(new URL("../app/kategori/turkiye-geneli-kargo/page.tsx", import.meta.url), "utf8");
  assert.ok(!/searchParams/.test(kargo), "rota sorguyu okumaz → ?page=N yok sayılır");
  assert.ok(kargo.includes("export default async function NationwideCargoPage() {"));
  assert.ok(kargo.includes('alternates: { canonical: "/kategori/turkiye-geneli-kargo" },'), "her adres varyantı çıplak yola canonical verir");
  assert.ok(kargo.includes("return <CargoCategoryExperience products={products.map(toCardProduct)} blocks={managed?.body_blocks ?? []} />;"), "liste dilimlenmeden bileşene geçer");
  const vitrin = readFileSync(new URL("../components/category/CargoCategoryExperience.tsx", import.meta.url), "utf8");
  assert.ok(!/searchParams/.test(vitrin), "vitrin de sorguyu okumaz");
  assert.ok(vitrin.includes("{shown.map((p, i) =>"), "süzülen listenin tamamı basılır (sayfa dilimi yok)");
});
