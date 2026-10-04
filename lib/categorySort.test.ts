// lib/categorySort.test.ts — TEK KATEGORİ SIRASI testleri (API stub'lanır; ağ YOK).
// Çalıştırma: node --test lib/categorySort.test.ts   (npm run test:unit)
//
// SABİTLENEN KURALLAR
//  1) Türkçe kategori listesinin varsayılan sırası sort=category_order (operatörün elle sırası);
//     müşterinin seçtiği fiyat / ad sıralamaları aynen; varsayılan sıra URL'ye yazılmaz.
//  2) DEPLOY SIRASI GÜVENLİĞİ — iki API kuşağı:
//       • YENİ API: sort=category_order → 200 (tek istek).
//       • BUGÜNKÜ API: sort=category_order → 422 → AYNI istek created_at_desc ile BİR KEZ
//         tekrarlanır; sonuç bugünkü isteğin sonucuyla aynıdır.
//  3) Ret bir kez görülünce 5 dk boyunca istek doğrudan bugünkü sırayla gider (upstream'e ek yük yok);
//     süre dolunca varsayılan sıra yeniden denenir.
//  4) Tekrar okuma katmanında (lib/api.ts) TEK yerdedir → kategori SSR'ı, sonsuz kaydırma ve PDP
//     ilgili ürünler aynı korumayı kullanır; mevcut fonksiyon imzaları değişmedi.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CATEGORY_CUSTOMER_SORTS,
  CATEGORY_DEFAULT_SORT,
  CATEGORY_SORT_FALLBACK,
  SORT_REJECTED_MEMO_MS,
  categorySortOf,
  categorySortParam,
  createSortFallback,
  isSortRejectedStatus,
} from "./categorySort.ts";

const REPO_KOK = path.resolve(import.meta.dirname, "..");

type ResolveNext = (spec: string, ctx: unknown) => unknown;
type LoadNext = (url: string, ctx: unknown) => unknown;
const { registerHooks } = (await import("node:module")) as unknown as {
  registerHooks: (hooks: {
    resolve: (spec: string, ctx: unknown, next: ResolveNext) => unknown;
    load: (url: string, ctx: unknown, next: LoadNext) => unknown;
  }) => void;
};

// lib/api.ts uzantısız import kullanır; hook YALNIZ bu test sürecinde çalışır (üretim koduna dokunmaz).
registerHooks({
  resolve(spec: string, ctx: unknown, next: ResolveNext) {
    const aday = (base: string) => {
      for (const c of [`${base}.ts`, `${base}.tsx`, `${base}.json`, base]) {
        try {
          readFileSync(c);
          return { url: pathToFileURL(c).href, shortCircuit: true };
        } catch { /* sıradaki aday */ }
      }
      return null;
    };
    if (spec.startsWith("@/")) {
      const hit = aday(path.join(REPO_KOK, spec.slice(2)));
      if (hit) return hit;
    }
    if (spec.startsWith(".")) {
      const parent = (ctx as { parentURL?: string })?.parentURL;
      if (parent?.startsWith("file:") && !parent.includes("/node_modules/")) {
        const hit = aday(path.resolve(path.dirname(fileURLToPath(parent)), spec));
        if (hit) return hit;
      }
    }
    return next(spec, ctx);
  },
  load(url: string, ctx: unknown, next: LoadNext) {
    if (url.endsWith(".json") && !url.includes("/node_modules/")) {
      const src = readFileSync(fileURLToPath(url), "utf8");
      return { format: "module", source: `export default ${src};`, shortCircuit: true };
    }
    return next(url, ctx);
  },
});

// ---------------------------------------------------------------------------
// 1) Saf kurallar
// ---------------------------------------------------------------------------

test("varsayılan sıra category_order; yedek sıra bugünkü varsayılan (created_at_desc)", () => {
  assert.equal(CATEGORY_DEFAULT_SORT, "category_order");
  assert.equal(CATEGORY_SORT_FALLBACK, "created_at_desc");
  assert.deepEqual([...CATEGORY_CUSTOMER_SORTS], ["price_asc", "price_desc", "name_asc"]);
});

test("categorySortOf: parametre yok / tanınmıyor / eski varsayılanın açık yazımı → varsayılan; müşteri sıralamaları aynen", () => {
  for (const raw of [undefined, null, "", "category_order", "created_at_desc", "foo", "PRICE_ASC", ["price_asc"], 5]) {
    assert.equal(categorySortOf(raw), "category_order", String(raw));
  }
  for (const secim of ["price_asc", "price_desc", "name_asc"]) assert.equal(categorySortOf(secim), secim);
});

