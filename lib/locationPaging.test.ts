// GLOBAL LOKASYON SAYFASI — gerçek 24'lük sayfalama (DESIGN-FIX F1): saf yardımcılar + kaynak korumaları.
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOBAL_LOCALES } from "./global/config.ts";
import { planLocationPage, type CatalogCategory } from "./global/globalCatalog.ts";
import { DEFAULT_LOCATION_SECTIONS, renderableLocationSections, parseLocationSections } from "./global/locationSections.ts";
import {
  LOCATION_PAGE_SIZE, LOCATION_PAGING_LABELS,
  queryValue, locationTotalPages, parseLocationPage, parseLocationCategory, sliceLocationPage,
  locationPageHref, compactPageList, locationPagination, resolveLocationCatalog,
  isLocationContinuationPage, locationPageLabel,
} from "./global/locationPaging.ts";

const oku = (yol: string) => readFileSync(new URL(yol, import.meta.url), "utf8");
const BASE = "/en/istanbul/kadikoy";
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ── Sayı / parse / dilim ────────────────────────────────────────────────────

test("sabit: sayfa başına 24; toplam sayfa = ceil(ürün / 24), en az 1 (hardcode yok)", () => {
  assert.equal(LOCATION_PAGE_SIZE, 24);
  assert.equal(locationTotalPages(0), 1);
  assert.equal(locationTotalPages(1), 1);
  assert.equal(locationTotalPages(24), 1);
  assert.equal(locationTotalPages(25), 2);
  assert.equal(locationTotalPages(137), 6);
  assert.equal(locationTotalPages(480), 20);
  assert.equal(locationTotalPages(481), 21);
  assert.equal(locationTotalPages(Number.NaN), 1);
  assert.equal(locationTotalPages(-5), 1);
  assert.equal(locationTotalPages(50, 10), 5, "boyut parametrik");
});

test("sorgu değeri: dizi → ilk öğe; string dışı → undefined", () => {
  assert.equal(queryValue("2"), "2");
  assert.equal(queryValue(["3", "4"]), "3");
  assert.equal(queryValue(undefined), undefined);
  assert.equal(queryValue(2), undefined);
  assert.equal(queryValue([]), undefined);
});

test("?page: geçerli 1..toplam; sayı değil / tam sayı değil / < 1 / > toplam / boş → 1 (yönlendirme yok)", () => {
  assert.equal(parseLocationPage(undefined, 6), 1);
  assert.equal(parseLocationPage("1", 6), 1);
  assert.equal(parseLocationPage("2", 6), 2);
  assert.equal(parseLocationPage("6", 6), 6);
  assert.equal(parseLocationPage(["3", "5"], 6), 3);
  for (const bad of ["0", "-1", "7", "999999", "abc", "2.5", "1e1", " 2", "+2", "", "2abc", "0x2"]) {
    assert.equal(parseLocationPage(bad, 6), 1, JSON.stringify(bad));
  }
  assert.equal(parseLocationPage("2", 1), 1, "tek sayfada ?page=2 → 1");
  assert.equal(parseLocationPage("2", 0), 1);
});

test("?category: yalnız bu lokasyonda ürünü olan bilinen slug; bilinmeyen / ürünsüz / boş → null (Tümü)", () => {
  const cats = [{ slug: "roses", name: "Roses", ids: [1, 2] }, { slug: "lilies", name: "Lilies", ids: [] }];
  assert.equal(parseLocationCategory("roses", cats), "roses");
  assert.equal(parseLocationCategory(["roses", "x"], cats), "roses");
  assert.equal(parseLocationCategory("lilies", cats), null, "ürünsüz kategori → Tümü");
  assert.equal(parseLocationCategory("tulips", cats), null);
  assert.equal(parseLocationCategory("", cats), null);
  assert.equal(parseLocationCategory(undefined, cats), null);
  assert.equal(parseLocationCategory("Roses", cats), null, "slug birebir");
});

