// lib/r2RangeHeaders.test.ts — /r2 proxy'sinin Range kuralı (next.config.js nöbeti).
// Çalıştırma: node --test lib/r2RangeHeaders.test.ts   (npm run test:unit)
//
// NEDEN: /r2/:path* yanıtı uzun ömürlü (immutable + CDN s-maxage) önbelleklenir.
// `Range` başlıklı isteğe köken 206 (kısmi içerik) döner; kısmi yanıt PAYLAŞILAN
// (CDN) önbelleğe girmemelidir.
// Kural: Range taşıyan isteğin yanıtı CDN'de saklanmaz (iki CDN başlığı no-store,
// tarayıcı başlığı `private`). Tarayıcının kendi önbelleği serbesttir: <video>/<audio>
// her istekte Range gönderir; tarayıcı başlığı da no-store olsaydı her oynatma baytları
// yeniden indirirdi.
//
// SINIR: bu test kural yapısını ve Next'in eşleştirme sırasını doğrular. Vercel
// kenarının harici rewrite'ta bu kuralı önbellek kararına uyguladığı çevrimdışı
// kanıtlanamaz; önizleme dağıtımında (asla www'de değil) operatör onayıyla bir kez
// doğrulanmalıdır.
//
// Bu test next.config.js'i GERÇEKTEN yükler (metin araması değil) ve Next'in
// "aynı anahtarda son eşleşen kural kazanır" davranışını modelleyerek sonucu
// doğrular. Ağ isteği atılmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

type HeaderKV = { key: string; value: string };
type HasCondition = { type: string; key: string; value?: string };
type HeaderRule = { source: string; has?: HasCondition[]; missing?: HasCondition[]; headers: HeaderKV[] };
type RewriteRule = { source: string; destination: string };

const cjsYukle = createRequire(import.meta.url);
const nextConfig = cjsYukle("../next.config.js") as {
  headers: () => Promise<HeaderRule[]>;
  rewrites: () => Promise<RewriteRule[]>;
};
const rules = await nextConfig.headers();
const rewrites = await nextConfig.rewrites();

const R2_SOURCE = "/r2/:path*";
const CDN_HEADERS = ["cdn-cache-control", "vercel-cdn-cache-control"];
/** Kural PAYLAŞILAN önbelleği kapatıyor mu? İki CDN başlığı no-store + tarayıcı başlığı `private` (ya da no-store). */
const isNoStore = (rule: HeaderRule) => {
  const byKey = new Map(rule.headers.map((h) => [h.key.toLowerCase(), h.value]));
  const cc = byKey.get("cache-control") ?? "";
  return CDN_HEADERS.every((k) => byKey.get(k) === "no-store") && (cc === "no-store" || /^private\b/.test(cc)) && !/\b(public|s-maxage)\b/.test(cc);
};
const hasRange = (rule: HeaderRule) =>
  (rule.has ?? []).some((c) => c.type === "header" && c.key.toLowerCase() === "range" && c.value === undefined);

/** Bir /r2 isteğine uygulanan başlıklar: sırayla, aynı anahtarda SON eşleşen kazanır (Next davranışı). */
function etkinBasliklar(istekBasliklari: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of rules) {
    if (rule.source !== R2_SOURCE) continue;
    const kosulTutar = (rule.has ?? []).every((c) => c.type === "header" && c.key.toLowerCase() in istekBasliklari);
    if (!kosulTutar) continue;
    for (const h of rule.headers) out[h.key.toLowerCase()] = h.value;
  }
  return out;
}

