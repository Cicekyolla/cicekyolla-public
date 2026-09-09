import test from "node:test";
import assert from "node:assert/strict";

/**
 * link-dictionary tekilleştirme bekçisi (9 Eyl 2026): Vercel loglarında her
 * sayfa üretiminde sözlük İKİ kez çekiliyordu. Aynı süreçte eşzamanlı ve
 * ardışık çağrılar tek ağ isteğine inmeli; API geç kalırsa sayfa beklememeli.
 */
let calls = 0;
let delayMs = 0;
const WORDS = [
  { text: "Orkide", url: "/kategori/orkide", type: "category" },
  { text: "İnönü Mahallesi", url: "/istanbul/atasehir/inonu-mah", type: "location" },
];
globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
  calls++;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, delayMs);
    init?.signal?.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); });
  });
  return new Response(JSON.stringify({ words: WORDS }), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const { getLinkData } = await import("./linkData.ts");

test("eşzamanlı üç çağrı tek ağ isteği yapar ve uzun adı öne alır", async () => {
  const [a, b, c] = await Promise.all([getLinkData(), getLinkData(), getLinkData()]);
  assert.equal(calls, 1);
  assert.equal(a.length, 2);
  assert.equal(a[0].text, "İnönü Mahallesi");
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test("ardışık çağrı süreç içi önbellekten döner (yeni ağ isteği yok)", async () => {
  await getLinkData();
  await getLinkData();
  assert.equal(calls, 1);
});
