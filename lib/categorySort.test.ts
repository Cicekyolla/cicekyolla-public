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
//  5) FAIL-OPEN — HER başarısızlık: varsayılan sıra isteği ağ hatası / 5xx verirse ya da süresinde
//     yanıtlanmazsa AYNI istek bugünkü sırayla, AYNI önbellek ayarıyla gönderilir (bugünkü isteğin
//     Data Cache kaydı kullanılır; API kesintisinde liste boşalmaz). Not yalnız ret (422/400) ile düşer.
//  6) KABUL NOTU: API varsayılan sırayı kabul ettikten sonra akış bugünkü isteğin akışıyla birebir
//     aynıdır (süre sınırı yok, hata olursa aynı istek no-store ile) — yavaş yanıt / geçici hata listeyi
//     bugünkü sıraya çevirmez; yalnız ret (API geri alındı) çevirir.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CATEGORY_CUSTOMER_SORTS,
  CATEGORY_DEFAULT_SORT,
  CATEGORY_ORDER_DEADLINE_MS,
  CATEGORY_SORT_FALLBACK,
  SORT_ACCEPTED_MEMO_MS,
  SORT_REJECTED_MEMO_MS,
  categorySortOf,
  categorySortParam,
  createSortFallback,
  isSortRejectedStatus,
  settledWithin,
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

test("createSortFallback — kabul notu: başarılı yanıtla düşer / yenilenir, süresi dolunca ve ret görülünce silinir", () => {
  let saat = 1_000_000;
  const not = createSortFallback(() => saat);
  assert.equal(not.accepted(), false, "başlangıçta bilinmiyor");
  not.noteAccepted();
  assert.equal(not.accepted(), true);
  assert.equal(not.effective("category_order"), "category_order", "kabul notu sıralamayı değiştirmez");
  saat += SORT_ACCEPTED_MEMO_MS - 1;
  assert.equal(not.accepted(), true);
  not.noteAccepted(); // her başarılı yanıt notu yeniler
  saat += SORT_ACCEPTED_MEMO_MS - 1;
  assert.equal(not.accepted(), true, "yenilendi");
  saat += 1;
  assert.equal(not.accepted(), false, "süre doldu → yeniden 'bilinmiyor' (süre sınırı geri gelir)");
  // API geri alındı: ret kabul notunu siler, ret notu devreye girer.
  not.noteAccepted();
  not.noteRejected();
  assert.equal(not.accepted(), false);
  assert.equal(not.effective("category_order"), "created_at_desc");
  assert.equal(SORT_ACCEPTED_MEMO_MS, 5 * 60_000);
});