test("/r2 için uzun ömürlü önbellek kuralı yerinde (Range'siz istekler aynen önbelleklenir)", () => {
  const uzun = rules.filter((r) => r.source === R2_SOURCE && !r.has);
  assert.equal(uzun.length, 1);
  assert.deepEqual(uzun[0].headers, [
    { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    { key: "CDN-Cache-Control", value: "public, s-maxage=31536000, stale-while-revalidate=86400" },
  ]);
});

test("/r2 için Range kuralı VAR: has header 'range' → CDN'de no-store; tarayıcıda private (paylaşılan önbellek yasak)", () => {
  const range = rules.filter((r) => r.source === R2_SOURCE && hasRange(r));
  assert.equal(range.length, 1, "tam bir Range kuralı beklenir");
  assert.deepEqual(range[0].has, [{ type: "header", key: "range" }]);
  assert.deepEqual(range[0].headers, [
    { key: "Cache-Control", value: "private, max-age=31536000, immutable" },
    { key: "CDN-Cache-Control", value: "no-store" },
    { key: "Vercel-CDN-Cache-Control", value: "no-store" },
  ]);
  assert.ok(isNoStore(range[0]));
});

test("Range kuralının tarayıcı başlığı hiçbir PAYLAŞILAN önbelleğe izin vermez (public / s-maxage yok); CDN başlıkları no-store", () => {
  const range = rules.find((r) => r.source === R2_SOURCE && hasRange(r))!;
  const cc = range.headers.find((h) => h.key.toLowerCase() === "cache-control")!.value;
  assert.match(cc, /^private\b/, "private: paylaşılan önbellek (CDN) saklayamaz, tarayıcı saklayabilir");
  assert.ok(!/\bpublic\b|s-maxage|stale-while-revalidate/.test(cc));
  for (const k of CDN_HEADERS) {
    assert.equal(range.headers.find((h) => h.key.toLowerCase() === k)?.value, "no-store", k);
  }
  // Nöbetin kendisi: paylaşılan önbelleğe izin veren bir kural "no-store" sayılmaz.
  assert.equal(isNoStore({ source: R2_SOURCE, headers: [{ key: "Cache-Control", value: "public, max-age=60" }, { key: "CDN-Cache-Control", value: "no-store" }, { key: "Vercel-CDN-Cache-Control", value: "no-store" }] }), false);
  assert.equal(isNoStore({ source: R2_SOURCE, headers: [{ key: "Cache-Control", value: "private, max-age=60" }, { key: "CDN-Cache-Control", value: "no-store" }] }), false, "Vercel başlığı eksik");
});

test("Range kuralı uzun ömürlü kuraldan SONRA gelir (son eşleşen kazanır)", () => {
  const uzunIdx = rules.findIndex((r) => r.source === R2_SOURCE && !r.has);
  const rangeIdx = rules.findIndex((r) => r.source === R2_SOURCE && hasRange(r));
  assert.ok(uzunIdx >= 0 && rangeIdx >= 0);
  assert.ok(rangeIdx > uzunIdx, `Range kuralı (${rangeIdx}) uzun önbellek kuralından (${uzunIdx}) sonra olmalı`);
  // Range kuralından sonra /r2 için onu geri ezecek başka bir kural yok.
  assert.equal(rules.slice(rangeIdx + 1).filter((r) => r.source === R2_SOURCE).length, 0);
});

test("sonuç: Range'li istek CDN'de saklanmaz (tarayıcıda private); Range'siz istek bir yıllık önbellek", () => {
  assert.deepEqual(etkinBasliklar({ range: "bytes=0-1023" }), {
    "cache-control": "private, max-age=31536000, immutable",
    "cdn-cache-control": "no-store",
    "vercel-cdn-cache-control": "no-store",
  });
  assert.deepEqual(etkinBasliklar({}), {
    "cache-control": "public, max-age=31536000, immutable",
    "cdn-cache-control": "public, s-maxage=31536000, stale-while-revalidate=86400",
  });
});

test("uzun ömürlü önbellek başlığı taşıyan HER rewrite yolunun Range kuralı var", () => {
  const uzunOmurlu = (rule: HeaderRule) =>
    !rule.has && rule.headers.some((h) => /cache-control/i.test(h.key) && /(immutable|max-age=\d{6,})/.test(h.value));
  const rewriteKaynaklari = new Set(rewrites.map((r) => r.source));
  const korunacak = rules.filter((r) => rewriteKaynaklari.has(r.source) && uzunOmurlu(r)).map((r) => r.source);
  assert.deepEqual(korunacak, [R2_SOURCE], "bugün uzun önbellekli tek rewrite yolu /r2 (yeni yol eklenirse Range kuralı da eklenmeli)");
  for (const source of korunacak) {
    const uzunIdx = rules.findIndex((r) => r.source === source && uzunOmurlu(r));
    const rangeIdx = rules.findIndex((r) => r.source === source && hasRange(r) && isNoStore(r));
    assert.ok(rangeIdx > uzunIdx, `${source}: Range → no-store kuralı eksik ya da yanlış sırada`);
  }
});
