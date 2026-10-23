// lib/fetchFallback.test.ts — son çare okumasının isteği (ağ YOK).
// Çalıştırma: node --test lib/fetchFallback.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lastResortInit, RETRY_HEADER } from "./fetchFallback.ts";

const oku = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

test("statik/ISR çiziminde son çare no-store DEĞİL: önbellekli tekrar + tekrar başlığı", () => {
  const init = lastResortInit(true, { authorization: "x" }, 120) as RequestInit & { next?: { revalidate?: number } };
  assert.equal(init.cache, undefined);
  assert.equal(init.next?.revalidate, 120);
  assert.deepEqual(init.headers, { authorization: "x", [RETRY_HEADER]: "1" });
});

test("dinamik çizimde son çare bugünkü gibi no-store, başlıklar aynen", () => {
  const init = lastResortInit(false, { authorization: "x" }, 120);
  assert.equal(init.cache, "no-store");
  assert.deepEqual(init.headers, { authorization: "x" });
});

test("kaynak nöbeti: lib/api.ts ISR'da çağrılan okumalarda düz no-store son çare kalmadı", () => {
  const src = oku("./api.ts");
  for (const fn of ["fetchProductBySlug", "fetchProductsPaged", "fetchCategoryTree"]) {
    const start = src.indexOf(`export async function ${fn}(`);
    assert.ok(start >= 0, `${fn} bulundu`);
    const body = src.slice(start, src.indexOf("\n}\n", start));
    assert.match(body, /lastResortInit\(await staticRender\(\)/, `${fn} son çareyi lastResortInit ile kurar`);
  }
});
