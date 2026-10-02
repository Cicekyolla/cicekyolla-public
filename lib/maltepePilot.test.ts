// Maltepe pilotu — saf yardımcı testleri. Çalıştır: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseShowcasePath, totalPages, visiblePages, prevNext, showcasePageHref, titleWithPage, descriptionWithPage,
} from "./showcasePagination.ts";
import { isPillarPathname } from "./pillar-paths.ts";
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

test("middleware pillar muafiyeti (saf)", () => {
  const set = new Set(["/maltepe-cicek-siparisi"]);
  assert.equal(isPillarPathname("/maltepe-cicek-siparisi", set), true);
  assert.equal(isPillarPathname("/maltepe-cicek-siparisi/", set), true);
  assert.equal(isPillarPathname("/maltepe-cicek-siparisi/sayfa/2", set), true);
  assert.equal(isPillarPathname("/maltepe-cicek-siparisi/sayfa/x", set), false);
  assert.equal(isPillarPathname("/kadikoy-cicek-siparisi", set), false);
  assert.equal(isPillarPathname("/maltepe-cicek-siparisi", new Set()), false); // fail-safe
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
