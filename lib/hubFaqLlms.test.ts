// C9 + C10 (6 Kas 2026) — İstanbul hub FAQPage (yalnız görünen SSS) + llms.txt uluslararası bölüm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("C9: FAQPage yalnız İstanbul hub'ında, 1. sayfada, SSS bölümü görünürken; niyet sayfası yolu aynen", () => {
  const src = oku("./global/page.tsx");
  assert.match(src, /const hubFaqLd = !intent && row\.page_key === DESTINATION_ROOT && !continuation && order\.includes\("content"\) \? faqJsonLd\(row\.faq\) : null;/);
  // Şema, görünen SSS ile AYNI kaynaktan (row.faq → FaqSection) — uydurma soru yok.
  assert.match(src, /<FaqSection locale=\{locale\} faq=\{row\.faq\} \/>/);
  assert.match(src, /\{hubFaqLd \? <script type="application\/ld\+json" dangerouslySetInnerHTML=\{\{ __html: escapeJsonLdText\(hubFaqLd\) \}\} \/> : null\}/);
  assert.match(src, /const faqLd = intent \? faqJsonLd\(row\.faq\) : null;/);
  // Tanım, kullanımdan önce (continuation + order hesaplandıktan sonra).
  assert.ok(src.indexOf("const hubFaqLd") > src.indexOf("const continuation = isLocationContinuationPage(view, order);"));
});

test("C10: llms.txt — TR bölümü aynen, İngilizce uluslararası bölüm + 13 dil hub + otel/hastane", () => {
  const t = oku("../public/llms.txt");
  assert.ok(t.startsWith("# Çiçekyolla\n\n> Çiçekyolla, 1986 yılında kurulan"), "TR başlık aynen");
  assert.ok(t.includes("## Sitemap\n- https://www.cicekyolla.com.tr/sitemap.xml\n"), "TR sitemap aynen");
  assert.ok(t.indexOf("## International customers (English)") > t.indexOf("## Sitemap"), "yeni bölüm sonda");
  const hubs = t.match(/\(https:\/\/www\.cicekyolla\.com\.tr\/(en|de|fr|nl|it|es|pt|az|ru|ar|zh|ja|ko)\/[^)]+\)/g) ?? [];
  const langs = new Set(hubs.map((h) => h.split("/")[3]));
  assert.equal(langs.size, 13);
  assert.ok(t.includes("/en/hotel-delivery") && t.includes("/en/hospital-delivery"));
  // İçerik kuralı: fiyat, süre vaadi, iade/garanti yok.
  const intl = t.slice(t.indexOf("## International customers"));
  assert.doesNotMatch(intl, /[$€£₺]|\d+\s?(min|minutes|hours)|refund|guarantee/i);
});