test("settledWithin: süresinde sonuçlanan söz değerini verir; reddedilen ya da süresi dolan söz null — asla fırlatmaz", async () => {
  assert.equal(await settledWithin(Promise.resolve("tamam"), 50), "tamam");
  assert.equal(await settledWithin(Promise.reject(new Error("other side closed")), 50), null, "ret → null");
  const t0 = Date.now();
  assert.equal(await settledWithin(new Promise<string>(() => { /* asılı kalır */ }), 30), null, "süre doldu → null");
  assert.ok(Date.now() - t0 < 1_000, "süre sınırı kadar beklenir");
  // Süre dolduktan SONRA reddedilen söz işlenmemiş ret (unhandledRejection) üretmez.
  let yakalanmamis = 0;
  const say = () => { yakalanmamis++; };
  process.on("unhandledRejection", say);
  let reddet: (e: Error) => void = () => {};
  const gec = new Promise<string>((_, reject) => { reddet = reject; });
  assert.equal(await settledWithin(gec, 10), null);
  reddet(new Error("geç gelen hata"));
  await new Promise((r) => setTimeout(r, 20));
  process.off("unhandledRejection", say);
  assert.equal(yakalanmamis, 0);
  // Süre dolduktan sonra gelen DEĞER de yok sayılır (ilk sonuç geçerlidir).
  let coz: (v: string) => void = () => {};
  const gecDeger = settledWithin(new Promise<string>((resolve) => { coz = resolve; }), 10);
  assert.equal(await gecDeger, null);
  coz("geç");
  assert.equal(CATEGORY_ORDER_DEADLINE_MS, 2_500);
  // Süre sınırı null: beklenir (zamanlayıcı yok); ret yine null'a çevrilir.
  assert.equal(await settledWithin(new Promise<string>((resolve) => setTimeout(() => resolve("yavaş"), 40)), null), "yavaş");
  assert.equal(await settledWithin(Promise.reject(new Error("other side closed")), null), null);
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
/** API'ye giden isteklerin önbellek ayarı (sırayla): "revalidate:120" | "no-store". */
let istekOnbellekleri: string[] = [];
/** Varsayılan sıra (category_order) isteğinin arızası: durum kodu, ağ hatası ya da hiç yanıtlanmama. */
let varsayilanSiraArizasi: number | "throw" | "hang" | null = null;
/** true → API tamamen kapalı: HER istek ağ hatası verir. */
let apiKapali = false;
/** Varsayılan sıra (category_order) yanıtının gecikmesi (ms) — "API yavaş" senaryosu. */
let varsayilanSiraGecikmeMs = 0;

const urunler = (sira: string) =>
  sira === "category_order"
    ? [{ id: 3, slug: "elle-1", name: "Elle 1", cover_image_url: "/r2/a.webp" }, { id: 1, slug: "elle-2", name: "Elle 2", cover_image_url: "/r2/b.webp" }]
    : [{ id: 1, slug: "elle-2", name: "Elle 2", cover_image_url: "/r2/b.webp" }, { id: 3, slug: "elle-1", name: "Elle 1", cover_image_url: "/r2/a.webp" }];

(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown, init?: unknown) => {
  const url = new URL(String(input));
  if (url.pathname !== "/api/products") return { ok: false, status: 404, json: async () => ({}) };
  const sira = url.searchParams.get("sort");
  istekSiralari.push(sira);
  istekUrlleri.push(url.pathname + url.search);
  const ayar = init as { cache?: string; next?: { revalidate?: number } } | undefined;
  istekOnbellekleri.push(ayar?.cache === "no-store" ? "no-store" : `revalidate:${ayar?.next?.revalidate}`);
  if (apiKapali) throw new Error("other side closed");
  if (sira === "category_order" && varsayilanSiraGecikmeMs > 0) await new Promise((resolve) => setTimeout(resolve, varsayilanSiraGecikmeMs));
  if (sira === "category_order" && varsayilanSiraArizasi !== null) {
    if (varsayilanSiraArizasi === "throw") throw new Error("other side closed");
    if (varsayilanSiraArizasi === "hang") return new Promise(() => { /* hiç yanıtlanmaz */ });
    return { ok: false, status: varsayilanSiraArizasi, json: async () => ({ error: "upstream" }) };
  }
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
  istekOnbellekleri = [];
  varsayilanSiraArizasi = null;
  apiKapali = false;
  varsayilanSiraGecikmeMs = 0;
  notuEskit();
}

test("YENİ API: sort=category_order tek istekte 200 — elle sıra aynen gelir, tekrar yok", async () => {
  sifirla("yeni");
  const sayfa = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order"]);
  assert.deepEqual(sayfa.items.map((p) => p.slug), ["elle-1", "elle-2"]);
  assert.equal(sayfa.pagination.total, 2);
  assert.equal(sayfa.answered, true);
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
  assert.equal(bos.answered, undefined, "okunamayan sayfa 'yanıt verdi' sayılmaz");
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

test("ağ hatası: varsayılan sıra isteği düşerse HEMEN bugünkü isteğe geçilir (aynı önbellek ayarı); her şey düşerse bugünkü iki deneme + boş sayfa", async () => {
  sifirla("bugunku");
  agHatasi = 1;
  const sayfa = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"], "varsayılan sıra ikinci kez denenmez");
  assert.deepEqual(istekOnbellekleri, ["revalidate:120", "revalidate:120"], "bugünkü istek AYNI önbellek ayarıyla → Data Cache kaydı kullanılır");
  assert.deepEqual(sayfa.items.map((p) => p.slug), ["elle-2", "elle-1"]);
  assert.equal(sayfa.answered, true);
  // Tüm denemeler başarısız → bugünkü yedek sayfa (boş), fırlatmaz. Bugünkü isteğin iki denemesi aynen (önbellekli → no-store).
  sifirla("yeni");
  apiKapali = true;
  const bos = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  assert.deepEqual(bos, { items: [], pagination: { page: 1, page_size: 50, total: 0, total_pages: 1 } });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc", "created_at_desc"]);
  assert.deepEqual(istekOnbellekleri, ["revalidate:120", "revalidate:120", "no-store"]);
});

// ---------------------------------------------------------------------------
// EK (FAIL-OPEN — her başarısızlık): vitrin API'den önce yayınlandığında API kesintisi / yavaşlığı
// kategori sayfasını boşaltmamalı — bugünkü isteğin (created_at_desc) Data Cache kaydı kullanılmalı.
// Next 14.2 Data Cache modeli: yalnız 200 saklanır; kayıt varsa (bayat da olsa) ağa gitmeden döner.
// ---------------------------------------------------------------------------
for (const [ad, ariza] of [["ağ hatası", "throw"], ["503", 503], ["502", 502], ["500", 500], ["404", 404]] as const) {
  test(`FAIL-OPEN: varsayılan sıra isteği ${ad} verirken bugünkü istek yanıtlanabiliyorsa liste BUGÜNKÜ gibi gelir (answered) ve not düşülmez`, async () => {
    sifirla("bugunku");
    varsayilanSiraArizasi = ariza;
    const sayfa = await fetchProductsPaged({ category_id: 13, page_size: 50, page: 3, sort: "category_order", product_type: "flower" });
    assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"]);
    assert.deepEqual(istekOnbellekleri, ["revalidate:120", "revalidate:120"]);
    assert.deepEqual(sayfa.items.map((p) => p.slug), ["elle-2", "elle-1"]);
    assert.equal(sayfa.answered, true, "kategori 'okunamadı' sayılmaz");
    // Geçiş isteği bugünkü isteğin bayt bayt aynısı (aynı URL → aynı Data Cache kaydı).
    const gecisUrl = istekUrlleri[1];
    varsayilanSiraArizasi = null;
    istekSiralari = [];
    istekUrlleri = [];
    await fetchProductsPaged({ category_id: 13, page_size: 50, page: 3, sort: "created_at_desc", product_type: "flower" });
    assert.equal(gecisUrl, istekUrlleri[0]);
    // Arıza "API bu sırayı tanımıyor" DEĞİLDİR → not düşülmedi: sonraki istek varsayılan sırayı yine dener.
    kusak = "yeni";
    istekSiralari = [];
    const sonra = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
    assert.deepEqual(istekSiralari, ["category_order"]);
    assert.deepEqual(sonra.items.map((p) => p.slug), ["elle-1", "elle-2"]);
  });
}

test("FAIL-OPEN: varsayılan sıra isteği HİÇ yanıtlanmazsa süre dolunca bugünkü isteğe geçilir (sayfa sınırsız beklemez)", async () => {
  sifirla("bugunku");
  varsayilanSiraArizasi = "hang";
  const t0 = gercekNow();
  const sayfa = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
  const sure = gercekNow() - t0;
  assert.ok(sure >= CATEGORY_ORDER_DEADLINE_MS - 50 && sure < CATEGORY_ORDER_DEADLINE_MS + 1_500, `süre sınırı ≈ ${CATEGORY_ORDER_DEADLINE_MS} ms (ölçülen ${sure})`);
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"]);
  assert.deepEqual(istekOnbellekleri, ["revalidate:120", "revalidate:120"]);
  assert.deepEqual(sayfa.items.map((p) => p.slug), ["elle-2", "elle-1"]);
  assert.equal(sayfa.answered, true);
});

test("FAIL-OPEN: Data Cache modeli — API kapalıyken bugünkü isteğin kaydı (bayat) kategori listesini taşır", async () => {
  sifirla("bugunku");
  // Önbellek modeli: yalnız 200 saklanır; önbellekli istekte kayıt varsa ağa gidilmez.
  type Yanit = { ok: boolean; status: number; json: () => Promise<unknown> };
  const asil = (globalThis as unknown as { fetch: (i: unknown, n?: unknown) => Promise<Yanit> }).fetch;
  const kayitlar = new Map<string, unknown>();
  const gunluk: string[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown, init?: unknown): Promise<Yanit> => {
    const anahtar = String(input);
    const sira = new URL(anahtar).searchParams.get("sort");
    const onbellekli = (init as { cache?: string } | undefined)?.cache !== "no-store";
    if (onbellekli && kayitlar.has(anahtar)) {
      gunluk.push(`ÖNBELLEK ${sira}`);
      return { ok: true, status: 200, json: async () => kayitlar.get(anahtar) };
    }
    gunluk.push(`AĞ ${sira}`);
    const res = await asil(input, init);
    if (onbellekli && res.status === 200) {
      const govde = await res.json();
      kayitlar.set(anahtar, govde);
      return { ok: true, status: 200, json: async () => govde };
    }
    return res;
  };
  try {
    // Sağlıklı gün: bugünkü isteğin kaydı oluşur (ret + tekrar).
    const once = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
    assert.deepEqual(gunluk, ["AĞ category_order", "AĞ created_at_desc"]);
    // API kapanır; not süresi dolmuş (ya da taze açılmış bir örnek).
    notuEskit();
    apiKapali = true;
    gunluk.length = 0;
    const kesintide = await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" });
    assert.deepEqual(gunluk, ["AĞ category_order", "ÖNBELLEK created_at_desc"], "bugünkü isteğin kaydı kullanıldı");
    assert.deepEqual(kesintide, once, "kesintide liste bugünkü gibi çizilir");
    assert.equal(kesintide.answered, true);
    assert.equal(kesintide.items.length, 2);
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = asil;
  }
});

// EK (KABUL NOTU): API varsayılan sırayı tanıdıktan sonra okuma, bugünkü isteğin akışıyla birebir aynı yürür.
test("KABUL NOTU: API sırayı tanıdıktan sonra yavaş yanıt BEKLENİR ve geçici hata aynı istekle yinelenir — liste bugünkü sıraya çevrilmez", async () => {
  sifirla("yeni");
  await fetchProductsPaged({ category_id: 13, page_size: 50, sort: "category_order" }); // kabul notu düşer
  // 1) Yavaş yanıt (süre sınırından UZUN): beklenir, elle sıra gelir; bugünkü sıraya geçilmez.
  istekSiralari = [];
  varsayilanSiraGecikmeMs = CATEGORY_ORDER_DEADLINE_MS + 200;
  const yavas = await fetchProductsPaged({ category_id: 14, page_size: 50, sort: "category_order" });
  varsayilanSiraGecikmeMs = 0;
  assert.deepEqual(istekSiralari, ["category_order"], "yavaş yanıt sırayı değiştirmez");
  assert.deepEqual(yavas.items.map((p) => p.slug), ["elle-1", "elle-2"]);
  // 2) Geçici ağ hatası: bugünkü iki deneme AYNI istekle (önbellekli → no-store); sıra yine elle sıra.
  istekSiralari = [];
  istekOnbellekleri = [];
  agHatasi = 1;
  const gecici = await fetchProductsPaged({ category_id: 15, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "category_order"]);
  assert.deepEqual(istekOnbellekleri, ["revalidate:120", "no-store"]);
  assert.deepEqual(gecici.items.map((p) => p.slug), ["elle-1", "elle-2"]);
  // 3) İki deneme de 5xx: bugünkü davranış — boş yedek sayfa ('yanıt verdi' sayılmaz → kategori boş SANILMAZ).
  istekSiralari = [];
  varsayilanSiraArizasi = 503;
  const kesinti = await fetchProductsPaged({ category_id: 16, page_size: 50, sort: "category_order" });
  varsayilanSiraArizasi = null;
  assert.deepEqual(istekSiralari, ["category_order", "category_order"]);
  assert.deepEqual(kesinti, { items: [], pagination: { page: 1, page_size: 50, total: 0, total_pages: 1 } });
  // 4) API geri alındı (ret): bugünkü sıraya geçilir, kabul notu silinir, ret notu düşer.
  istekSiralari = [];
  kusak = "bugunku";
  const geriAlindi = await fetchProductsPaged({ category_id: 17, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["category_order", "created_at_desc"]);
  assert.deepEqual(geriAlindi.items.map((p) => p.slug), ["elle-2", "elle-1"]);
  istekSiralari = [];
  await fetchProductsPaged({ category_id: 18, page_size: 50, sort: "category_order" });
  assert.deepEqual(istekSiralari, ["created_at_desc"], "ret notu taze → doğrudan bugünkü sıra");
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
  assert.ok(api.includes("const known = categorySortFallback.accepted();"));
  assert.ok(api.includes("const tried = await settledWithin(fetch(url, init), known ? null : CATEGORY_ORDER_DEADLINE_MS);"), "süre sınırı AbortSignal'sız; API sırayı tanıyorsa sınır yok");
  assert.ok(api.includes("const rejected = !!tried && isSortRejectedStatus(tried.status);"));
  assert.ok(api.includes("} else if (known && !rejected) {"), "kabul notu tazeyken hata bugünkü sıraya çevirmez (ikinci deneme aynı istek)");
  assert.ok(api.includes("if (rejected && res.ok && params.category_id) categorySortFallback.noteRejected();"), "not yalnız ret + başarılı tekrar ile");
  const okuma = api.slice(api.indexOf("export async function fetchProductsPaged("), api.indexOf("// PAYLAŞILAN MAPPER"));
  assert.ok(!/signal\s*:/.test(okuma) && !okuma.includes("AbortController"), "fetch'e signal verilmez (istek içi tekilleştirme korunur)");
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
