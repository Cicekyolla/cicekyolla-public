import test from "node:test";
import assert from "node:assert/strict";
import { slugFromHref } from "./i18n/slug.ts";

test("slugFromHref: href → kategori slug'ı (URL değişmez, yalnız etiket eşlemesi)", () => {
  assert.equal(slugFromHref("/kategori/guller"), "guller");
  assert.equal(slugFromHref("/kategori/Guller/?a=1#x"), "guller");
  assert.equal(slugFromHref("/kategori/turkiye-geneli-kargo/"), "turkiye-geneli-kargo");
  assert.equal(slugFromHref(""), "");
  assert.equal(slugFromHref(null), "");
});
