// lib/blogContent.test.ts — blog içerik ayrıştırıcısının testleri (ADDITIVE).
// Çalıştırma: node --test lib/blogContent.test.ts   (npm run test:unit)
//
// EN ÖNEMLİ TEST: düz metin (bugünkü 15 yazının tamamı) bugünkü davranışın
// birebir aynısını üretmeli — boş satırla ayrılmış paragraflar, işaretleme yok.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlogContent, parseInline, safeHref } from "./blogContent.ts";

test("REGRESYON: düz metin bugünkü davranışı korur — boş satır = paragraf", () => {
  const icerik = "Birinci paragraf.\n\nİkinci paragraf.\n\nÜçüncü paragraf.";
  const blocks = parseBlogContent(icerik);
  assert.equal(blocks.length, 3);
  assert.ok(blocks.every((b) => b.type === "p"));
  assert.deepEqual(
    blocks.map((b) => (b.type === "p" ? b.inline.map((n) => n.v).join("") : "")),
    ["Birinci paragraf.", "İkinci paragraf.", "Üçüncü paragraf."]
  );
});

test("REGRESYON: yıldız içermeyen Türkçe metin bozulmadan geçer", () => {
  const t = "Orkide güneşi sever ama direkt öğle güneşini değil; süzülen ışık idealdir.";
  const blocks = parseBlogContent(t);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "p");
  assert.equal(blocks[0].type === "p" ? blocks[0].inline[0].v : "", t);
});

test("başlık: '## ' satırı h2 olur", () => {
  const blocks = parseBlogContent("## Işık meselesi\n\nMetin.");
  assert.equal(blocks[0].type, "h2");
  assert.equal(blocks[0].type === "h2" ? blocks[0].inline[0].v : "", "Işık meselesi");
  assert.equal(blocks[1].type, "p");
});

test("liste: ardışık '- ' satırları tek listeye toplanır", () => {
  const blocks = parseBlogContent("- Birinci\n- İkinci\n- Üçüncü");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "ul");
  assert.equal(blocks[0].type === "ul" ? blocks[0].items.length : 0, 3);
});

test("liste ve paragraf aynı blokta karışabilir", () => {
  const blocks = parseBlogContent("Giriş cümlesi.\n- Madde bir\n- Madde iki\nKapanış cümlesi.");
  assert.deepEqual(blocks.map((b) => b.type), ["p", "ul", "p"]);
});

test("satır içi: kalın, italik ve bağlantı", () => {
  const nodes = parseInline("Bu **kalın**, bu *italik*, bu da [bağlantı](/blog).");
  const types = nodes.map((n) => n.t);
  assert.ok(types.includes("b"));
  assert.ok(types.includes("i"));
  assert.ok(types.includes("a"));
  const link = nodes.find((n) => n.t === "a");
  assert.equal(link && link.t === "a" ? link.href : "", "/blog");
});

test("kalın, italikten önce eşleşir (** yıldızları tek yıldız sanılmaz)", () => {
  const nodes = parseInline("**çok önemli**");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].t, "b");
  assert.equal(nodes[0].v, "çok önemli");
});

test("GÜVENLİK: javascript: ve data: adresleri bağlantıya dönüşmez", () => {
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,<script>"), null);
  assert.equal(safeHref("//kotu-site.example"), null);
  const nodes = parseInline("[tıkla](javascript:alert(1))");
  assert.ok(nodes.every((n) => n.t !== "a"), "güvensiz adres bağlantı olmamalı");
});

test("GÜVENLİK: yalnız site içi yol ve http(s) kabul edilir", () => {
  assert.equal(safeHref("/kategori/güller"), "/kategori/güller");
  assert.equal(safeHref("https://www.cicekyolla.com.tr"), "https://www.cicekyolla.com.tr");
  assert.equal(safeHref("http://ornek.com/a"), "http://ornek.com/a");
  assert.equal(safeHref("#bolum"), "#bolum");
  assert.equal(safeHref("   "), null);
});

test("eşleşmeyen tek yıldız düz metin kalır (fiyat, ölçü vb. bozulmaz)", () => {
  const nodes = parseInline("3 * 4 = 12");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].t, "text");
  assert.equal(nodes[0].v, "3 * 4 = 12");
});

test("boş içerik boş dizi döner (renderer özet gösterir)", () => {
  assert.deepEqual(parseBlogContent(""), []);
  assert.deepEqual(parseBlogContent("   \n\n  "), []);
});

test("HTML girdisi düz metin olarak kalır — etiket olarak yorumlanmaz", () => {
  const blocks = parseBlogContent("<script>alert(1)</script>");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "p");
  // İçerik metin düğümüdür; renderer React ile basar → tarayıcı etiket olarak çalıştırmaz.
  assert.equal(blocks[0].type === "p" ? blocks[0].inline[0].t : "", "text");
});