test("dilim: sıra korunur, liste değiştirilmez; son sayfa kalan kadar; aralık dışı boş", () => {
  const ids = range(1, 137);
  const kopya = [...ids];
  assert.deepEqual(sliceLocationPage(ids, 1), range(1, 24));
  assert.deepEqual(sliceLocationPage(ids, 2), range(25, 48));
  assert.deepEqual(sliceLocationPage(ids, 6), range(121, 137));
  assert.equal(sliceLocationPage(ids, 6).length, 17);
  assert.deepEqual(sliceLocationPage(ids, 7), []);
  assert.deepEqual(sliceLocationPage(ids, 0), range(1, 24), "geçersiz sayfa → 1");
  assert.deepEqual(ids, kopya, "girdi mutasyona uğramaz");
  const karisik = [9, 3, 7, 1];
  assert.deepEqual(sliceLocationPage(karisik, 1, 3), [9, 3, 7], "sıralama yapılmaz");
});

// ── Linkler + kompakt liste ─────────────────────────────────────────────────

test("href: 'Tümü' sorgusuz yol; çip ?category (page yok); sayfa linki category korunur, page=1 yazılmaz", () => {
  assert.equal(locationPageHref(BASE), BASE);
  assert.equal(locationPageHref(BASE, { page: 1 }), BASE);
  assert.equal(locationPageHref(BASE, { page: 2 }), `${BASE}?page=2`);
  assert.equal(locationPageHref(BASE, { category: "roses" }), `${BASE}?category=roses`);
  assert.equal(locationPageHref(BASE, { category: "roses", page: 1 }), `${BASE}?category=roses`);
  assert.equal(locationPageHref(BASE, { category: "roses", page: 3 }), `${BASE}?category=roses&page=3`);
  assert.equal(locationPageHref(BASE, { category: null, page: 4 }), `${BASE}?page=4`);
  assert.equal(locationPageHref("/ru/istanbul", { category: "розы & ко", page: 2 }), `/ru/istanbul?category=${encodeURIComponent("розы & ко")}&page=2`);
});

/** Kompakt liste değişmezleri: ≤ 7 öğe, 1 ve son her zaman, geçerli sayfa var, artan, ardışık boşluk yok, tek sayfalık boşluk yok. */
function kompaktDogrula(current: number, total: number) {
  const list = compactPageList(current, total);
  const msg = `p=${current}/${total}: ${JSON.stringify(list)}`;
  assert.ok(list.length <= 7, msg);
  assert.equal(list[0], 1, msg);
  assert.equal(list[list.length - 1], total, msg);
  assert.ok(list.includes(Math.min(total, Math.max(1, current))), msg);
  const nums = list.filter((x): x is number => x !== "gap");
  for (let i = 1; i < nums.length; i++) assert.ok(nums[i] > nums[i - 1], msg);
  for (let i = 1; i < list.length; i++) {
    if (list[i] === "gap") {
      assert.notEqual(list[i - 1], "gap", msg);
      const next = list[i + 1] as number;
      assert.ok(next - (list[i - 1] as number) > 2, `tek sayfalık boşluk '…' olmaz — ${msg}`);
    } else if (list[i - 1] !== "gap") {
      assert.equal(list[i], (list[i - 1] as number) + 1, `boşluksuz komşular ardışık — ${msg}`);
    }
  }
  if (total <= 7) assert.deepEqual(list, range(1, total), msg);
}

test("kompakt sayfa listesi: 1..40 sayfanın her konumunda değişmezler", () => {
  for (let total = 1; total <= 40; total++) for (let p = 1; p <= total; p++) kompaktDogrula(p, total);
});

