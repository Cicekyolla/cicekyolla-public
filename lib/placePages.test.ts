// lib/placePages.test.ts — yer sayfaları çekirdeği (ADDITIVE).
// Çalıştırma: node --test lib/placePages.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLACE_KINDS, getPlaceHub, getPlaceInfo, isPlacePagePath, parsePlacePath, placePath, textBlocks, validCategoryId } from "./placePages.ts";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("6 yer ailesi, sabit hub adresleri", () => {
  assert.deepEqual(PLACE_KINDS.map((k) => k.hub), [
    "/hastaneye-cicek-gonderimi", "/otele-cicek-gonderimi", "/fuara-cicek-gonderimi", "/camiye-celenk-gonderimi", "/avmye-cicek-gonderimi",
    "/dugun-salonuna-cicek-gonderimi",
  ]);
});

test("parsePlacePath: hub, yer, geçersiz", () => {
  assert.deepEqual(parsePlacePath("/hastaneye-cicek-gonderimi"), { kind: "hastane", slug: null });
  assert.deepEqual(parsePlacePath("/hastaneye-cicek-gonderimi/"), { kind: "hastane", slug: null });
  assert.deepEqual(parsePlacePath("/otele-cicek-gonderimi/hilton-bomonti?x=1"), { kind: "otel", slug: "hilton-bomonti" });
  assert.equal(parsePlacePath("/otele-cicek-gonderimi/Hilton"), null, "büyük harf slug yok");
  assert.equal(parsePlacePath("/otele-cicek-gonderimi/a/b"), null, "iki seviye yok");
  assert.equal(parsePlacePath("/hastaneye-cicek-gonder"), null, "eski adres ailesi değil");
  assert.equal(parsePlacePath("/maltepe-cicek-siparisi"), null);
  assert.equal(isPlacePagePath("/avmye-cicek-gonderimi/zorlu-center"), true);
  assert.equal(placePath("cami", "suleymaniye-camii"), "/camiye-celenk-gonderimi/suleymaniye-camii");
  assert.equal(placePath("fuar"), "/fuara-cicek-gonderimi");
});

test("bloklar: place-info / place-hub / metin; bozuk girdiler süzülür", () => {
  const blocks = [
    { type: "place-info", name: "Acıbadem Maslak", district: "Sarıyer", category_id: 12 },
    { type: "paragraph", text: "Merhaba" },
    { type: "heading", text: "  " },
    { type: "place-hub", places: [{ slug: "a-b", name: "A B" }, { slug: "Bozuk Slug", name: "x" }, { slug: "c", name: "" }] },
  ];
  assert.equal(getPlaceInfo(blocks)?.name, "Acıbadem Maslak");
  assert.deepEqual(getPlaceHub(blocks)?.places, [{ slug: "a-b", name: "A B" }]);
  assert.deepEqual(textBlocks(blocks), [{ type: "paragraph", text: "Merhaba" }]);
  assert.equal(getPlaceInfo(null), null);
  assert.equal(validCategoryId("12"), 12);
  assert.equal(validCategoryId(0), null);
  assert.equal(validCategoryId("x"), null);
});

test("KAYNAK: middleware eski URL kurallarını yer sayfalarında çalıştırmaz (dar muafiyet)", () => {
  const mw = oku("middleware.ts");
  assert.ok(mw.includes("const legacyMuaf = isPlacePagePath(req.nextUrl.pathname) || await isManagedRedirectTarget(req.nextUrl.pathname);"));
});

test("KAYNAK: 6 rota aynı paylaşılan sayfayı kullanır", () => {
  for (const k of PLACE_KINDS) {
    const src = oku(`app${k.hub}/[[...slug]]/page.tsx`);
    assert.ok(src.includes(`placePageMetadata("${k.kind}"`) && src.includes(`<PlacePage kind="${k.kind}"`), k.hub);
  }
});
