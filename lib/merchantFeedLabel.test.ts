import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE = readFileSync(join(process.cwd(), "app/api/merchant-feed.xml/route.ts"), "utf8");

test("Merchant feed: her ürün kaynak etiketi taşır (custom_label_2 = tr_feed)", () => {
  assert.match(ROUTE, /const FEED_SOURCE_LABEL = "tr_feed";/);
  assert.match(ROUTE, /<g:custom_label_2>\$\{FEED_SOURCE_LABEL\}<\/g:custom_label_2>/);
});

test("Merchant feed: mevcut etiketler değişmedi (0 = teslimat kapsamı, 1 = aynı gün)", () => {
  assert.match(ROUTE, /<g:custom_label_0>\$\{esc\(product\.delivery_scope \|\| "standard"\)\}<\/g:custom_label_0>/);
  assert.match(ROUTE, /<g:custom_label_1>\$\{product\.same_day_available \? "same_day" : "standard_delivery"\}<\/g:custom_label_1>/);
  // Bağlantı Türkçe ürün adresidir; dil öneki taşımaz.
  assert.match(ROUTE, /<g:link>\$\{esc\(abs\(`\/urun\/\$\{product\.slug\}`\)\)\}<\/g:link>/);
});
