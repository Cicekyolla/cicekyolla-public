// GLOBAL — "admin kaydı public'e deploy'suz, anında yansır" sözleşmesinin kaynak korumaları.
// Global yüzeylerinin tazeliği YALNIZ no-store'a dayanır (revalidateTag/purge yok; 23 Ağu #161).
// Bir fetch'e `next: { revalidate }` eklemek ya da locale rotasından force-dynamic'i kaldırmak
// admin kaydını dakikalarca geciktirir → bu testler kırılır.
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOBAL_LOCALES } from "./global/config.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

/** İmzadan başlayıp sütun 0'daki ilk kapanan "}" satırına kadar fonksiyon gövdesi. */
function fnBody(src: string, signature: string): string {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, `bulunamadı: ${signature}`);
  const end = src.slice(start).search(/\r?\n\}\r?\n/);
  assert.ok(end > 0, `gövde sonu bulunamadı: ${signature}`);
  return src.slice(start, start + end);
}

test("lib/global/api.ts getJson: cache no-store, Data Cache TTL yok (tüm Global yüzey fetcher'ları bundan geçer)", () => {
  const src = read("./global/api.ts");
  const body = fnBody(src, "async function getJson");
  assert.match(body, /cache: "no-store"/);
  assert.ok(!/revalidate/.test(body), "getJson içinde revalidate olmamalı");
  // Dosyadaki HER fetch çağrısı no-store taşır (bugün tek çağrı getJson içindedir).
  const calls = [...src.matchAll(/\bfetch\(/g)];
  assert.ok(calls.length >= 1);
  for (const m of calls) {
    const call = src.slice(m.index, src.indexOf(");", m.index));
    assert.match(call, /cache: "no-store"/, `no-store olmayan fetch: ${call.slice(0, 80)}`);
  }
});

test("lib/global/v80/data.ts fetchBundle: vitrin paketi no-store", () => {
  const body = fnBody(read("./global/v80/data.ts"), "async function fetchBundle");
  assert.match(body, /\/api\/public\/global\/storefront\?locale=/);
  assert.match(body, /cache: "no-store"/);
  assert.ok(!/revalidate/.test(body), "fetchBundle içinde revalidate olmamalı");
});

test("13 locale rotası (app/<locale>/[[...path]]/page.tsx) force-dynamic; revalidate/fetchCache geçersiz kılması yok", () => {
  assert.equal(GLOBAL_LOCALES.length, 13);
  for (const l of GLOBAL_LOCALES) {
    const src = read(`../app/${l}/[[...path]]/page.tsx`);
    assert.match(src, /^export const dynamic = "force-dynamic";$/m, `${l}: force-dynamic`);
    assert.ok(!/export const revalidate\b/.test(src), `${l}: revalidate export olmamalı`);
    assert.ok(!/export const fetchCache\b/.test(src), `${l}: fetchCache geçersiz kılması olmamalı`);
    assert.match(src, new RegExp(`<LocalePage locale="${l}"`), `${l}: kendi locale'ini işler`);
  }
});

test("admin varsayılan metin/yapı kaynağı (/api/global/v80-defaults) kısa önbellek: s-maxage=60, SWR 60", () => {
  const src = read("../app/api/global/v80-defaults/route.ts");
  assert.match(src, /"Cache-Control": "public, s-maxage=60, stale-while-revalidate=60"/);
  assert.match(src, /^export const revalidate = 60;$/m);
  assert.ok(!/"Cache-Control": "[^"]*(s-maxage=300|stale-while-revalidate=600)/.test(src), "eski 5 dk + 10 dk önbellek başlığı kalmamalı");
  assert.ok(!/^export const revalidate = 300;$/m.test(src));
});
