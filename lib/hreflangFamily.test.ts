// lib/hreflangFamily.test.ts — hreflang AİLESİ (TR + locale sürümleri) saf küme kurma testleri.
// Google kuralı: her sürüm kendini ve diğer TÜM sürümleri listeler; tek yönlü bağ yok sayılır; URL mutlaktır.
// Çalıştırma: node --test lib/hreflangFamily.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { GLOBAL_LOCALES, localeProductPath, SEGMENTS } from "./global/config.ts";
import { withXDefault, X_DEFAULT_KEY } from "./global/hreflang.ts";
import {
  TR_CATEGORY_DEDICATED_ROUTES,
  TR_HREFLANG,
  categoryHreflangFamily,
  homeHreflangFamily,
  hreflangFamily,
  listsLocaleVersion,
  productHreflangFamily,
  trCategoryConfirmedIndexable,
  trCategoryPath,
  trProductPath,
  type LocaleVersion,
} from "./global/hreflangFamily.ts";

const SITE = "https://www.cicekyolla.com.tr";
const mutlak = (p: string) => `${SITE}${p.startsWith("/") ? p : `/${p}`}`;
const oku = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// Örnek ürün: product-locales/:id yanıtı — de + en indexlenebilir, fr noindex, "xx" bilinmeyen dil.
const URUN = {
  tr_slug: "kirmizi-gul-buketi",
  locales: [
    { locale: "de", slug: "rote-rosen-strauss", indexable: true },
    { locale: "en", slug: "red-rose-bouquet", indexable: true },
    { locale: "fr", slug: "bouquet-de-roses-rouges", indexable: false },
    { locale: "xx", slug: "bilinmeyen", indexable: true },
  ] as LocaleVersion[],
};

// ---------------------------------------------------------------------------
// 1) ÜRÜN — karşılıklılık (reciprocity)
// ---------------------------------------------------------------------------

test("ürün: Türkçe sayfanın kümesi ile her locale sayfasının kümesi BİREBİR aynıdır", () => {
  // Türkçe PDP: kendi canonical yolu (kayıtlı slug) + product-locales satırları.
  const trSet = productHreflangFamily(trProductPath("kirmizi-gul-buketi"), URUN.locales, mutlak);
  assert.ok(trSet, "Türkçe sayfa küme basar");
  // Locale PDP'ler: aynı küme yanıtından (tr_slug + locales) — her indexlenebilir dil kendi sayfasında aynı çağrıyı yapar.
  for (const alt of URUN.locales.filter((l) => l.indexable && l.locale !== "xx")) {
    const localeSet = productHreflangFamily(trProductPath(URUN.tr_slug), URUN.locales, mutlak);
    assert.deepEqual(localeSet, trSet, `${alt.locale} sayfasının kümesi TR ile aynı`);
    // Her sürüm KENDİNİ listeler.
    assert.equal(localeSet?.[alt.locale], mutlak(localeProductPath(alt.locale as "de", alt.slug as string)), `${alt.locale} kendini listeler`);
  }
  assert.deepEqual(trSet, {
    tr: `${SITE}/urun/kirmizi-gul-buketi`,
    de: `${SITE}/de/produkt/rote-rosen-strauss`,
    en: `${SITE}/en/product/red-rose-bouquet`,
    "x-default": `${SITE}/en/product/red-rose-bouquet`,
  });
});

