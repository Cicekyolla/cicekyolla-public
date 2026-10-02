// Maltepe pilotu — saf yardımcı testleri. Çalıştır: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseShowcasePath, totalPages, visiblePages, prevNext, showcasePageHref, titleWithPage, descriptionWithPage,
} from "./showcasePagination.ts";
import { pillarBasePath, isPillarPageData } from "./pillar-paths.ts";
import { getShowcaseItems, getLocationBlock, showcaseTotalPages, showcasePageIds, productDetailToListItem } from "./showcaseBlocks.ts";
import type { PublicProductDetail } from "./api.ts";
import { hasOperatorLinks } from "./operatorLinks.ts";
import { locationBreadcrumbJsonLd } from "./locationBreadcrumb.ts";

test("parseShowcasePath: sayfa ayrıştırma", () => {
  assert.deepEqual(parseShowcasePath("/maltepe-cicek-siparisi/sayfa/2"), { basePath: "/maltepe-cicek-siparisi", page: 2 });
  assert.deepEqual(parseShowcasePath("/istanbul/maltepe/sayfa/12/"), { basePath: "/istanbul/maltepe", page: 12 });
  assert.deepEqual(parseShowcasePath("/maltepe-cicek-siparisi/sayfa/1"), { basePath: "/maltepe-cicek-siparisi", page: 1 });
  for (const bad of ["/maltepe-cicek-siparisi", "/x/sayfa/0", "/x/sayfa/02", "/x/sayfa/abc", "/x/sayfa/-1", "/sayfa/2", "/x/sayfa/2/y", "/x/sayfa/1000000"]) {
    assert.equal(parseShowcasePath(bad).page, null, bad);
  }
});

test("totalPages / prevNext / href", () => {
  assert.equal(totalPages(0), 0);
  assert.equal(totalPages(30), 1);
  assert.equal(totalPages(31), 2);
  assert.equal(totalPages(95), 4);
  assert.deepEqual(prevNext(1, 4), { prev: null, next: 2 });
  assert.deepEqual(prevNext(4, 4), { prev: 3, next: null });
  assert.deepEqual(prevNext(1, 1), { prev: null, next: null });
  assert.equal(showcasePageHref("/m", 1), "/m");
  assert.equal(showcasePageHref("/m/", 3), "/m/sayfa/3");
});

