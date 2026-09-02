// lib/categoryTreeLight.test.ts — hafif kategori ağacı: uç sırası (public-tree →
// tam ağaç → no-store), Data Cache'e uygun init, tek kayıt zenginleştirme.
// Çalıştırma: node --test lib/categoryTreeLight.test.ts  (npm run test:unit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryTreeAttempts, fetchTreeViaAttempts, fetchCategoryRowById } from "./categoryTreeFetch.ts";
import { needsCategorySeoFields, isLightCategoryNode, mergeCategoryNode } from "./categoryNodeEnrich.ts";

type Call = { url: string; init: RequestInit & { next?: { revalidate?: number }; cache?: string } };
function stubFetch(handler: (url: string) => { status: number; body?: unknown }) {
  const calls: Call[] = [];
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: (init ?? {}) as Call["init"] });
    const r = handler(url);
    return new Response(r.status === 200 ? JSON.stringify(r.body ?? null) : "not found", {
      status: r.status, headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, fetchFn };
}
const ORIGIN = "https://api.test";
const H = { Authorization: "Bearer x", "x-user-role": "viewer" };
const attempts = () => categoryTreeAttempts(ORIGIN, "/api/categories", H);
const light = [{ id: 3, parent_id: null, name: "Çiçekler", slug: "cicekler", status: "active", banner_image: null, is_indexable: true, product_count: 12, children: [] }];
const full = [{ ...light[0], description: "<p>uzun</p>", faq_json: [], seo_title: "t" }];

test("deneme sırası: public-tree (revalidate 300) → tam ağaç (revalidate 300) → tam ağaç no-store; başlık her denemede", () => {
  const a = attempts();
  assert.deepEqual(a.map((x) => x.url), [`${ORIGIN}/api/categories/public-tree`, `${ORIGIN}/api/categories`, `${ORIGIN}/api/categories`]);
  assert.equal((a[0].init as Call["init"]).next?.revalidate, 300);
  assert.equal((a[1].init as Call["init"]).next?.revalidate, 300);
  assert.equal(a[2].init.cache, "no-store");
  for (const x of a) assert.deepEqual(x.init.headers, H);
});

test("hafif uç ÖNCE: tek çağrı; tam ağaç HİÇ istenmez", async () => {
  const s = stubFetch((u) => (u.endsWith("/api/categories/public-tree") ? { status: 200, body: light } : { status: 500 }));
  const tree = await fetchTreeViaAttempts<{ slug: string }>(attempts(), s.fetchFn);
  assert.equal(tree?.[0]?.slug, "cicekler");
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].init.cache, undefined, "no-store DEĞİL → Data Cache'e girer");
});

test("API eski sürümdeyse (public-tree 404) mevcut tam ağaca düşer → deploy sırasından bağımsız, davranış bugünkü gibi", async () => {
  const s = stubFetch((u) => (u.endsWith("/public-tree") ? { status: 404 } : { status: 200, body: { data: full } }));
  const tree = await fetchTreeViaAttempts<{ slug: string; description?: string }>(attempts(), s.fetchFn);
  assert.equal(tree?.[0]?.description, "<p>uzun</p>");
  assert.deepEqual(s.calls.map((c) => c.url.split("/api/")[1]), ["categories/public-tree", "categories"]);
  assert.equal(s.calls[1].init.next?.revalidate, 300);
});

test("geçici kesinti: hafif ve tam uç düşerse son çare no-store tekrar; hepsi düşerse null; name/slug'sız düğüm elenir", async () => {
  let n = 0;
  const s = stubFetch(() => { n++; return n === 3 ? { status: 200, body: full } : { status: 503 }; });
  const tree = await fetchTreeViaAttempts(attempts(), s.fetchFn);
  assert.equal(tree?.length, 1);
  assert.equal(s.calls.length, 3);
  assert.equal(s.calls[2].init.cache, "no-store");
  const dead = stubFetch(() => ({ status: 503 }));
  assert.equal(await fetchTreeViaAttempts(attempts(), dead.fetchFn), null);
  assert.equal(dead.calls.length, 3);
  const junk = stubFetch(() => ({ status: 200, body: [{ id: 1 }, { name: "x" }] }));
  assert.equal(await fetchTreeViaAttempts(attempts(), junk.fetchFn), null, "geçerli düğüm yoksa sonraki denemeye geçer, sonunda null");
});

test("fetchCategoryRowById: GET /api/categories/:id revalidate:300; zarf esnek; 404/hata/geçersiz id → null (fırlatmaz)", async () => {
  const s = stubFetch((u) => (u.endsWith("/api/categories/3") ? { status: 200, body: { data: full[0] } } : { status: 404 }));
  const row = await fetchCategoryRowById(ORIGIN, "/api/categories", H, 3, s.fetchFn);
  assert.equal(row?.description, "<p>uzun</p>");
  assert.equal(s.calls[0].init.next?.revalidate, 300);
  assert.equal(await fetchCategoryRowById(ORIGIN, "/api/categories", H, 99, s.fetchFn), null);
  assert.equal(await fetchCategoryRowById(ORIGIN, "/api/categories", H, Number.NaN, s.fetchFn), null);
  assert.equal(s.calls.length, 2, "geçersiz id için istek atılmaz");
});

test("SEO fallback yalnız gerektiğinde: kayıt yok/boş alan → true; tam kayıt → false", () => {
  const base = { url_path: "/kategori/x", page_type: "category", lang: "tr", index_state: "index", canonical_url: "/kategori/x", intro_html: null, body_blocks: [], faq: [], schema_jsonld: {} };
  assert.equal(needsCategorySeoFields(null), true);
  assert.equal(needsCategorySeoFields({ ...base, h1: "Güller", title_tag: "Güller", meta_description: "d" }), false);
  assert.equal(needsCategorySeoFields({ ...base, h1: "", title_tag: "Güller", meta_description: "d" }), true);
  assert.equal(needsCategorySeoFields({ ...base, h1: "G", title_tag: "G", meta_description: "   " }), true);
});

test("hafif düğüm + tek kayıt birleşimi: kayıt alanları gelir, children ve ağaç kimliği korunur; kayıt yoksa düğüm aynen", () => {
  const node = { id: 3, name: "Çiçekler", slug: "cicekler", status: "active", children: [{ id: 13, slug: "guller" }] };
  assert.equal(isLightCategoryNode(node), true);
  assert.equal(isLightCategoryNode({ ...node, description: null }), false, "tam ağaçta anahtar her zaman var");
  const merged = mergeCategoryNode(node, { id: 3, description: "<p>d</p>", faq_json: [{ q: "s", a: "c" }], h1_title: "H", children: "IGNORED" });
  assert.equal(merged.description, "<p>d</p>"); assert.equal(merged.h1_title, "H");
  assert.deepEqual(merged.children, node.children);
  assert.equal(mergeCategoryNode(node, null), node);
});
