// lib/globalApiUnavailable.test.ts — GLOBAL İNDEKS KAYBI (13 Eki 2026): API'ye ulaşılamayınca Global sayfa 404 DEĞİL,
// geçici hata (5xx) verir. "Kayıt yok" (404 / {data:null}) hâlâ 404'tür. Çalıştırma: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GlobalApiUnavailableError, classifyPrimaryStatus, getJsonOrThrow } from "./global/api.ts";

const yanit = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
function sahte(seri: Array<Response | Error>) {
  let i = 0;
  const fn = (async () => {
    const r = seri[Math.min(i++, seri.length - 1)];
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  return { fn, sayi: () => i };
}

test("200 → veri; 200 + {data:null} (onaysız satır) → null; 404 → null — tek istek, yeniden deneme yok", async () => {
  const a = sahte([yanit(200, { data: { page_key: "istanbul" } })]);
  assert.deepEqual(await getJsonOrThrow("/x", a.fn), { page_key: "istanbul" });
  assert.equal(a.sayi(), 1);
  const b = sahte([yanit(200, { data: null })]);
  assert.equal(await getJsonOrThrow("/x", b.fn), null);
  const c = sahte([yanit(404, { error: "not_found" })]);
  assert.equal(await getJsonOrThrow("/x", c.fn), null);
  assert.equal(c.sayi(), 1);
  const d = sahte([yanit(400, { error: "invalid" })]);
  assert.equal(await getJsonOrThrow("/x", d.fn), null, "diğer 4xx: kayıt kararı → 404 (bugünkü gibi)");
  assert.equal(d.sayi(), 1);
});

test("5xx / ağ hatası bir kez yeniden denenir; ikinci deneme başarılıysa veri döner", async () => {
  const a = sahte([yanit(502, {}), yanit(200, { data: { ok: 1 } })]);
  assert.deepEqual(await getJsonOrThrow("/x", a.fn), { ok: 1 });
  assert.equal(a.sayi(), 2);
  const b = sahte([new TypeError("fetch failed"), yanit(404, {})]);
  assert.equal(await getJsonOrThrow("/x", b.fn), null);
});

test("iki deneme de başarısız (5xx / ağ / bozuk gövde) → GlobalApiUnavailableError (sayfa 404 DEĞİL, 5xx verir)", async () => {
  for (const seri of [[yanit(503, {})], [yanit(429, {})], [yanit(401, {})], [yanit(403, {})], [yanit(408, {})], [new TypeError("fetch failed")], [new Response("<html>", { status: 200 })]]) {
    const s = sahte(seri);
    await assert.rejects(getJsonOrThrow("/api/public/global/page?locale=en&key=istanbul", s.fn), GlobalApiUnavailableError);
    assert.equal(s.sayi(), 2);
  }
});

test("KAYNAK: Global sayfanın ANA kaydı (lokasyon/niyet, kategori, ürün — metadata + sayfa) require* ile okunur", () => {
  const page = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.equal(page.split("requireGlobalPage(locale, parsed.key)").length - 1, 2);
  assert.ok(page.includes('const row = await requireGlobalPage(locale, "home");'), "ana sayfa metadata: API hatasında noindex basılmaz");
  assert.equal(page.split("requireCategorySurface(locale, parsed.slug)").length - 1, 2);
  assert.equal(page.split("requireProductSurface(locale, parsed.slug)").length - 1, 2);
  assert.ok(!/fetchGlobalPage\(locale, parsed\.key\)|fetchCategorySurface\(|fetchProductSurface\(/.test(page), "ana kayıt eski (hata=404) okuyucuyla okunmaz");
});

test("durum sınıflaması: 2xx veri; 404/410/400/422 yok; 401/403/408/429/5xx geçici", () => {
  for (const s of [200, 204]) assert.equal(classifyPrimaryStatus(s), "data");
  for (const s of [400, 404, 410, 422]) assert.equal(classifyPrimaryStatus(s), "missing", String(s));
  for (const s of [401, 403, 408, 429, 500, 502, 503, 504]) assert.equal(classifyPrimaryStatus(s), "transient", String(s));
});

test("süre sınırı: yanıt vermeyen uç iptal edilir, iki deneme sonra GlobalApiUnavailableError (asılı kalmaz)", async () => {
  let n = 0;
  const askida = ((_: string, init?: RequestInit) => new Promise<Response>((_res, rej) => {
    n++;
    init?.signal?.addEventListener("abort", () => rej(new Error("aborted")));
  })) as unknown as typeof fetch;
  const t0 = Date.now();
  await assert.rejects(getJsonOrThrow("/yavas", askida, 2, 30), GlobalApiUnavailableError);
  assert.equal(n, 2);
  assert.ok(Date.now() - t0 < 2_000);
});