test("categorySortParam: varsayılan sıra URL'ye / bağlantıya YAZILMAZ; müşteri seçimi yazılır", () => {
  assert.equal(categorySortParam("category_order"), undefined);
  assert.equal(categorySortParam(categorySortOf(undefined)), undefined);
  assert.equal(categorySortParam(undefined), undefined);
  assert.equal(categorySortParam(null), undefined);
  assert.equal(categorySortParam("price_asc"), "price_asc");
  assert.equal(categorySortParam("name_asc"), "name_asc");
});

test("isSortRejectedStatus: yalnız 422 / 400 'bu sıralamayı tanımıyorum' sayılır", () => {
  assert.equal(isSortRejectedStatus(422), true);
  assert.equal(isSortRejectedStatus(400), true);
  for (const s of [200, 204, 301, 401, 403, 404, 429, 500, 502, 503]) assert.equal(isSortRejectedStatus(s), false, String(s));
});

test("createSortFallback: not yokken istenen sıra aynen; not tazeyken yalnız VARSAYILAN sıra yedeğe çevrilir; süre dolunca yeniden denenir", () => {
  let saat = 1_000_000;
  const not = createSortFallback(() => saat);
  assert.equal(not.effective("category_order"), "category_order");
  not.noteRejected();
  assert.equal(not.effective("category_order"), "created_at_desc");
  for (const diger of ["price_asc", "price_desc", "name_asc", "created_at_desc", undefined] as const) {
    assert.equal(not.effective(diger), diger, "müşteri sıralamaları ve sırasız istek etkilenmez");
  }
  saat += SORT_REJECTED_MEMO_MS - 1;
  assert.equal(not.effective("category_order"), "created_at_desc", "5 dk dolmadan yeniden denenmez");
  saat += 1;
  assert.equal(not.effective("category_order"), "category_order", "süre doldu → varsayılan sıra yeniden denenir");
  assert.equal(SORT_REJECTED_MEMO_MS, 5 * 60_000);
});

// ---------------------------------------------------------------------------
// 2) lib/api.ts — iki API kuşağı (fetch stub)
// ---------------------------------------------------------------------------

// Not ömrü senaryolar arasında "eskitilir": saat ileri alınır (lib/localeManagedRedirect.test.ts ile aynı desen).
const gercekNow = Date.now.bind(Date);
let saatKaymasi = 0;
Date.now = () => gercekNow() + saatKaymasi;
const notuEskit = () => { saatKaymasi += SORT_REJECTED_MEMO_MS + 1_000; };

type Kusak = "yeni" | "bugunku";
let kusak: Kusak = "bugunku";
/** API'ye giden isteklerin `sort` değerleri (sırayla). */
let istekSiralari: Array<string | null> = [];
let istekUrlleri: string[] = [];
/** Bir sonraki N isteği ağ hatasına çevirir. */
let agHatasi = 0;
/** Belirli bir parametre varken 422 (sıralamadan BAĞIMSIZ ret) üretir. */
let reddedilenParametre: string | null = null;

const urunler = (sira: string) =>
  sira === "category_order"
    ? [{ id: 3, slug: "elle-1", name: "Elle 1", cover_image_url: "/r2/a.webp" }, { id: 1, slug: "elle-2", name: "Elle 2", cover_image_url: "/r2/b.webp" }]
    : [{ id: 1, slug: "elle-2", name: "Elle 2", cover_image_url: "/r2/b.webp" }, { id: 3, slug: "elle-1", name: "Elle 1", cover_image_url: "/r2/a.webp" }];

(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
  const url = new URL(String(input));
  if (url.pathname !== "/api/products") return { ok: false, status: 404, json: async () => ({}) };
  const sira = url.searchParams.get("sort");
  istekSiralari.push(sira);
  istekUrlleri.push(url.pathname + url.search);
  if (agHatasi > 0) {
    agHatasi--;
    throw new Error("other side closed");
  }
  if (reddedilenParametre && url.searchParams.has(reddedilenParametre)) {
    return { ok: false, status: 422, json: async () => ({ error: "validation_error" }) };
  }
  // Bugünkü API bilinmeyen sıralamayı 422 ile reddeder; yeni API category_order'ı tanır.
  if (sira === "category_order" && kusak === "bugunku") {
    return { ok: false, status: 422, json: async () => ({ error: "validation_error" }) };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({ items: urunler(sira ?? "created_at_desc"), pagination: { page: Number(url.searchParams.get("page") ?? 1), page_size: 50, total: 2, total_pages: 1 } }),
  };
};

const { fetchProductsPaged, fetchProducts } = await import("./api.ts");
const { loadCategoryProducts } = await import("./categoryProducts.actions.ts");

function sifirla(k: Kusak) {
  kusak = k;
  istekSiralari = [];
  istekUrlleri = [];
  agHatasi = 0;
  reddedilenParametre = null;
  notuEskit();
}