test("ürün: tr = Türkçe sayfanın kendi canonical'ı; noindex ve bilinmeyen dil listelenmez; tüm URL'ler mutlak", () => {
  const set = productHreflangFamily("/urun/kirmizi-gul-buketi", URUN.locales, mutlak)!;
  assert.equal(set[TR_HREFLANG], mutlak("/urun/kirmizi-gul-buketi"));
  assert.equal("fr" in set, false, "noindex locale sürümü listelenmez");
  assert.equal("xx" in set, false, "Global listede olmayan dil listelenmez");
  for (const url of Object.values(set)) assert.match(url, /^https:\/\/www\.cicekyolla\.com\.tr\//);
});

test("ürün: tek dilde indexlenebilir ürün 2 üyeli ailedir (tr + o dil) ve BASILIR", () => {
  const set = productHreflangFamily("/urun/orkide", [{ locale: "de", slug: "orchidee", indexable: true }], mutlak);
  assert.deepEqual(set, {
    tr: `${SITE}/urun/orkide`,
    de: `${SITE}/de/produkt/orchidee`,
    "x-default": `${SITE}/de/produkt/orchidee`,
  });
});

test("ürün: indexlenebilir locale sürümü yoksa / yanıt yoksa küme YOK (Türkçe sayfa hiçbir şey basmaz)", () => {
  assert.equal(productHreflangFamily("/urun/orkide", [{ locale: "de", slug: "orchidee", indexable: false }], mutlak), null);
  assert.equal(productHreflangFamily("/urun/orkide", [], mutlak), null);
  assert.equal(productHreflangFamily("/urun/orkide", null, mutlak), null);
  assert.equal(productHreflangFamily("/urun/orkide", undefined, mutlak), null);
  assert.equal(productHreflangFamily("/urun/orkide", [{ locale: "de", slug: "", indexable: true }], mutlak), null, "slug'sız satır sürüm değildir");
});

// ---------------------------------------------------------------------------
// 2) x-default kuralı DEĞİŞMEDİ: aday yalnız locale sürümleri
// ---------------------------------------------------------------------------

test("x-default: EN varsa EN; yoksa alfabetik ilk LOCALE — TR hiçbir zaman x-default olmaz", () => {
  const enli = productHreflangFamily("/urun/a", [{ locale: "zh", slug: "z", indexable: true }, { locale: "en", slug: "e", indexable: true }], mutlak)!;
  assert.equal(enli[X_DEFAULT_KEY], `${SITE}/en/product/e`);
  // "tr" alfabetik olarak "zh"den önce gelir; yine de x-default locale sürümüdür.
  const ensiz = productHreflangFamily("/urun/a", [{ locale: "zh", slug: "z", indexable: true }], mutlak)!;
  assert.equal(ensiz[X_DEFAULT_KEY], `${SITE}/zh/product/z`);
  assert.notEqual(ensiz[X_DEFAULT_KEY], ensiz[TR_HREFLANG]);
  const cok = productHreflangFamily("/urun/a", [{ locale: "ru", slug: "r", indexable: true }, { locale: "de", slug: "d", indexable: true }], mutlak)!;
  assert.equal(cok[X_DEFAULT_KEY], `${SITE}/de/produkt/d`);
});

test("Türkçe sayfa locale kardeşleriyle AYNI x-default'u basar (TR'li ve TR'siz küme aynı seçimi yapar)", () => {
  const locales = { de: `${SITE}/de/x`, fr: `${SITE}/fr/x`, en: `${SITE}/en/x` };
  const trli = hreflangFamily(`${SITE}/x`, locales)!;
  const trsiz = hreflangFamily(null, locales)!;
  assert.equal(trli[X_DEFAULT_KEY], trsiz[X_DEFAULT_KEY]);
  assert.equal(trli[X_DEFAULT_KEY], withXDefault(locales)[X_DEFAULT_KEY]);
});

// ---------------------------------------------------------------------------
// 3) Genel aile kuralı
// ---------------------------------------------------------------------------

test("aile: TR kümede değilken çıktı bugünkü locale kümesiyle BİREBİR aynı (anahtar sırası dahil); tek locale → null", () => {
  const locales = { fr: `${SITE}/fr/x`, de: `${SITE}/de/x` };
  const set = hreflangFamily(null, locales);
  assert.deepEqual(set, withXDefault(locales));
  assert.deepEqual(Object.keys(set!), Object.keys(withXDefault(locales)), "anahtar sırası değişmez");
  assert.equal(TR_HREFLANG in set!, false);
  assert.equal(hreflangFamily(null, { de: `${SITE}/de/x` }), null, "TR yok + tek locale = aile değil");
  assert.equal(hreflangFamily(undefined, {}), null);
  assert.equal(hreflangFamily(`${SITE}/x`, {}), null, "yalnız TR = aile değil");
});

test("aile: girdi değiştirilmez; boş URL'li ve Global olmayan anahtarlar atılır", () => {
  const locales: Record<string, string> = { de: `${SITE}/de/x`, en: "", tr: `${SITE}/yanlis`, "x-default": `${SITE}/eski` };
  const kopya = { ...locales };
  const set = hreflangFamily(`${SITE}/x`, locales)!;
  assert.deepEqual(locales, kopya);
  assert.deepEqual(set, { tr: `${SITE}/x`, de: `${SITE}/de/x`, "x-default": `${SITE}/de/x` });
});

// ---------------------------------------------------------------------------
// 4) KATEGORİ
// ---------------------------------------------------------------------------

const KATEGORI: LocaleVersion[] = [
  { locale: "de", slug: "rosen", indexable: true },
  { locale: "az", slug: "guller", indexable: true },
  { locale: "en", slug: "roses", indexable: true },
  { locale: "ja", slug: "bara", indexable: false },
];

test("kategori: Türkçe sayfa indexlenebilirken TR ve locale sayfalarının kümesi aynıdır; segmentler o dilin", () => {
  const trSet = categoryHreflangFamily("/kategori/guller", KATEGORI, mutlak);
  const localeSet = categoryHreflangFamily(trCategoryPath("guller"), KATEGORI, mutlak);
  assert.deepEqual(localeSet, trSet);
  assert.deepEqual(trSet, {
    tr: `${SITE}/kategori/guller`,
    de: `${SITE}/de/${SEGMENTS.de.category}/rosen`,
    az: `${SITE}/az/${SEGMENTS.az.category}/guller`,
    en: `${SITE}/en/${SEGMENTS.en.category}/roses`,
    "x-default": `${SITE}/en/category/roses`,
  });
  assert.equal(trSet!.az, `${SITE}/az/kateqoriya/guller`);
});

test("kategori: Türkçe sayfa indexlenebilir değil / bilinmiyor → tr EKLENMEZ, locale kümesi bugünkü gibi", () => {
  const set = categoryHreflangFamily(null, KATEGORI, mutlak)!;
  assert.equal(TR_HREFLANG in set, false);
  assert.deepEqual(Object.keys(set), ["de", "az", "en", "x-default"]);
  // Tek indexlenebilir locale + TR yok → bugünkü kural: küme yok.
  assert.equal(categoryHreflangFamily(null, [{ locale: "de", slug: "rosen", indexable: true }], mutlak), null);
  // Pasif kategori: API locales: [] döner → Türkçe sayfa hiçbir şey basmaz.
  assert.equal(categoryHreflangFamily("/kategori/guller", [], mutlak), null);
});

test("kategori: 'tr kesin indexlenebilir' kararı yalnız TÜM girdiler okunmuşken ve index iken evet", () => {
  const tam = { seoRead: true, treeRead: true, nodeFound: true, hidden: false, indexState: "index" };
  assert.equal(trCategoryConfirmedIndexable(tam), true);
  assert.equal(trCategoryConfirmedIndexable({ ...tam, seoRead: false }), false, "SEO kaydı okunamadı → bilinmiyor");
  assert.equal(trCategoryConfirmedIndexable({ ...tam, treeRead: false }), false, "canlı ağaç okunamadı (statik yedek) → bilinmiyor");
  // EK: Türkçe sayfa kümeyi yalnız ağaç düğümünü bulduğunda basar → düğüm yoksa (yalnız SEO kaydından çizilen
  // sayfa / başka kategori kimliği) locale sayfası tr eklerse bağ tek yönlü kalırdı.
  assert.equal(trCategoryConfirmedIndexable({ ...tam, nodeFound: false }), false, "kategori canlı ağaçta yok / kimlik uyuşmuyor");
  assert.equal(trCategoryConfirmedIndexable({ ...tam, hidden: true }), false, "pasif / arşiv kategori");
  assert.equal(trCategoryConfirmedIndexable({ ...tam, indexState: "noindex" }), false);
  assert.equal(trCategoryConfirmedIndexable({ ...tam, indexState: null }), false, "Türkçe sayfa yok (404)");
  assert.equal(trCategoryConfirmedIndexable({ ...tam, indexState: undefined }), false);
});

test("kategori: locale sayfası tr'yi yalnız Türkçe sayfanın küme kaynağı O sayfayı listeliyorsa ekler (tek yönlü bağ yok)", () => {
  // category-locales yanıtı = Türkçe sayfanın bastığı küme. de + az + en listeli, ja noindex.
  assert.equal(listsLocaleVersion(KATEGORI, "de"), true);
  assert.equal(listsLocaleVersion(KATEGORI, "en"), true);
  assert.equal(listsLocaleVersion(KATEGORI, "ja"), false, "noindex sürüm Türkçe sayfada listelenmez");
  assert.equal(listsLocaleVersion(KATEGORI, "fr"), false, "kaynakta olmayan dil");
  assert.equal(listsLocaleVersion([{ locale: "de", slug: "", indexable: true }], "de"), false, "slug'sız satır");
  // Uç henüz yayında değil (404) / okunamadı → kaynak yok → tr eklenmez (bugünkü davranış).
  assert.equal(listsLocaleVersion(null, "de"), false);
  assert.equal(listsLocaleVersion(undefined, "de"), false);
  assert.equal(listsLocaleVersion([], "de"), false, "pasif kategori: locales boş");
  // Karşılıklılık: Türkçe sayfa bir locale'i listeliyorsa o locale tr'yi ekler; listelemiyorsa eklemez.
  const trSet = categoryHreflangFamily("/kategori/guller", KATEGORI, mutlak)!;
  for (const l of ["de", "az", "en", "ja", "fr"]) {
    assert.equal(l in trSet, listsLocaleVersion(KATEGORI, l), l);
  }
});

// ---------------------------------------------------------------------------
// 5) ANA SAYFA
// ---------------------------------------------------------------------------

test("ana sayfa: tr = site kökü, locale = /<locale>; iki taraf aynı kümeyi basar; indexlenebilir locale yoksa küme yok", () => {
  const satirlar: LocaleVersion[] = [{ locale: "de", indexable: true }, { locale: "en", indexable: true }, { locale: "ko", indexable: false }];
  const trSet = homeHreflangFamily(satirlar, mutlak);
  const localeSet = homeHreflangFamily(satirlar, mutlak);
  assert.deepEqual(localeSet, trSet);
  assert.deepEqual(trSet, { tr: `${SITE}/`, de: `${SITE}/de`, en: `${SITE}/en`, "x-default": `${SITE}/en` });
  assert.deepEqual(homeHreflangFamily([{ locale: "de", indexable: true }], mutlak), { tr: `${SITE}/`, de: `${SITE}/de`, "x-default": `${SITE}/de` }, "tek locale ana sayfası → 2 üyeli aile");
  assert.equal(homeHreflangFamily([{ locale: "de", indexable: false }], mutlak), null);
  assert.equal(homeHreflangFamily(null, mutlak), null, "satır okunamadı → Türkçe ana sayfa hreflang basmaz");
});

test("13 dilin tamamı aileye girebilir (ürün + kategori + ana sayfa yolu üretilir)", () => {
  const hepsi: LocaleVersion[] = GLOBAL_LOCALES.map((l) => ({ locale: l, slug: "s", indexable: true }));
  for (const set of [productHreflangFamily("/urun/s", hepsi, mutlak)!, categoryHreflangFamily("/kategori/s", hepsi, mutlak)!, homeHreflangFamily(hepsi, mutlak)!]) {
    assert.equal(Object.keys(set).length, 13 + 2, "13 locale + tr + x-default");
    for (const l of GLOBAL_LOCALES) assert.ok(set[l].startsWith(`${SITE}/${l}`), l);
  }
});

// ---------------------------------------------------------------------------
// 6) Kaynak nöbetleri (JSX / Next çalışma zamanı ister → kaynak metni doğrulanır)
// ---------------------------------------------------------------------------

const motor = oku("./global/page.tsx");
const meta = motor.slice(motor.indexOf("export async function localeMetadata"), motor.indexOf("// ---- Ortak parçalar"));
const dal = (tur: string, sonraki: string) => meta.slice(meta.indexOf(`if (parsed.kind === "${tur}")`), meta.indexOf(sonraki));

test("KAYNAK: locale ana sayfa / kategori / ürün kümeleri aile kurucusundan geçer; noindex yüzey küme basmaz", () => {
  const home = dal("home", 'if (parsed.kind === "page")');
  assert.ok(home.includes("const languages = row.indexable ? homeHreflangFamily(row.locales, absoluteUrl) : null;"));
  const category = dal("category", 'if (parsed.kind === "product")');
  assert.ok(category.includes("if (surface.indexable) {"));
  // tr yalnız karşılığı kesinken: Türkçe sayfanın küme kaynağı bu sayfayı listeliyor VE Türkçe sayfa kesin indexlenebilir.
  // EK — SIRA: önce küme kaynağı; bu sayfayı listelemiyorsa (uç yayınlanana kadar her istekte) Türkçe sayfa
  // okumaları HİÇ yapılmaz (Promise.all yok → sonucu atılacak ek upstream okuması / bekleme yok).
  assert.ok(category.includes("const trSide = await fetchCategoryLocaleVersions(surface.category_id);"));
  assert.match(category, /const trListsThis = listsLocaleVersion\(trSide\?\.locales, locale\)\s*&& \(await isCategoryPageConfirmedIndexable\(surface\.tr_slug, surface\.category_id\)\);/);
  assert.ok(!category.includes("Promise.all("), "iki okuma paralel başlatılmaz");
  assert.ok(category.indexOf("fetchCategoryLocaleVersions(") < category.indexOf("isCategoryPageConfirmedIndexable("));
  // EK — tr kümedeyken küme, Türkçe sayfanın kullandığı AYNI kaynaktan kurulur (iki tarafın kümesi birebir eşit).
  assert.match(category, /categoryHreflangFamily\(\s*trListsThis \? trCategoryPath\(surface\.tr_slug\) : null,\s*trListsThis \? trSide\?\.locales : surface\.locales,\s*absoluteUrl,\s*\)/);
  const product = dal("product", "return { robots: NOINDEX };\n}");
  assert.ok(product.includes("surface.indexable ? fetchProductLocaleCluster(surface.product_id) : Promise.resolve(null)"), "noindex ürün küme okumaz");
  assert.ok(product.includes("if (surface.indexable && cluster) {"));
  assert.ok(product.includes("productHreflangFamily(trSlug ? trProductPath(trSlug) : null, cluster.locales, absoluteUrl)"));
});

test("KAYNAK: lokasyon / niyet sayfalarına TR EKLENMEZ (pageLanguages değişmedi; aile kurucusu o dalda yok)", () => {
  const page = dal("page", 'if (parsed.kind === "category")');
  assert.ok(page.includes("pageLanguages(locale, row)"));
  assert.ok(!/HreflangFamily|trProductPath|trCategoryPath/.test(page), "lokasyon dalında aile kurucusu kullanılmaz");
  const fn = motor.slice(motor.indexOf("function pageLanguages("), motor.indexOf("export async function localeMetadata"));
  assert.ok(fn.includes("return Object.keys(languages).length > 1 ? withXDefault(languages) : null;"));
  assert.ok(!/["'`]tr["'`]|TR_HREFLANG/.test(fn), "pageLanguages tr eklemez");
});

test("KAYNAK: Türkçe ürün / kategori / ana sayfa aynı kurucuyu kullanır; okumalar fail-open (null → alternates yalnız canonical)", () => {
  const urun = oku("../app/urun/[slug]/page.tsx");
  assert.ok(urun.includes("productHreflangFamily(canonicalPath, (await fetchProductLocaleVersions(product.id))?.locales, absoluteUrl)"));
  assert.ok(urun.includes("return languages ? { ...meta, alternates: { ...meta.alternates, languages } } : meta;"));

  const kategori = oku("../app/kategori/[...slug]/page.tsx");
  assert.ok(kategori.includes('if (pageNo === 1 && page.index_state === "index") {'), "yalnız 1. sayfa + yalnız indexlenebilir sayfa");
  assert.ok(kategori.includes("categoryHreflangFamily(path, (await fetchCategoryLocaleVersions(node.id))?.locales, absoluteUrl)"));
  assert.ok(kategori.includes("return languages ? { ...meta, alternates: { ...meta.alternates, languages } } : meta;"));

  const ana = oku("../app/page.tsx");
  assert.ok(ana.includes("homeHreflangFamily(await fetchHomeLocaleVersions(), absoluteUrl)"));
  assert.ok(ana.includes("return languages ? { ...metadata, alternates: { ...metadata.alternates, languages } } : metadata;"));
  assert.ok(!/^export const metadata\b/m.test(ana) && /^export async function generateMetadata\(\)/m.test(ana), "Next: metadata + generateMetadata birlikte dışa aktarılamaz");
});

test("KAYNAK: 'tr kesin indexlenebilir' okuması Türkçe sayfanın kendi çözücüsünü kullanır ve hata → false", () => {
  const src = oku("./categoryPage.ts");
  const fn = src.slice(src.indexOf("export async function isCategoryPageConfirmedIndexable"));
  assert.ok(fn.includes("Promise.all([fetchSeoPageChecked(path), fetchCategoryTree(), resolveCategoryPage(path)])"));
  assert.ok(fn.includes("indexState: page?.index_state"));
  assert.match(fn, /catch \{\s*return false;\s*\}/);
  // EK: düğüm bulunmalı (ve locale yüzeyinin kategori kimliğini taşımalı); kendi statik rotasından sunulan kategori hariç.
  assert.ok(fn.includes("nodeFound: !!node && (categoryId == null || String(node.id) === String(categoryId)),"));
  assert.ok(fn.includes("if (TR_CATEGORY_DEDICATED_ROUTES.includes(slug)) return false;"));
  assert.ok(fn.indexOf("TR_CATEGORY_DEDICATED_ROUTES.includes(slug)") < fn.indexOf("Promise.all("), "statik rota için hiçbir okuma yapılmaz");
});

// ---------------------------------------------------------------------------
// 7) EK (inceleme düzeltmeleri): biçim hatasına dayanıklılık, tek küme kaynağı, statik rota
// ---------------------------------------------------------------------------

test("biçim hatası FIRLATMAZ: `locales` liste değilse / içinde null satır varsa küme basılmaz ya da satır atlanır (sayfa 500 vermez)", () => {
  const bozuklar: unknown[] = [{}, { de: { slug: "x", indexable: true } }, "metin", 7, true, null, undefined];
  for (const bozuk of bozuklar) {
    const locales = bozuk as LocaleVersion[];
    assert.equal(productHreflangFamily("/urun/x", locales, mutlak), null, JSON.stringify(bozuk));
    assert.equal(categoryHreflangFamily("/kategori/x", locales, mutlak), null, JSON.stringify(bozuk));
    assert.equal(homeHreflangFamily(locales, mutlak), null, JSON.stringify(bozuk));
    assert.equal(listsLocaleVersion(locales, "de"), false, JSON.stringify(bozuk));
  }
  // Liste içindeki bozuk satırlar atlanır; geçerli satırlar kümeyi kurar.
  const karisik = [null, undefined, "de", 5, { locale: "de", slug: "rosen", indexable: true }] as unknown as LocaleVersion[];
  assert.deepEqual(productHreflangFamily("/urun/gul", karisik, mutlak), {
    tr: `${SITE}/urun/gul`,
    de: `${SITE}/de/produkt/rosen`,
    "x-default": `${SITE}/de/produkt/rosen`,
  });
  assert.deepEqual(categoryHreflangFamily("/kategori/guller", karisik, mutlak), {
    tr: `${SITE}/kategori/guller`,
    de: `${SITE}/de/${SEGMENTS.de.category}/rosen`,
    "x-default": `${SITE}/de/${SEGMENTS.de.category}/rosen`,
  });
  assert.equal(listsLocaleVersion(karisik, "de"), true);
  assert.deepEqual(homeHreflangFamily([null, { locale: "en", indexable: true }] as unknown as LocaleVersion[], mutlak), {
    tr: `${SITE}/`, en: `${SITE}/en`, "x-default": `${SITE}/en`,
  });
});

test("kategori: iki API yanıtı AYRIŞSA da tr kümedeyken Türkçe ve locale sayfası AYNI kümeyi basar (tek kaynak: category-locales)", () => {
  // category-locales (Türkçe sayfanın kaynağı): de + en. Kategori yüzeyi (locale sayfasının eski kaynağı): de + en + it.
  const kaynak: LocaleVersion[] = [{ locale: "de", slug: "rosen", indexable: true }, { locale: "en", slug: "roses", indexable: true }];
  const yuzey: LocaleVersion[] = [...kaynak, { locale: "it", slug: "rose", indexable: true }];
  const trSet = categoryHreflangFamily(trCategoryPath("guller"), kaynak, mutlak);
  // page.tsx kuralı: trListsThis ? (tr yolu, KAYNAK) : (null, yüzey).
  const localeSet = (locale: string) => {
    const trListsThis = listsLocaleVersion(kaynak, locale);
    return categoryHreflangFamily(trListsThis ? trCategoryPath("guller") : null, trListsThis ? kaynak : yuzey, mutlak);
  };
  assert.deepEqual(localeSet("de"), trSet, "de: Türkçe sayfayla birebir aynı küme");
  assert.deepEqual(localeSet("en"), trSet, "en: Türkçe sayfayla birebir aynı küme");
  assert.equal("it" in (trSet ?? {}), false);
  // Kaynakta olmayan dil (it) tr EKLEMEZ ve bugünkü gibi yüzey kümesini basar (tr'ye tek yönlü bağ yok).
  assert.equal("tr" in (localeSet("it") ?? {}), false);
  // Önceki kural (tr yolu + YÜZEY) aynı girdide ayrışıyordu — nöbet:
  assert.notDeepEqual(categoryHreflangFamily(trCategoryPath("guller"), yuzey, mutlak), trSet);
});

test("KAYNAK: kendi statik rotasından sunulan Türkçe kategori listesi app/kategori klasörleriyle eşleşir", () => {
  const klasorler = readdirSync(new URL("../app/kategori/", import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("["))
    .map((d) => d.name)
    .sort();
  assert.deepEqual([...TR_CATEGORY_DEDICATED_ROUTES].sort(), klasorler, "yeni statik kategori rotası eklenirse liste de güncellenmeli");
  assert.ok(TR_CATEGORY_DEDICATED_ROUTES.includes("turkiye-geneli-kargo"));
  // O rota hreflang kümesi basmaz (locale sayfası ona tr bağı vermemeli).
  for (const slug of TR_CATEGORY_DEDICATED_ROUTES) {
    assert.ok(!/alternates[\s\S]{0,200}languages/.test(oku(`../app/kategori/${slug}/page.tsx`)), slug);
  }
});
