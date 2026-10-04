import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithDeadline } from "./fetchWithDeadline.ts";

/**
 * Süre sınırı + tek tekrar bekçisi (9 Eyl 2026): Render'a giden lokasyon
 * okumaları askıda kalırsa sayfa üretimi dakikalarca beklememeli; ilk deneme
 * iptal edilip taze bağlantıyla BİR kez tekrar denenmeli, o da olmazsa hata
 * çağıranın mevcut fallback yoluna fırlamalı.
 */
function hangingThen(ok: boolean) {
  const calls: Array<Record<string, string> | undefined> = [];
  const fetchFn = (async (_url: unknown, init?: RequestInit) => {
    calls.push(init?.headers as Record<string, string> | undefined);
    if (calls.length === 1 || !ok) {
      await new Promise<void>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    }
    return new Response("{\"data\":{}}", { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fetchFn, calls };
}

test("askıda kalan ilk deneme iptal edilir, tekrar taze bağlantı başlığıyla başarır", async () => {
  const { fetchFn, calls } = hangingThen(true);
  const t0 = Date.now();
  const res = await fetchWithDeadline("https://api.test/x", { headers: { a: "1" }, next: { revalidate: 300 } }, 50, fetchFn);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.["x-cy-retry"], undefined);
  assert.equal(calls[1]?.["x-cy-retry"], "1");
  assert.equal(calls[1]?.a, "1", "mevcut başlıklar korunur");
  assert.ok(Date.now() - t0 < 1000);
});

test("iki deneme de askıda kalırsa hata fırlar (çağıranın fallback'i devreye girer)", async () => {
  const { fetchFn, calls } = hangingThen(false);
  await assert.rejects(() => fetchWithDeadline("https://api.test/x", {}, 30, fetchFn));
  assert.equal(calls.length, 2);
});

test("normal yolda tek çağrı, ek başlık yok", async () => {
  let n = 0;
  const fetchFn = (async () => { n++; return new Response("ok", { status: 200 }); }) as typeof fetch;
  const res = await fetchWithDeadline("https://api.test/y", { next: { revalidate: 300 } }, 1000, fetchFn);
  assert.equal(res.status, 200);
  assert.equal(n, 1);
});

// EK (SEO yayın zinciri) — retryOnTimeout=false: yedek yolu olan okumalar (hreflang, product-urls)
// yanıt vermeyen ucu İKİ KEZ beklemez; kopan soket gibi hızlı hatalar yine bir kez tekrar denenir.
test("retryOnTimeout=false: süre dolunca TEKRAR DENENMEZ (en kötü bekleme 1 × süre sınırı)", async () => {
  const { fetchFn, calls } = hangingThen(false);
  const t0 = Date.now();
  // Süre sınırı 200 ms: tek bekleme ≈ 200, iki bekleme ≈ 400. Üst sınır zamanlayıcı gecikmesine pay bırakır
  // (60 ms sınır + 115 ms üst sınırla yüklü makinede 115 ms ölçülüp 1 ms ile düşüyordu — kararsız test).
  await assert.rejects(() => fetchWithDeadline("https://api.test/x", {}, 200, fetchFn, false));
  const sure = Date.now() - t0;
  assert.equal(calls.length, 1, "zaman aşımından sonra ikinci deneme yok");
  assert.ok(sure >= 190 && sure < 390, `tek süre sınırı kadar beklendi (${sure} ms)`);
});

test("retryOnTimeout=false: hızlı hata (kopan soket) yine bir kez tekrar denenir; ikinci deneme başarırsa yanıt döner", async () => {
  let n = 0;
  const headers: Array<Record<string, string> | undefined> = [];
  const fetchFn = (async (_url: unknown, init?: RequestInit) => {
    n++;
    headers.push(init?.headers as Record<string, string> | undefined);
    if (n === 1) throw new Error("other side closed");
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  const res = await fetchWithDeadline("https://api.test/y", {}, 1000, fetchFn, false);
  assert.equal(res.status, 200);
  assert.equal(n, 2);
  assert.equal(headers[1]?.["x-cy-retry"], "1");
});

test("varsayılan (retryOnTimeout verilmez) davranış AYNEN: zaman aşımından sonra da bir kez tekrar denenir", async () => {
  const { fetchFn, calls } = hangingThen(false);
  await assert.rejects(() => fetchWithDeadline("https://api.test/x", {}, 30, fetchFn));
  assert.equal(calls.length, 2);
  await assert.rejects(() => fetchWithDeadline("https://api.test/x", {}, 30, hangingThen(false).fetchFn, true));
});