test("kompakt sayfa listesi: 1 ve 6 sayfa hepsi; 20 sayfa 1 … p-1 p p+1 … son", () => {
  assert.deepEqual(compactPageList(1, 1), [1]);
  for (let p = 1; p <= 6; p++) assert.deepEqual(compactPageList(p, 6), [1, 2, 3, 4, 5, 6], `6 sayfa p=${p}`);
  assert.deepEqual(compactPageList(1, 20), [1, 2, "gap", 20]);
  assert.deepEqual(compactPageList(2, 20), [1, 2, 3, "gap", 20]);
  assert.deepEqual(compactPageList(3, 20), [1, 2, 3, 4, "gap", 20]);
  assert.deepEqual(compactPageList(4, 20), [1, 2, 3, 4, 5, "gap", 20]);
  assert.deepEqual(compactPageList(5, 20), [1, "gap", 4, 5, 6, "gap", 20]);
  assert.deepEqual(compactPageList(10, 20), [1, "gap", 9, 10, 11, "gap", 20]);
  assert.deepEqual(compactPageList(17, 20), [1, "gap", 16, 17, 18, 19, 20]);
  assert.deepEqual(compactPageList(18, 20), [1, "gap", 17, 18, 19, 20]);
  assert.deepEqual(compactPageList(20, 20), [1, "gap", 19, 20]);
  assert.deepEqual(compactPageList(8, 8), [1, "gap", 7, 8]);
  assert.deepEqual(compactPageList(99, 20), [1, "gap", 19, 20], "aralık dışı → son sayfaya sıkıştırılır");
  assert.deepEqual(compactPageList(Number.NaN, 20), [1, 2, "gap", 20]);
});

test("navigasyon modeli: tek sayfada null; Önceki/Sonraki uçlarda null; aria-current tek; category korunur", () => {
  assert.equal(locationPagination(BASE, null, 1, 1), null, "tek sayfa → nav yok");
  assert.equal(locationPagination(BASE, "roses", 1, 0), null);
  const ilk = locationPagination(BASE, null, 1, 6)!;
  assert.equal(ilk.prevHref, null);
  assert.equal(ilk.nextHref, `${BASE}?page=2`);
  assert.deepEqual(ilk.items.map((i) => (i.kind === "page" ? [i.page, i.href, i.current] : "gap")), [
    [1, BASE, true], [2, `${BASE}?page=2`, false], [3, `${BASE}?page=3`, false],
    [4, `${BASE}?page=4`, false], [5, `${BASE}?page=5`, false], [6, `${BASE}?page=6`, false],
  ]);
  const orta = locationPagination(BASE, "roses", 10, 20)!;
  assert.equal(orta.prevHref, `${BASE}?category=roses&page=9`);
  assert.equal(orta.nextHref, `${BASE}?category=roses&page=11`);
  assert.equal(orta.items.filter((i) => i.kind === "page" && i.current).length, 1);
  const gapKeys = orta.items.filter((i) => i.kind === "gap").map((i) => (i.kind === "gap" ? i.key : ""));
  assert.equal(new Set(gapKeys).size, gapKeys.length, "boşluk anahtarları benzersiz");
  const ikinci = locationPagination(BASE, "roses", 2, 3)!;
  assert.equal(ikinci.prevHref, `${BASE}?category=roses`, "1. sayfaya dönüş page yazmaz");
  const son = locationPagination(BASE, null, 20, 20)!;
  assert.equal(son.nextHref, null);
  assert.equal(locationPagination(BASE, null, 50, 20)!.page, 20, "aralık dışı sayfa sıkıştırılır");
});

// ── Tek giriş noktası: sıra → dilim → görünüm ──────────────────────────────

const prod = (id: number) => ({ id });
const kat = (id: number, slug: string, ids: number[]): CatalogCategory => ({ id, slug, name: slug.toUpperCase(), image: null, image_source: null, product_ids: ids });
// 60 ürün; katalog sırası 60..1 (API sırası), öne çıkanlar 7 ve 42 önce.
const PRODUCTS = range(1, 60).reverse().map(prod);
const ROSES = [5, 50, 12, 33, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]; // 30, Admin sırası
const plan = planLocationPage({
  featured_ids: [7, 42],
  products: PRODUCTS,
  categories: [kat(3, "orchids", [60, 59, 58]), kat(4, "lilies", []), kat(1, "roses", ROSES)],
});

