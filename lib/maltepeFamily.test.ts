// Maltepe ailesi (ilçe + 18 mahalle, "URL değiştir" ile taşınmış satırlar) — saf yardımcı testleri. Çalıştır: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { getLocationBlock, hierarchicalPathOf } from "./showcaseBlocks.ts";
import { isManagedTargetPath } from "./managed-redirects.ts";
import { locationBreadcrumbJsonLd } from "./locationBreadcrumb.ts";
import { finalPathOf, normalizeInternalPath, withMovedDistrictHrefs } from "./internalHref.ts";

const abs = (y: string) => `https://x${y}`;

test("konum bloğu: ilçe düzeyi (neighborhood yok)", () => {
  assert.deepEqual(getLocationBlock({ body_blocks: [{ type: "location", city: "istanbul", district: "maltepe" }] }), { city: "istanbul", district: "maltepe" });
  assert.deepEqual(getLocationBlock({ body_blocks: [{ type: "location", city: "istanbul", district: "maltepe", neighborhood: "" }] }), { city: "istanbul", district: "maltepe" });
});

test("konum bloğu: mahalle düzeyi; geçersiz mahalle slug'ı bloğu geçersiz kılar", () => {
  const ok = getLocationBlock({ body_blocks: [{ type: "location", city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" }] });
  assert.deepEqual(ok, { city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" });
  assert.equal(getLocationBlock({ body_blocks: [{ type: "location", city: "istanbul", district: "maltepe", neighborhood: "Aydınevler!" }] }), null);
  assert.equal(getLocationBlock({ body_blocks: [{ type: "location", city: "istanbul", district: "maltepe", neighborhood: 5 }] }), null);
});

test("hiyerarşik yol: il/ilçe[/mahalle]", () => {
  assert.equal(hierarchicalPathOf({ city: "istanbul", district: "maltepe" }), "/istanbul/maltepe");
  assert.equal(hierarchicalPathOf({ city: "istanbul", district: "maltepe", neighborhood: "cinar-mah" }), "/istanbul/maltepe/cinar-mah");
});

test("yönetilen 301 hedefi: sayfalama yolları da muaf (legacy kurallar yutmaz)", () => {
  const targets = new Set(["/maltepe-cicek-siparisi", "/maltepe/aydinevler-cicek-siparisi"]);
  assert.equal(isManagedTargetPath("/maltepe-cicek-siparisi", targets), true);
  assert.equal(isManagedTargetPath("/maltepe-cicek-siparisi/sayfa/2", targets), true);
  assert.equal(isManagedTargetPath("/maltepe/aydinevler-cicek-siparisi/sayfa/3/", targets), true);
  assert.equal(isManagedTargetPath("/maltepe/aydinevler-cicek-siparisi/sayfa/0", targets), false);
  assert.equal(isManagedTargetPath("/maltepe/aydinevler-cicek-siparisi/foo", targets), false);
  assert.equal(isManagedTargetPath("/baska-cicek-siparisi/sayfa/2", targets), false);
});

test("kırıntı: taşınmış mahalle — ara basamak üst sayfa, son basamak kendi adresi", () => {
  const hood = JSON.parse(locationBreadcrumbJsonLd(
    ["istanbul", "maltepe", "aydinevler-mah"], ["İstanbul", "Maltepe", "Aydınevler"], abs,
    { ad: "Maltepe Çiçek Siparişi", yol: "/maltepe-cicek-siparisi" }, "/maltepe/aydinevler-cicek-siparisi",
  )!);
  assert.deepEqual(hood.itemListElement.map((i: { item: string }) => i.item), ["https://x/", "https://x/istanbul", "https://x/maltepe-cicek-siparisi", "https://x/maltepe/aydinevler-cicek-siparisi"]);
});

test("kırıntı: selfPath verilmezse bugünkü çıktı; ilçe düzeyinde selfPath son basamağı değiştirir", () => {
  const plain = JSON.parse(locationBreadcrumbJsonLd(["istanbul", "kadikoy", "moda-mah"], ["İstanbul", "Kadıköy", "Moda"], abs)!);
  assert.equal(plain.itemListElement.at(-1).item, "https://x/istanbul/kadikoy/moda-mah");
  const d = JSON.parse(locationBreadcrumbJsonLd(["istanbul", "maltepe"], ["İstanbul", "Maltepe"], abs, null, "/maltepe-cicek-siparisi")!);
  assert.equal(d.itemListElement.at(-1).item, "https://x/maltepe-cicek-siparisi");
  const city = JSON.parse(locationBreadcrumbJsonLd(["istanbul"], ["İstanbul"], abs, null, "/baska")!);
  assert.equal(city.itemListElement.at(-1).item, "https://x/istanbul"); // tek basamakta selfPath uygulanmaz
});

test("iç bağ çözümü: yönetilen 301 kaynağı → hedef; diğerleri aynen", () => {
  const map = new Map([["/istanbul/maltepe", "/maltepe-cicek-siparisi"], ["/istanbul/maltepe/cinar-mah", "/maltepe/cinar-cicek-siparisi"]]);
  assert.equal(finalPathOf(map, "/istanbul/maltepe"), "/maltepe-cicek-siparisi");
  assert.equal(finalPathOf(map, "/istanbul/maltepe/"), "/maltepe-cicek-siparisi");
  assert.equal(finalPathOf(map, "/istanbul/maltepe/cinar-mah?x=1"), "/maltepe/cinar-cicek-siparisi");
  assert.equal(finalPathOf(map, "/istanbul/kartal"), "/istanbul/kartal");
  assert.equal(finalPathOf(new Map(), "/istanbul/maltepe"), "/istanbul/maltepe");
  assert.equal(normalizeInternalPath("istanbul//"), "/istanbul");
});

test("teslimat bölgeleri: taşınmış ilçeye href eklenir; harita boşsa girdi aynen döner", () => {
  const zones = [{ city: "İstanbul", city_slug: "istanbul", same_day: true, districts: [{ name: "Maltepe", slug: "maltepe", same_day: true }, { name: "Kartal", slug: "kartal", same_day: true }] }];
  assert.equal(withMovedDistrictHrefs(zones, new Map()), zones);
  const out = withMovedDistrictHrefs(zones, new Map([["/istanbul/maltepe", "/maltepe-cicek-siparisi"]]));
  assert.equal(out[0].districts[0].href, "/maltepe-cicek-siparisi");
  assert.equal(out[0].districts[1].href, undefined);
});

// ---- yönetilen 301 haritası: geçici hata uzun süre sabitlenmez (KAYNAK deseni testi; modül ağ okur) ----
import { readFileSync } from "node:fs";
test("managed-redirects: hata sonucu kısa TTL ile saklanır, başarılı yanıtta TTL_MS aynen", () => {
  const src = readFileSync(new URL("./managed-redirects.ts", import.meta.url), "utf8");
  assert.match(src, /const ERROR_TTL_MS = 10_000;/);
  assert.match(src, /expiresAt: Date\.now\(\) \+ \(lastFetchFailed \? ERROR_TTL_MS : TTL_MS\)/);
  assert.match(src, /if \(!res\.ok\) \{ lastFetchFailed = true;/);
  assert.match(src, /lastFetchFailed = false;/);
});