test("visiblePages penceresi", () => {
  assert.deepEqual(visiblePages(1, 1), [1]);
  assert.deepEqual(visiblePages(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(visiblePages(1, 10), [1, 2, 3, "gap", 10]);
  assert.deepEqual(visiblePages(5, 10), [1, 2, 3, 4, 5, 6, 7, "gap", 10]);
  assert.deepEqual(visiblePages(10, 10), [1, "gap", 8, 9, 10]);
  assert.deepEqual(visiblePages(1, 0), []);
});

test("sayfa ≥2 başlık/açıklama son eki", () => {
  assert.equal(titleWithPage("T", 1), "T");
  assert.equal(titleWithPage("T", 2), "T — Sayfa 2");
  assert.equal(descriptionWithPage("D", 3), "D (Sayfa 3)");
});

test("middleware pillar ön kontrol regex'i", () => {
  assert.equal(pillarBasePath("/maltepe-cicek-siparisi"), "/maltepe-cicek-siparisi");
  assert.equal(pillarBasePath("/maltepe-cicek-siparisi/"), "/maltepe-cicek-siparisi");
  assert.equal(pillarBasePath("/maltepe-cicek-siparisi/sayfa/2"), "/maltepe-cicek-siparisi");
  for (const bad of ["/istanbul/maltepe", "/maltepe-cicek-siparisi/sayfa/x", "/maltepe-cicek-siparisi/foo", "/Maltepe-cicek-siparisi", "/a/b-cicek-siparisi", "/cicek-siparisi", "/"]) {
    assert.equal(pillarBasePath(bad), null, bad);
  }
  assert.equal(isPillarPageData({ page_type: "category_location" }), true);
  assert.equal(isPillarPageData({ page_type: "city" }), false);
  assert.equal(isPillarPageData(null), false);
});

test("vitrin bloğu ayrıştırma", () => {
  const page = { body_blocks: [
    { type: "keywords", items: ["a"] },
    { type: "showcase", items: [{ product_id: 5, active: true }, { product_id: 3 }, { product_id: 5 }, { product_id: 9, active: false }, { product_id: "x" }, { product_id: -1 }, null, { product_id: "7", active: true }] },
    { type: "location", city: "istanbul", district: "maltepe" },
  ] };
  assert.deepEqual(getShowcaseItems(page), [5, 3, 7]);
  assert.deepEqual(getShowcaseItems({ body_blocks: [] }), []);
  assert.deepEqual(getShowcaseItems(null), []);
  assert.deepEqual(getShowcaseItems({ body_blocks: [{ type: "showcase" }] }), []);
  assert.deepEqual(getLocationBlock(page), { city: "istanbul", district: "maltepe" });
  assert.equal(getLocationBlock({ body_blocks: [{ type: "location", city: "Istanbul!", district: "x" }] }), null);
  assert.equal(getLocationBlock({ body_blocks: [] }), null);
  const many = { body_blocks: [{ type: "showcase", items: Array.from({ length: 600 }, (_, i) => ({ product_id: i + 1 })) }] };
  assert.equal(getShowcaseItems(many).length, 500);
});

test("sayfa hesabı: aktif öğe sayısına göre", () => {
  assert.equal(showcaseTotalPages(0), 0);
  assert.equal(showcaseTotalPages(30), 1);
  assert.equal(showcaseTotalPages(61), 3);
  const ids = Array.from({ length: 65 }, (_, i) => i + 1);
  assert.equal(showcasePageIds(ids, 1).length, 30);
  assert.deepEqual(showcasePageIds(ids, 3), [61, 62, 63, 64, 65]);
  assert.deepEqual(showcasePageIds(ids, 4), []);
});

test("ürün detayından kart eşleme", () => {
  const detail = {
    product: { id: 1, name: "Buket", slug: "buket", price_minor: 100000, sale_price_minor: null, currency: "TRY", status: "active", product_type: "flower", is_featured: false, is_bestseller: true, is_new: false, stock_quantity: 4, same_day_available: true, delivery_scope: "istanbul" },
    images: [{ id: 2, url: "/b.jpg", alt: null, role: "gallery", sort_order: 0 }, { id: 1, url: "/a.jpg", alt: null, role: "cover", sort_order: 0 }],
    categories: [{ category_id: 9, is_primary: true }], variants: [], seo: null,
  } as unknown as PublicProductDetail;
  const item = productDetailToListItem(detail)!;
  assert.equal(item.cover_image_url, "/a.jpg");
  assert.equal(item.primary_category_id, 9);
  assert.equal(item.slug, "buket");
  const mod = (patch: Record<string, unknown>) => ({ ...detail, product: { ...detail.product, ...patch } }) as unknown as PublicProductDetail;
  assert.equal(productDetailToListItem(mod({ status: "draft" })), null);
  assert.equal(productDetailToListItem(mod({ stock_quantity: 0 })), null);
  assert.equal(productDetailToListItem({ ...detail, images: [] } as PublicProductDetail), null);
  assert.equal(productDetailToListItem(null), null);
});

test("hasOperatorLinks", () => {
  assert.equal(hasOperatorLinks('<p>Merhaba <a href="/x">x</a></p>'), true);
  assert.equal(hasOperatorLinks("<p><A HREF='/x'>x</A></p>"), true);
  assert.equal(hasOperatorLinks("<p>İstanbul çiçek</p>"), false);
  assert.equal(hasOperatorLinks("<abbr>x</abbr><article>y</article>"), false);
  assert.equal(hasOperatorLinks(null), false);
  assert.equal(hasOperatorLinks(""), false);
});

test("breadcrumb: districtStep opsiyonel; yoksa bugünkü çıktı", () => {
  const abs = (y: string) => `https://x${y}`;
  const base = JSON.parse(locationBreadcrumbJsonLd(["istanbul", "maltepe"], ["İstanbul", "Maltepe"], abs)!);
  assert.equal(base.itemListElement.at(-1).item, "https://x/istanbul/maltepe");
  const pillar = JSON.parse(locationBreadcrumbJsonLd(["istanbul", "maltepe"], ["İstanbul", "Maltepe"], abs, { ad: "Maltepe Çiçek Siparişi", yol: "/maltepe-cicek-siparisi" })!);
  assert.equal(pillar.itemListElement.at(-1).item, "https://x/maltepe-cicek-siparisi");
  assert.equal(pillar.itemListElement.at(-1).name, "Maltepe Çiçek Siparişi");
  const hood = JSON.parse(locationBreadcrumbJsonLd(["istanbul", "maltepe", "x-mah"], ["İstanbul", "Maltepe", "X"], abs, { ad: "Maltepe Çiçek Siparişi", yol: "/maltepe-cicek-siparisi" })!);
  assert.deepEqual(hood.itemListElement.map((i: { item: string }) => i.item), ["https://x/", "https://x/istanbul", "https://x/maltepe-cicek-siparisi", "https://x/istanbul/maltepe/x-mah"]);
});
