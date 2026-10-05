// Ana sayfa "Editör Seçimleri" yedeği sabit kodlu ÜRÜN üretmez; dil ürün sayfası twitter:image = ürün kapağı.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("EditorsPicks: uydurma ürün yedeği yok — gerçek ürün yoksa yalnız editoryal kategori kartları", () => {
  const src = read("components/home/EditorsPicks.tsx");
  assert.equal(/const\s+productFallback/.test(src), false, "sabit kodlu ürün listesi geri gelmemeli");
  assert.equal(src.includes("images.unsplash.com"), false, "stok fotoğraflı hayali kart olmamalı");
  // Seçim zincirinin SON dalı (hiç kart / hiç ürün yok) editoryal yedektir.
  assert.match(src, /products\?\.length\?products:editorialFallback\)/);
  // Editoryal yedeğin her kartı bir KATEGORİ adresine gider; ürün slug'ı / fiyat taşımaz.
  const block = src.slice(src.indexOf("const editorialFallback"), src.indexOf("export function EditorsPicks"));
  const hrefs = [...block.matchAll(/href:"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, 3);
  for (const h of hrefs) assert.match(h, /^\/kategori\/[a-z0-9-]+$/);
  assert.equal(/slug:"/.test(block), false, "yedek kart ürün slug'ı taşımamalı");
  assert.equal(/price:/.test(block), false, "yedek kart fiyat taşımamalı");
});

test("dil ürün sayfası: twitter görseli og:image ile aynı kaynaktan (kapak; yoksa varsayılan)", () => {
  const src = read("lib/global/page.tsx");
  const i = src.indexOf("openGraph: localeOpenGraph(locale, { url: self, title, description: surface.meta_description, image: cover })");
  assert.ok(i > 0);
  const after = src.slice(i, i + 900);
  assert.match(after, /twitter:\s*\{[\s\S]*?card: "summary_large_image"[\s\S]*?images: \[cover \?\? absoluteUrl\("\/twitter-image"\)\]/);
});
