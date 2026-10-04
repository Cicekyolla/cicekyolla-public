// lib/hreflangSources.test.ts — hreflang ailesinin Türkçe sayfa okumaları: fail-open, 404 notu, devre kesici.
// Ağ yok: fetch ve saat enjekte edilir. Çalıştırma: node --test lib/hreflangSources.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HREFLANG_DEADLINE_MS,
  HREFLANG_FAMILY_PAUSE_MS,
  HREFLANG_MISSING_MEMO_MS,
  HREFLANG_PAUSE_MS,
  HREFLANG_REVALIDATE_S,
  createHreflangReader,
  fetchCategoryLocaleVersions,
  fetchHomeLocaleVersions,
  fetchProductLocaleVersions,
  readHomeLocaleVersions,
} from "./hreflangSources.ts";

const ORIGIN = "http://api.test";
type Call = { url: string; init: RequestInit & { next?: { revalidate?: number } } };

/** Sahte fetch: her çağrıyı kaydeder; yanıtı `answer` üretir (Response ya da fırlatılan hata). */
function sahte(answer: (url: string) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: Call["init"]) => {
    calls.push({ url: String(url), init });
    return answer(String(url));
  }) as unknown as typeof fetch;
  return { fn, calls };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("200 → data döner; istek önbellekli (revalidate 300) ve no-store DEĞİL", async () => {
  const { fn, calls } = sahte(() => json(200, { data: { tr_slug: "gul", locales: [{ locale: "de", slug: "rose", indexable: true }] } }));
  const reader = createHreflangReader(fn, () => 0, ORIGIN);
  const out = await reader.read<{ tr_slug: string }>("product-locales", "/api/public/translations/surface/product-locales/7");
  assert.deepEqual(out, { tr_slug: "gul", locales: [{ locale: "de", slug: "rose", indexable: true }] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${ORIGIN}/api/public/translations/surface/product-locales/7`);
  assert.equal(calls[0].init.next?.revalidate, HREFLANG_REVALIDATE_S);
  assert.equal(HREFLANG_REVALIDATE_S, 300);
  assert.equal(calls[0].init.cache, undefined, "no-store ISR rotasını dinamiğe çevirir");
  assert.ok(calls[0].init.signal instanceof AbortSignal, "süre sınırı (AbortController) bağlı");
  assert.ok(HREFLANG_DEADLINE_MS > 0 && HREFLANG_DEADLINE_MS <= 3_000, "kısa süre sınırı");
});

test("200 ama data yok / bozuk gövde → null (fırlatmaz)", async () => {
  const bos = createHreflangReader(sahte(() => json(200, { error: "x" })).fn, () => 0, ORIGIN);
  assert.equal(await bos.read("f", "/a"), null);
  const bozuk = createHreflangReader(sahte(() => new Response("<html>", { status: 200 })).fn, () => 0, ORIGIN);
  assert.equal(await bozuk.read("f", "/a"), null);
});

test("404 (uç henüz yayında değil) → null; aynı yol 5 dk yeniden sorulmaz, sonra yeniden sorulur", async () => {
  let saat = 1_000;
  const { fn, calls } = sahte(() => json(404, { error: "not_found" }));
  const reader = createHreflangReader(fn, () => saat, ORIGIN);
  assert.equal(await reader.read("category-locales", "/api/public/translations/surface/category-locales/13"), null);
  assert.equal(calls.length, 1);
  saat += HREFLANG_MISSING_MEMO_MS - 1;
  assert.equal(await reader.read("category-locales", "/api/public/translations/surface/category-locales/13"), null);
  assert.equal(calls.length, 1, "not süresi içinde ağ isteği yok");
  // 404 bir "yok" yanıtıdır, arıza değil → aynı ailenin BAŞKA yolu sorulmaya devam eder.
  assert.equal(await reader.read("category-locales", "/api/public/translations/surface/category-locales/14"), null);
  assert.equal(calls.length, 2);
  saat += 2;
  await reader.read("category-locales", "/api/public/translations/surface/category-locales/13");
  assert.equal(calls.length, 3, "not süresi dolunca yeniden sorulur");
});

test("5xx → null ve YALNIZ o yol 60 sn sorulmaz; aynı ailenin BAŞKA yolu (başka ürün) etkilenmez; süre dolunca yeniden sorulur", async () => {
  let saat = 0;
  let durum = 503;
  const { fn, calls } = sahte(() => json(durum, { data: { ok: true } }));
  const reader = createHreflangReader(fn, () => saat, ORIGIN);
  assert.equal(await reader.read("product-locales", "/p/1"), null);
  assert.equal(calls.length, 1);
  assert.equal(await reader.read("product-locales", "/p/1"), null);
  assert.equal(calls.length, 1, "aynı yol duraklatıldı → istek yok");
  durum = 200;
  // İnceleme bulgusu: tek bir ürünün 5xx'i o instance'taki TÜM ürünlerin hreflang'ini 60 sn kesiyordu.
  assert.deepEqual(await reader.read("product-locales", "/p/2"), { ok: true }, "başka ürün sorulur ve küme basılır");
  assert.deepEqual(await reader.read("product-locales", "/p/3"), { ok: true });
  assert.equal(calls.length, 3);
  assert.equal(await reader.read("product-locales", "/p/1"), null, "hatalı yol hâlâ duraklı");
  assert.equal(calls.length, 3);
  saat += HREFLANG_PAUSE_MS + 1;
  assert.deepEqual(await reader.read("product-locales", "/p/1"), { ok: true });
  assert.equal(calls.length, 4);
  assert.equal(HREFLANG_PAUSE_MS, 60_000);
});

test("ağ hatası → null (fırlatmaz), hızlı hata bir kez tekrar denenir; AİLE kısa süre (10 sn) duraklar, başka aile etkilenmez", async () => {
  let saat = 0;
  let bozuk = true;
  const { fn, calls } = sahte(() => { if (bozuk) throw new Error("other side closed"); return json(200, { data: { ok: true } }); });
  const reader = createHreflangReader(fn, () => saat, ORIGIN);
  assert.equal(await reader.read("product-locales", "/p/1"), null);
  assert.equal(calls.length, 2, "fetchWithDeadline: ilk deneme + tek tekrar (kopan soket)");
  bozuk = false;
  assert.equal(await reader.read("product-locales", "/p/2"), null);
  assert.equal(calls.length, 2, "API yanıt vermiyor → aynı ailenin hiçbir yolu sorulmaz");
  assert.deepEqual(await reader.read("global-home", "/h"), { ok: true }, "başka aile sorulur");
  assert.equal(calls.length, 3);
  saat += HREFLANG_FAMILY_PAUSE_MS - 1;
  assert.equal(await reader.read("product-locales", "/p/2"), null);
  assert.equal(calls.length, 3);
  saat += 2;
  assert.deepEqual(await reader.read("product-locales", "/p/2"), { ok: true }, "kısa duraklama dolunca yeniden sorulur");
  assert.equal(calls.length, 4);
  assert.equal(HREFLANG_FAMILY_PAUSE_MS, 10_000, "aile duraklaması kısa: Türkçe sayfanın hreflang'siz kaldığı pencere dar");
});

test("ZAMAN AŞIMI: yanıt vermeyen uç bir kez beklenir (2 × süre sınırı DEĞİL), sonra aile duraklar → sonraki okuma beklemez", async () => {
  let calls = 0;
  const asili = (async (_url: unknown, init?: RequestInit) => {
    calls++;
    await new Promise<void>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });
    return new Response("{}");
  }) as typeof fetch;
  const reader = createHreflangReader(asili, Date.now, ORIGIN);
  const t0 = Date.now();
  assert.equal(await reader.read("product-locales", "/p/1"), null);
  const sure = Date.now() - t0;
  assert.equal(calls, 1, "süre dolunca tekrar denenmez");
  assert.ok(sure >= HREFLANG_DEADLINE_MS - 50 && sure < HREFLANG_DEADLINE_MS * 2 - 500, `tek süre sınırı kadar beklendi (${sure} ms)`);
  const t1 = Date.now();
  assert.equal(await reader.read("product-locales", "/p/2"), null);
  assert.equal(calls, 1, "aile duraklı → istek yok");
  assert.ok(Date.now() - t1 < 100, "ikinci okuma beklemez");
});

test("readChecked: 'veri yok' (404 / data yok) ile 'okunamadı' (5xx / ağ / bozuk gövde / duraklı) ayrışır", async () => {
  const tek = (answer: (url: string) => Response) => createHreflangReader(sahte(answer).fn, () => 0, ORIGIN);
  assert.deepEqual(await tek(() => json(200, { data: { a: 1 } })).readChecked("f", "/a"), { ok: true, data: { a: 1 } });
  assert.deepEqual(await tek(() => json(404, {})).readChecked("f", "/a"), { ok: true, data: null });
  assert.deepEqual(await tek(() => json(200, { error: "x" })).readChecked("f", "/a"), { ok: true, data: null });
  assert.deepEqual(await tek(() => json(500, {})).readChecked("f", "/a"), { ok: false, data: null });
  assert.deepEqual(await tek(() => { throw new Error("ağ"); }).readChecked("f", "/a"), { ok: false, data: null });
  // Bozuk gövde (200 + JSON değil): okunamadı; YALNIZ o yol duraklar (ailenin başka yolu sorulur).
  let n = 0;
  const bozuk = createHreflangReader(sahte((url) => { n++; return url.endsWith("/a") ? new Response("<html>", { status: 200 }) : json(200, { data: 1 }); }).fn, () => 0, ORIGIN);
  assert.deepEqual(await bozuk.readChecked("f", "/a"), { ok: false, data: null });
  assert.deepEqual(await bozuk.readChecked("f", "/a"), { ok: false, data: null });
  assert.equal(n, 1, "duraklı yol yeniden sorulmaz");
  assert.deepEqual(await bozuk.readChecked("f", "/b"), { ok: true, data: 1 });
});

test("dışa açık okuyucular: geçersiz kimlik ağ isteği yapmaz; hata hiçbir zaman dışarı sızmaz", async () => {
  const asil = globalThis.fetch;
  let istek = 0;
  globalThis.fetch = (async () => { istek++; throw new Error("ağ yok"); }) as unknown as typeof fetch;
  try {
    for (const kotu of [undefined, null, "", "abc", "12/../x", "1 2", -5, 1.5, {}, "9".repeat(13)]) {
      assert.equal(await fetchProductLocaleVersions(kotu), null);
      assert.equal(await fetchCategoryLocaleVersions(kotu), null);
    }
    assert.equal(istek, 0, "geçersiz kimlikte ağ isteği yok");
    assert.equal(await fetchProductLocaleVersions(101), null);
    assert.equal(await fetchCategoryLocaleVersions("13"), null);
    assert.equal(await fetchHomeLocaleVersions(), null);
    assert.ok(istek > 0, "geçerli kimlik sorulur (ve hata null'a düşer)");
  } finally {
    globalThis.fetch = asil;
  }
});

test("ana sayfa: çapa EN — onaylıysa TEK istek; küme o satırın locales alanı", async () => {
  const { fn, calls } = sahte(() => json(200, { data: { locale: "en", page_key: "home", indexable: true, locales: [{ locale: "de", indexable: true }, { locale: "en", indexable: true }] } }));
  const out = await readHomeLocaleVersions(createHreflangReader(fn, () => 0, ORIGIN));
  assert.deepEqual(out, [{ locale: "de", indexable: true }, { locale: "en", indexable: true }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${ORIGIN}/api/public/global/page?locale=en&key=home`);
});

test("ana sayfa: EN onaylı değilse (404) diğer dillere bakılır; ilk onaylı satır kullanılır; 404'ler 5 dk yeniden sorulmaz", async () => {
  const { fn, calls } = sahte((url) => url.includes("locale=de&")
    ? json(200, { data: { locale: "de", page_key: "home", indexable: true, locales: [{ locale: "de", indexable: true }] } })
    : json(404, { error: "not_found" }));
  const reader = createHreflangReader(fn, () => 0, ORIGIN);
  assert.deepEqual(await readHomeLocaleVersions(reader), [{ locale: "de", indexable: true }]);
  assert.equal(calls.length, 13, "EN + diğer 12 dil (paralel)");
  assert.equal(calls[0].url, `${ORIGIN}/api/public/global/page?locale=en&key=home`, "önce çapa");
  assert.deepEqual(await readHomeLocaleVersions(reader), [{ locale: "de", indexable: true }]);
  assert.equal(calls.length, 14, "ikinci turda yalnız onaylı satır yeniden okunur (404'ler notlu; 200'ü Next Data Cache saklar)");
});

test("ana sayfa: hiç onaylı satır yok → null; EN okunamadıysa (5xx / ağ) başka dile SORULMAZ (aile duraklar) → null", async () => {
  const hic = sahte(() => json(404, { error: "not_found" }));
  assert.equal(await readHomeLocaleVersions(createHreflangReader(hic.fn, () => 0, ORIGIN)), null);
  assert.equal(hic.calls.length, 13);
  const kesik = sahte(() => json(502, { error: "boom" }));
  assert.equal(await readHomeLocaleVersions(createHreflangReader(kesik.fn, () => 0, ORIGIN)), null);
  assert.equal(kesik.calls.length, 1, "API arızalıyken 13 istek atılmaz");
  // Satır geldi ama `locales` alanı yok (eski yanıt biçimi) → başka dile sorulmaz, küme basılmaz.
  const eski = sahte(() => json(200, { data: { locale: "en", page_key: "home", indexable: true } }));
  assert.equal(await readHomeLocaleVersions(createHreflangReader(eski.fn, () => 0, ORIGIN)), null);
  assert.equal(eski.calls.length, 1);
});

test("KAYNAK: okumalar lib/global/api.ts (no-store) dışında; uç yolları sözleşmedeki gibi", () => {
  const src = readFileSync(new URL("./hreflangSources.ts", import.meta.url), "utf8");
  assert.ok(!/cache:\s*"no-store"/.test(src), "Türkçe sayfalar ISR — no-store yok");
  assert.ok(src.includes("{ next: { revalidate: HREFLANG_REVALIDATE_S } }"));
  assert.ok(src.includes("`/api/public/translations/surface/product-locales/${id}`"));
  assert.ok(src.includes("`/api/public/translations/surface/category-locales/${id}`"));
  assert.ok(src.includes("`/api/public/global/page?locale=${locale}&key=home`"));
  assert.ok(src.includes("fetchFn ?? fetch"), "global fetch çağrı anında çözülür (Next'in önbellekli fetch'i)");
});