test("görünüm: 'Tümü' = allOrder (öne çıkanlar önce) SIRALANDIKTAN SONRA dilimlenir; yalnız 24 id", () => {
  const v1 = resolveLocationCatalog(plan, {}, BASE, "All");
  assert.equal(v1.category, null);
  assert.equal(v1.page, 1);
  assert.equal(v1.total, 60);
  assert.equal(v1.totalPages, 3);
  assert.deepEqual(v1.ids, plan.allOrder.slice(0, 24));
  assert.deepEqual(v1.ids.slice(0, 3), [7, 42, 60], "öne çıkanlar ilk sayfanın başında");
  const v3 = resolveLocationCatalog(plan, { page: "3" }, BASE, "All");
  assert.deepEqual(v3.ids, plan.allOrder.slice(48, 60));
  assert.equal(v3.ids.length, 12);
  // Sayfalar birleşince tam sıra (tekrar yok, kayıp yok, yeniden sıralama yok)
  const hepsi = [1, 2, 3].flatMap((p) => resolveLocationCatalog(plan, { page: String(p) }, BASE, "All").ids);
  assert.deepEqual(hepsi, plan.allOrder);
});

test("görünüm: kategori = Admin sırası (product_ids) dilimi; sayfa linkleri category korur", () => {
  const v = resolveLocationCatalog(plan, { category: "roses", page: "2" }, BASE, "All");
  assert.equal(v.category, "roses");
  assert.equal(v.total, 30);
  assert.equal(v.totalPages, 2);
  assert.deepEqual(v.ids, ROSES.slice(24, 30), "sayısal değil Admin sırası");
  assert.equal(v.pagination!.prevHref, `${BASE}?category=roses`);
  assert.equal(v.pagination!.nextHref, null);
  const tek = resolveLocationCatalog(plan, { category: "orchids", page: "2" }, BASE, "All");
  assert.equal(tek.page, 1, "3 ürünlük kategoride ?page=2 → 1");
  assert.equal(tek.pagination, null, "tek sayfa → nav yok");
  assert.deepEqual(tek.ids, [60, 59, 58]);
});

test("görünüm: geçersiz category/page normalize (Tümü / 1); searchParams yok → 1. sayfa Tümü", () => {
  for (const sp of [undefined, null, {}, { category: "yok" }, { category: "lilies" }, { page: "abc" }, { page: "4" }, { category: ["yok"], page: ["0"] }]) {
    const v = resolveLocationCatalog(plan, sp, BASE, "All");
    assert.equal(v.category, null, JSON.stringify(sp));
    assert.equal(v.page, 1, JSON.stringify(sp));
    assert.deepEqual(v.ids, plan.allOrder.slice(0, 24));
  }
  const kat2 = resolveLocationCatalog(plan, { category: "yok", page: "2" }, BASE, "All");
  assert.equal(kat2.category, null);
  assert.equal(kat2.page, 2, "bilinmeyen filtre yok sayılır, sayfa Tümü listesine göre");
});

test("görünüm: çipler gerçek link + filtre-bağımsız sayılar; ürünsüz kategori çipi yok; çip linki page taşımaz", () => {
  const a = resolveLocationCatalog(plan, { page: "2" }, BASE, "All");
  const b = resolveLocationCatalog(plan, { category: "roses", page: "2" }, BASE, "All");
  const ozet = (v: typeof a) => v.chips.map((c) => [c.key, c.label, c.count, c.href]);
  assert.deepEqual(ozet(a), [
    [null, "All", 60, BASE],
    ["orchids", "ORCHIDS", 3, `${BASE}?category=orchids`],
    ["roses", "ROSES", 30, `${BASE}?category=roses`],
  ]);
  assert.deepEqual(ozet(a), ozet(b), "sayılar ve linkler etkin filtreden bağımsız");
  assert.deepEqual(a.chips.map((c) => c.active), [true, false, false]);
  assert.deepEqual(b.chips.map((c) => c.active), [false, false, true]);
  assert.deepEqual(a.chips.slice(1).map((c) => c.key), plan.tiles.map((t) => t.slug), "çipler kategori kartlarıyla aynı (API) sıra");
  assert.ok(a.chips.every((c) => !c.href.includes("page=")));
});

