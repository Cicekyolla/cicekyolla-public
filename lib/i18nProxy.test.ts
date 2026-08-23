import test from "node:test";
import assert from "node:assert/strict";
import { resolveUpstream } from "./i18n/proxy.ts";

const P = (q: string) => new URLSearchParams(q);
const O = "https://api";

test("tr / geçersiz locale → upstream'e gidilmez, data:null (TR fallback)", () => {
  assert.deepEqual(resolveUpstream("product", P("slug=abc&locale=tr"), O), { data: null });
  assert.deepEqual(resolveUpstream("categories", P("locale=xx"), O), { data: null });
  assert.deepEqual(resolveUpstream("product", P("slug=abc"), O), { data: null });
});

test("approved overlay yolu: product / products / categories doğru upstream'e gider", () => {
  assert.deepEqual(resolveUpstream("product", P("slug=cift-govdeli-yucca&locale=en"), O), { upstream: `${O}/api/public/translations/product/cift-govdeli-yucca?locale=en` });
  assert.deepEqual(resolveUpstream("products", P("ids=1,abc,2&locale=de"), O), { upstream: `${O}/api/public/translations/products?locale=de&ids=1,2` });
  assert.deepEqual(resolveUpstream("categories", P("locale=ar"), O), { upstream: `${O}/api/public/translations/categories?locale=ar` });
});

test("güvenlik: bozuk slug reddi, boş id listesi, bilinmeyen kind", () => {
  assert.deepEqual(resolveUpstream("product", P("slug=../x&locale=en"), O), { data: null });
  assert.deepEqual(resolveUpstream("products", P("ids=abc&locale=en"), O), { data: {} });
  assert.deepEqual(resolveUpstream("other", P("locale=en"), O), { data: null });
  const many = Array.from({ length: 300 }, (_, i) => i + 1).join(",");
  const d = resolveUpstream("products", P(`ids=${many}&locale=en`), O) as { upstream: string };
  assert.equal(d.upstream.split("ids=")[1].split(",").length, 200);
});
