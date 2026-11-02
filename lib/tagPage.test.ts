import { test } from "node:test";
import assert from "node:assert/strict";
import { getTagPage, tagBreadcrumbJsonLd } from "./tagPage.ts";

const tagBlock = { type: "tag", city: "istanbul", district: "kadikoy", district_name: "Kadıköy", category_slug: "orkideler", category_name: "Orkideler" };
const showcase = { type: "showcase", mode: "auto", source: { kind: "category", category_id: 7 } };
const page = (over: Record<string, unknown> = {}) => ({ page_type: "category_location", body_blocks: [tagBlock, showcase], ...over });

test("geçerli etiket sayfası çözülür", () => {
  assert.deepEqual(getTagPage(page(), "/kadikoy/orkideler"), {
    city: "istanbul", district: "kadikoy", districtName: "Kadıköy", categorySlug: "orkideler", categoryName: "Orkideler",
    pillarPath: "/kadikoy-cicek-siparisi", categoryPath: "/kategori/orkideler", sameDay: true,
  });
});

test("başka sayfa türleri ve bloksuz sayfa: dokunulmaz (null)", () => {
  assert.equal(getTagPage(page({ page_type: "district" }), "/kadikoy/orkideler"), null);
  assert.equal(getTagPage(page({ page_type: "neighborhood" }), "/kadikoy/orkideler"), null);
  assert.equal(getTagPage(page({ body_blocks: [showcase] }), "/kadikoy/orkideler"), null);
  assert.equal(getTagPage(null, "/kadikoy/orkideler"), null);
});

test("location bloğu taşıyan sayfa pillar/mahalle akışında kalır", () => {
  const withLoc = page({ body_blocks: [tagBlock, { type: "location", city: "istanbul", district: "kadikoy" }] });
  assert.equal(getTagPage(withLoc, "/kadikoy/orkideler"), null);
});

test("adres bloktaki ilçe/etiketle birebir eşleşmeli", () => {
  assert.equal(getTagPage(page(), "/istanbul/kadikoy/orkideler"), null);
  assert.equal(getTagPage(page(), "/kadikoy/sevgiliye-cicek"), null);
  assert.equal(getTagPage(page(), "/kadikoy-cicek-siparisi"), null);
});

test("mahalle adres kalıbı ve geçersiz alanlar reddedilir", () => {
  const hood = page({ body_blocks: [{ ...tagBlock, category_slug: "moda-cicek-siparisi" }] });
  assert.equal(getTagPage(hood, "/kadikoy/moda-cicek-siparisi"), null);
  assert.equal(getTagPage(page({ body_blocks: [{ ...tagBlock, district: "Kadıköy" }] }), "/Kadıköy/orkideler"), null);
  assert.equal(getTagPage(page({ body_blocks: [{ ...tagBlock, category_name: "" }] }), "/kadikoy/orkideler"), null);
  assert.equal(getTagPage(page({ body_blocks: [{ ...tagBlock, district_name: "x".repeat(61) }] }), "/kadikoy/orkideler"), null);
});

test("İstanbul dışı: aynı gün değil", () => {
  const ank = page({ body_blocks: [{ ...tagBlock, city: "ankara", district: "cankaya" }] });
  assert.equal(getTagPage(ank, "/cankaya/orkideler")?.sameDay, false);
});

test("kırıntı yolu: Ana Sayfa → ilçe pillar → sayfa", () => {
  const info = getTagPage(page(), "/kadikoy/orkideler")!;
  const ld = JSON.parse(tagBreadcrumbJsonLd(info, "Kadıköy Orkide Siparişi", "/kadikoy/orkideler", (p) => `https://x.test${p}`));
  assert.deepEqual(ld.itemListElement.map((i: { name: string; item: string }) => [i.name, i.item]), [
    ["Ana Sayfa", "https://x.test/"],
    ["Kadıköy Çiçekçi", "https://x.test/kadikoy-cicek-siparisi"],
    ["Kadıköy Orkide Siparişi", "https://x.test/kadikoy/orkideler"],
  ]);
});