test("görünüm: RSC/istemciye giden model tam listeyi TAŞIMAZ (yalnız dilim id'leri + çip sayıları)", () => {
  const v = resolveLocationCatalog(plan, { page: "2" }, BASE, "All");
  assert.deepEqual(Object.keys(v).sort(), ["category", "chips", "ids", "page", "pagination", "total", "totalPages"]);
  const json = JSON.stringify(v);
  assert.ok(!json.includes("allOrder") && !json.includes("byId"));
  assert.equal(v.ids.length, LOCATION_PAGE_SIZE);
  assert.deepEqual(v.ids, plan.allOrder.slice(24, 48));
  const disarida = plan.allOrder.filter((id) => !v.ids.includes(id));
  assert.equal(disarida.length, 36, "diğer 36 ürün id'si modelde yok");
  assert.ok(disarida.every((id) => !new RegExp(`[\\[,]${id}[,\\]]`).test(JSON.stringify(v.ids))));
});

test("görünüm: fail-closed (ürünsüz lokasyon) → 0 ürün, tek sayfa, nav yok, yalnız 'Tümü 0'", () => {
  const bos = planLocationPage({ featured_ids: [], products: [], categories: [kat(1, "roses", [])] });
  const v = resolveLocationCatalog(bos, { page: "2", category: "roses" }, BASE, "All");
  assert.deepEqual([v.total, v.page, v.totalPages, v.ids, v.pagination], [0, 1, 1, [], null]);
  assert.deepEqual(v.chips.map((c) => [c.key, c.count]), [[null, 0]]);
});

test("devam sayfası: yalnız katalog görünümü + ?page ≥ 2 + ürün alanı sırada iken", () => {
  const order = renderableLocationSections(DEFAULT_LOCATION_SECTIONS, { cargo: false });
  assert.equal(isLocationContinuationPage(null, order), false, "yedek yol (katalog yok)");
  assert.equal(isLocationContinuationPage({ page: 1 }, order), false);
  assert.equal(isLocationContinuationPage({ page: 2 }, order), true);
  const cargoOrder = renderableLocationSections(DEFAULT_LOCATION_SECTIONS, { cargo: true });
  assert.equal(isLocationContinuationPage({ page: 3 }, cargoOrder), true, "kargo aynı kural");
  const kapali = renderableLocationSections(parseLocationSections([{ id: "commerce", enabled: false }]), { cargo: false });
  assert.equal(isLocationContinuationPage({ page: 2 }, kapali), false, "Admin ürün alanını kapattıysa normal sayfa");
});

test("etiketler: 13 dilde Önceki / Sonraki / Sayfa {n} / nav adı dolu ve yerelleştirilmiş", () => {
  assert.equal(GLOBAL_LOCALES.length, 13);
  assert.deepEqual(Object.keys(LOCATION_PAGING_LABELS).sort(), [...GLOBAL_LOCALES].sort());
  for (const l of GLOBAL_LOCALES) {
    const x = LOCATION_PAGING_LABELS[l];
    for (const k of ["nav", "prev", "next", "page"] as const) assert.ok(x[k].trim().length > 0, `${l}.${k}`);
    assert.ok(x.page.includes("{n}"), `${l}: {n}`);
    assert.notEqual(x.prev, x.next, l);
    assert.ok(locationPageLabel(l, 3).includes("3") && !locationPageLabel(l, 3).includes("{n}"), l);
    if (l !== "en") assert.notEqual(x.prev, "Previous", `${l}: İngilizceye düşmez`);
  }
  assert.equal(locationPageLabel("de", 2), "Seite 2");
  assert.equal(locationPageLabel("zh", 2), "第 2 页");
});

// ── Kaynak korumaları (JSX çalışma zamanı Next + DB ister) ────────────────────