test("YENİ API: sort=category_order tek istekte 200 — elle sıra aynen gelir, tekrar yok", async () => {
  sifirla("yeni");
  const sayfa = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order"]);
  assert.deepEqual(sayfa.items.map((p) => p.slug), ["elle-1", "elle-2"]);
  assert.equal(sayfa.pagination.total, 2);
});

test("BUGÜNKÜ API: 422 → aynı istek created_at_desc ile BİR KEZ tekrarlanır; sonuç bugünkü isteğin sonucuyla AYNI", async () => {
  sifirla("bugunku");
  const yeni = await fetchProductsPaged({ category_id: 13, page_size: 50, page: 2, sort: "category_order", product_type: "flower" });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"], "bir ret + bir tekrar");
  // Tekrar edilen istek, bugünkü kodun gönderdiği isteğin bayt bayt aynısıdır (yalnız sort değişir).
  const tekrarUrl = istekUrlleri[1];
  sifirla("bugunku");
  const bugun = await fetchProductsPaged({ category_id: 13, page_size: 50, page: 2, sort: "created_at_desc", product_type: "flower" });
  assert.deepEqual(istekSiralari, ["created_at_desc"]);
  assert.equal(tekrarUrl, istekUrlleri[0], "aynı URL → aynı önbellek kaydı");
  assert.deepEqual(yeni, bugun, "sayfa bugünkü gibi çizilir");
  assert.deepEqual(yeni.items.map((p) => p.slug), ["elle-2", "elle-1"]);
});

test("BUGÜNKÜ API: ret bir kez görüldükten sonra 5 dk boyunca istek DOĞRUDAN bugünkü sırayla gider (ek 422 yok)", async () => {
  sifirla("bugunku");
  await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"]);
  for (let i = 0; i < 5; i++) await fetchProductsPaged({ category_id: 20 + i, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari.slice(2), Array(5).fill("created_at_desc"), "not tazeyken upstream'e ek istek binmez");
  // Müşteri sıralamaları nottan etkilenmez.
  await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "price_asc" });
  assert.equal(istekSiralari.at(-1), "price_asc");
});

test("API YAYINLANDI: not süresi dolunca varsayılan sıra yeniden denenir ve bu kez kabul edilir", async () => {
  sifirla("bugunku");
  await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  kusak = "yeni";
  istekSiralari = [];
  const notluyken = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["created_at_desc"], "not tazeyken hâlâ bugünkü sıra");
  assert.deepEqual(notluyken.items.map((p) => p.slug), ["elle-2", "elle-1"]);
  notuEskit();
  istekSiralari = [];
  const sonra = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order"]);
  assert.deepEqual(sonra.items.map((p) => p.slug), ["elle-1", "elle-2"], "en geç 5 dk sonra elle sıra devrede");
});

test("müşterinin seçtiği sıralamalar ve sırasız istekler HİÇ tekrarlanmaz (422 bugünkü gibi boş sayfaya düşer)", async () => {
  sifirla("bugunku");
  await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "price_desc" });
  await fetchProductsPaged({ category_id: 13, page_size: 8 });
  assert.deepEqual(istekSiralari, ["price_desc", null]);
  // Sıralamadan bağımsız bir ret (ör. geçersiz filtre): müşteri sıralamasında tekrar yok → iki deneme, boş sayfa.
  sifirla("yeni");
  reddedilenParametre = "product_type";
  const bos = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "name_asc", product_type: "zzz" });
  assert.deepEqual(istekSiralari, ["name_asc", "name_asc"], "bugünkü iki deneme (önbellekli + no-store)");
  assert.deepEqual(bos, { items: [], pagination: { page: 1, page_size: 50, total: 0, total_pages: 1 } });
});

test("sıralamadan BAĞIMSIZ ret notu DÜŞÜRMEZ: tekrar da reddedilirse sonraki istek varsayılan sırayı yine dener", async () => {
  sifirla("yeni");
  reddedilenParametre = "product_type";
  const bos = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order", product_type: "zzz" });
  assert.equal(bos.pagination.total, 0);
  assert.equal(istekSiralari[0], "category_order");
  assert.ok(istekSiralari.slice(1).every((s) => s === "created_at_desc"), "ret sonrası bu çağrı yedek sırayla sürer");
  reddedilenParametre = null;
  istekSiralari = [];
  const sayfa = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order"], "başka bir parametrenin reddi 'API bu sırayı tanımıyor' sayılmadı");
  assert.deepEqual(sayfa.items.map((p) => p.slug), ["elle-1", "elle-2"]);
});

