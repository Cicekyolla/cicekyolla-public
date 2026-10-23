// lib/rootProductRedirect.test.ts — kök ürün adresi → /urun/<slug> (ağ YOK; arama stub'lanır).
// Çalıştırma: node --test lib/rootProductRedirect.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rootProductCandidate, resolveRootProductRedirect, __resetRootProductCache } from "./rootProductRedirect.ts";

test("aday: yalnız tek segmentli, ≥3 kelimelik küçük harf slug", () => {
  assert.equal(rootProductCandidate("/lika-kalpli-pembe-ve-krem-gul-sepeti"), "lika-kalpli-pembe-ve-krem-gul-sepeti");
  assert.equal(rootProductCandidate("/nina-2-dalli-mavi-orkide/"), "nina-2-dalli-mavi-orkide");
  assert.equal(rootProductCandidate("/istanbul"), null);
  assert.equal(rootProductCandidate("/pembe-karanfil"), null);
  assert.equal(rootProductCandidate("/urun/lika-kalpli-pembe"), null);
  assert.equal(rootProductCandidate("/Kirmizi-Gullu-El-Buketi"), null);
  assert.equal(rootProductCandidate("/51544-Lev-Orkide-Serisi.html"), null);
});

test("aktif ürün varsa /urun/<slug>, yoksa null; sonuç önbellekte (ikinci istekte API'ye gidilmez)", async () => {
  __resetRootProductCache();
  let calls = 0;
  const lookup = async (s: string) => { calls++; return s === "lika-kalpli-pembe-ve-krem-gul-sepeti"; };
  assert.equal(await resolveRootProductRedirect("/lika-kalpli-pembe-ve-krem-gul-sepeti", lookup, 0), "/urun/lika-kalpli-pembe-ve-krem-gul-sepeti");
  assert.equal(await resolveRootProductRedirect("/sik-sorulan-sorular", lookup, 0), null);
  assert.equal(await resolveRootProductRedirect("/lika-kalpli-pembe-ve-krem-gul-sepeti", lookup, 1000), "/urun/lika-kalpli-pembe-ve-krem-gul-sepeti");
  assert.equal(await resolveRootProductRedirect("/sik-sorulan-sorular", lookup, 1000), null);
  assert.equal(calls, 2);
});

test("aday olmayan yol API'ye hiç gitmez", async () => {
  __resetRootProductCache();
  let calls = 0;
  await resolveRootProductRedirect("/istanbul", async () => { calls++; return true; }, 0);
  assert.equal(calls, 0);
});

test("API geçici hata (null) → yönlendirme yok, kısa süre sonra yeniden denenir (fail-open)", async () => {
  __resetRootProductCache();
  let calls = 0;
  const flaky = async () => { calls++; return calls === 1 ? null : true; };
  assert.equal(await resolveRootProductRedirect("/gunes-isigi-beyaz-lilyum-aranjmani", flaky, 0), null);
  assert.equal(await resolveRootProductRedirect("/gunes-isigi-beyaz-lilyum-aranjmani", flaky, 5_000), null);
  assert.equal(await resolveRootProductRedirect("/gunes-isigi-beyaz-lilyum-aranjmani", flaky, 11_000), "/urun/gunes-isigi-beyaz-lilyum-aranjmani");
  assert.equal(calls, 2);
});

test("kaynak nöbeti: middleware kök ürün kuralını yönetilen 301'lerden SONRA, 308 ve sorgu korunarak uygular", () => {
  const src = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
  const managedAt = src.indexOf("const managed = await resolveManagedRedirect(req.nextUrl.pathname);");
  const rootAt = src.indexOf("const rootProduct = await resolveRootProductRedirect(req.nextUrl.pathname);");
  assert.ok(managedAt > 0 && rootAt > managedAt, "kök ürün kuralı en sonda");
  assert.match(src.slice(rootAt, rootAt + 400), /target\.search = managedRedirectSearch\(rootProduct, req\.nextUrl\.search\);\s+return NextResponse\.redirect\(target, 308\);/);
});