const page = oku("./global/page.tsx");
const browser = oku("../components/global/GlobalCatalogBrowser.tsx");
const pager = oku("../components/global/GlobalPagination.tsx");
const fn = (name: string) => {
  const a = page.indexOf(`function ${name}(`);
  assert.ok(a > 0, `${name} bulunmalı`);
  return page.slice(a, page.indexOf("\n}\n", a));
};
/** Gizleme işareti: hidden sınıfı / hidden özniteliği / display:none / invisible (aria-hidden hariç). */
const GIZLEME = /(?<![\w-])hidden\b|display:\s*["']?none|\binvisible\b/;

test("KAYNAK: GlobalCatalogBrowser yalnız dilimi alır ve basar; istemci durumu yok; tam liste prop'u yok; gizleme yok", () => {
  assert.ok(!browser.includes('"use client"'), "Server Component — RSC istemci prop'u serileştirilmez");
  assert.ok(!/\buse(State|Memo|Effect)\b/.test(browser));
  const props = browser.slice(browser.indexOf("export function GlobalCatalogBrowser("), browser.indexOf(") {", browser.indexOf("export function GlobalCatalogBrowser(")));
  assert.ok(!/\ballOrder\b|\bcategories\s*:|\bbyId\b/.test(props), "tam liste / kategori id listeleri prop değil");
  assert.match(props, /view: Pick<LocationCatalogView, "category" \| "page" \| "chips" \| "pagination">/, "view 'ids'/'total' dışında liste taşımaz");
  assert.ok(browser.includes("{items.map((it, idx) => ("), "ızgara yalnız items (dilim)");
  assert.ok(!GIZLEME.test(browser), "gizli ürün / gizli link markup'ı yok");
  assert.ok(browser.includes("<GlobalPagination locale={locale} pagination={view.pagination} />"));
  assert.ok(browser.includes("prefetch={false}"));
});

test("KAYNAK: page.tsx dilimi kart modeline çevirir (İstanbul + kargo); tam katalog kart/prop olarak geçmez", () => {
  // 24 Eyl 2026: 4. parametre = aynı gün rozeti (kargo: false, nötr: !note) — dilim aynı
  assert.equal(page.split("catalogItems(locale, plan, view.ids,").length - 1, 2, "commerce + kargo aynı dilim");
  assert.ok(!page.includes("plan.byId.values()"), "tüm ürünler kart modeline çevrilmez");
  assert.ok(!page.includes("allOrder={"), "allOrder bileşene prop geçmez");
  assert.ok(!page.includes("flattenPlan(plan)"), "kargo tam listeyi kart modeline çevirmez");
  assert.equal(page.split("resolveLocationCatalog(").length - 1, 1, "görünüm tek yerde, bir kez");
  assert.equal(page.split("planLocationPage(").length - 1, 1);
  assert.match(page, /resolveLocationCatalog\(plan, searchParams, `\/\$\{locale\}\/\$\{row\.page_key\}`, SHOP\[locale\]\.all\)/, "linkler canonical sorgusuz yoldan");
  const items = fn("catalogItems");
  assert.match(items, /return ids\s*\.map\(\(id\) => plan\.byId\.get\(id\)\)/);
  for (const name of ["CatalogCommerceSection", "CargoCatalogSection"]) {
    const src = fn(name);
    assert.match(src, /<GlobalCatalogBrowser locale=\{locale\} items=\{catalogItems\(locale, plan, view\.ids, (!note|false)\)\} view=\{view\} \/>/, name);
    assert.ok(!GIZLEME.test(src), `${name}: gizleme yok`);
  }
});

test("KAYNAK: devam sayfası (?page ≥ 2) hero'da giriş yok, yalnız ürün alanı; sarmalayıcılar + animasyon tavanı + yedek kartlar korunur", () => {
  const body = page.slice(page.indexOf("async function GlobalPageBody"), page.indexOf("// ---- Sayfa"));
  assert.match(body, /const continuation = isLocationContinuationPage\(view, order\);/);
  assert.match(body, /const block = \(id: LocationSectionId\) => \{[\s\S]*?if \(continuation && id !== "commerce"\) return null;\s*const node = render\(id\);/);
  assert.ok(body.includes("{!continuation && row.intro_html ?"), "giriş yalnız 1. sayfada");
  assert.ok(body.includes("<h1 style={S.h1}>{row.h1}</h1>") && body.includes("{kirinti}"), "kırıntı + H1 her sayfada");
  assert.ok(body.includes('data-location-section="hero"') && body.includes("data-location-section={id}") && body.includes("{order.map(block)}"));
  // 24 Eyl 2026: nötr modda ürün alanı üst notu (vaat yerine "ödemede doğrulanır") additive prop olarak geçer
  assert.match(body, /plan=\{plan\} view=\{view\} \/>\s*: <CatalogCommerceSection locale=\{locale\} catalog=\{catalog\} plan=\{plan\} view=\{view\} note=\{neutral \? REACH\[locale\]\.catalogNote\(neutralPlace\) : undefined\} \/>/);
  assert.ok(page.includes("tiles = fallbackCategoryCards(catalog.categories)"));
  assert.ok(browser.includes("idx={Math.min(idx, 7)}") && !/<ProductCard[^>]*idx=\{idx\}/.test(page));
  // Metadata / canonical sorguyu okumaz (canonical sorgusuz yol DEĞİŞMEZ)
  const meta = page.slice(page.indexOf("export async function localeMetadata"), page.indexOf("// ---- Ortak parçalar"));
  assert.ok(!/searchParams|[?&]page=|category=/.test(meta));
  assert.ok(meta.includes("const self = absoluteUrl(`/${locale}/${row.page_key}`);"));
  // Ek istek yok: sayfa dalı yine aynı 4 çağrı
  const localePage = page.slice(page.indexOf("export async function LocalePage"));
  const pageBranch = localePage.slice(localePage.indexOf('if (parsed.kind === "page")'), localePage.indexOf('if (parsed.kind === "category")'));
  assert.deepEqual([...new Set(pageBranch.match(/\b(fetch\w+|v80Contact)\(/g) ?? [])].sort(), ["fetchGlobalCatalog(", "fetchGlobalPage(", "fetchLocaleCatalog(", "v80Contact("].sort());
  assert.ok(pageBranch.includes("searchParams={searchParams}"));
});

test("KAYNAK: GlobalPagination — <nav aria-label>, gerçek href, aria-current=page, tek sayfada yok, tek satır (sarma yok), RTL ok", () => {
  assert.ok(!pager.includes('"use client"'));
  assert.ok(pager.includes("if (!pagination) return null;"));
  assert.ok(pager.includes("<nav aria-label={l.nav}"));
  assert.ok(pager.includes('aria-current={it.current ? "page" : undefined}'));
  assert.ok(pager.includes("href={it.href}") && pager.includes("href={pagination.prevHref}") && pager.includes("href={pagination.nextHref}"));
  assert.ok(pager.includes('rel="prev"') && pager.includes('rel="next"'));
  assert.ok(pager.includes("LOCATION_PAGING_LABELS[locale]") && pager.includes("locationPageLabel(locale, it.page)"));
  const ul = pager.match(/<ul className="([^"]*)"/);
  assert.ok(ul && /\bflex\b/.test(ul[1]) && !/flex-wrap/.test(ul[1]) && /\boverflow-x-auto\b/.test(ul[1]) && /\bmax-w-full\b/.test(ul[1]), "tek satır, sayfa gövdesi taşmaz");
  assert.ok(pager.includes("rtl:rotate-180"));
  assert.ok(!GIZLEME.test(pager.replace(/aria-hidden="true"/g, "")), "sayfa linkleri gizlenmez");
});

test("KAYNAK: 13 locale rotası searchParams'ı LocalePage'e geçirir; generateMetadata ve force-dynamic DEĞİŞMEZ", () => {
  for (const l of GLOBAL_LOCALES) {
    const src = oku(`../app/${l}/[[...path]]/page.tsx`);
    assert.match(src, /^export const dynamic = "force-dynamic";$/m, l);
    assert.ok(src.includes(`export async function generateMetadata({ params }: Props): Promise<Metadata> {\n  return localeMetadata("${l}", params.path ?? []);\n}`), `${l}: generateMetadata aynen`);
    assert.ok(src.includes("export default function Page({ params, searchParams }: Props) {"), l);
    assert.ok(src.includes(`<LocalePage locale="${l}" path={params.path ?? []} searchParams={searchParams} />`), l);
    assert.match(src, /searchParams\?: \{ \[key: string\]: string \| string\[\] \| undefined \}/, l);
  }
});