test("category_id OLMADAN istenen kategori sırası reddedilirse yedeğe düşülür ama not düşülmez (sözleşme: category_id ile geçerli)", async () => {
  sifirla("bugunku");
  const sayfa = await fetchProductsPaged({ page_size: 8, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"]);
  assert.equal(sayfa.items.length, 2);
  kusak = "yeni";
  istekSiralari = [];
  await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order"], "not düşülmediği için kategori isteği doğrudan elle sırayı dener");
});

test("ağ hatası: bugünkü iki deneme aynen (önbellekli → no-store); ret tekrarı ikinci denemede de çalışır", async () => {
  sifirla("bugunku");
  agHatasi = 1;
  const sayfa = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "category_order", "created_at_desc"]);
  assert.deepEqual(sayfa.items.map((p) => p.slug), ["elle-2", "elle-1"]);
  // Tüm denemeler başarısız → bugünkü yedek sayfa (boş), fırlatmaz.
  sifirla("yeni");
  agHatasi = 9;
  const bos = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(bos, { items: [], pagination: { page: 1, page_size: 50, total: 0, total_pages: 1 } });
});

test("her çağıran aynı korumadan yararlanır: fetchProducts (PDP ilgili ürünler) ve sonsuz kaydırma action'ı", async () => {
  sifirla("bugunku");
  const ilgili = await fetchProducts({ category_id: 13, page_size: 20, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"]);
  assert.deepEqual(ilgili.map((p) => p.slug), ["elle-2", "elle-1"]);

  sifirla("bugunku");
  const kaydirma = await loadCategoryProducts({ categoryId: 13, page: 2, pageSize: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"]);
  assert.deepEqual(kaydirma.items.map((p) => p.slug), ["elle-2", "elle-1"]);
  assert.equal(kaydirma.total, 2);

  sifirla("yeni");
  const yeniKaydirma = await loadCategoryProducts({ categoryId: 13, page: 2, pageSize: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order"]);
  assert.deepEqual(yeniKaydirma.items.map((p) => p.slug), ["elle-1", "elle-2"]);
});

// ---------------------------------------------------------------------------
// 3) Kaynak nöbeti
// ---------------------------------------------------------------------------

test("KAYNAK: varsayılan sıra tek sabitten; tekrar yalnız okuma katmanında; imzalar değişmedi", () => {
  const oku = (p: string) => readFileSync(path.join(REPO_KOK, p), "utf8");
  const api = oku("lib/api.ts");
  assert.ok(api.includes("export async function fetchProductsPaged(params: PublicProductListParams & { page?: number } = {}): Promise<ProductPage> {"));
  assert.ok(api.includes("export async function fetchProducts(params: PublicProductListParams = {}): Promise<PublicProductListItem[]> {"));
  assert.ok(api.includes("if (sort === CATEGORY_DEFAULT_SORT && isSortRejectedStatus(res.status)) {"));
  assert.ok(api.includes("if (res.ok && params.category_id) categorySortFallback.noteRejected();"));
  // Tekrar mantığı başka hiçbir dosyada yazılmadı.
  for (const dosya of ["components/category/CategoryLanding.tsx", "lib/categoryProducts.actions.ts", "app/urun/[slug]/page.tsx", "app/kategori/[...slug]/page.tsx", "lib/global/page.tsx"]) {
    assert.ok(!oku(dosya).includes("isSortRejectedStatus"), dosya);
  }
  // PDP ilgili ürünler (TR + locale) birincil kategorinin varsayılan sırasını ister.
  const ilgili = "fetchProducts({ category_id: primaryCat.category_id, page_size: 20, sort: CATEGORY_DEFAULT_SORT })";
  assert.ok(oku("app/urun/[slug]/page.tsx").includes(ilgili));
  assert.ok(oku("lib/global/page.tsx").includes(ilgili));
  // FilterBar: "Önerilen Sıralama" = varsayılan sıra; seçilince parametre URL'den silinir.
  const bar = oku("components/category/FilterBar.tsx");
  assert.ok(bar.includes('{ key: CATEGORY_DEFAULT_SORT, label: "Önerilen Sıralama" },'));
  assert.ok(bar.includes('onClick={() => setParam("sort", categorySortParam(s.key) ?? null)}'));
  assert.ok(bar.includes('const curSort = categorySortOf(sp.get("sort"));'));
  for (const etiket of ['{ key: "price_asc", label: "Artan Fiyat" }', '{ key: "price_desc", label: "Azalan Fiyat" }', '{ key: "name_asc", label: "A → Z" }']) {
    assert.ok(bar.includes(etiket), `müşteri sıralaması aynen: ${etiket}`);
  }
  // Sayfalama bağlantıları ve canonical varsayılan sırayı taşımaz.
  const landing = oku("components/category/CategoryLanding.tsx");
  assert.ok(landing.includes("sort: categorySortParam(sort),"));
  assert.ok(!oku("lib/categoryPagination.ts").includes("category_order"), "canonical / bağlantı kuralı sıralamayı bilmez");
});
