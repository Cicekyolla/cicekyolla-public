// lib/productBreadcrumb.test.ts — TR ürün sayfası kanonik slug + BreadcrumbList testleri.
// Çalıştırma: node --test lib/productBreadcrumb.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  breadcrumbCategoryOf,
  buildProductBreadcrumbJsonLd,
  findCategoryNodeById,
  productSlugRedirectPath,
  withRequestQuery,
} from "./productBreadcrumb.ts";
import { serializeJsonLd } from "./productSchema.ts";

const SITE = "https://www.cicekyolla.com.tr";
const mutlak = (p: string) => `${SITE}${p.startsWith("/") ? p : `/${p}`}`;
const oku = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// ---------------------------------------------------------------------------
// 1) Kanonik slug yönlendirmesi
// ---------------------------------------------------------------------------

test("slug kayıtlı slug ile aynıysa yönlendirme yok", () => {
  assert.equal(productSlugRedirectPath("101-kirmizi-gul-buketi", "101-kirmizi-gul-buketi"), null);
});

test("büyük/küçük harf farkı → kayıtlı slug'a kalıcı yönlendirme yolu", () => {
  assert.equal(productSlugRedirectPath("101-Kirmizi-Gul-Buketi", "101-kirmizi-gul-buketi"), "/urun/101-kirmizi-gul-buketi");
  assert.equal(productSlugRedirectPath("ORKIDE", "orkide"), "/urun/orkide");
});

test("başka normalizasyon farkı (boşluk, eski slug) da kayıtlı slug'a gider", () => {
  assert.equal(productSlugRedirectPath("orkide%20", "orkide"), "/urun/orkide");
  assert.equal(productSlugRedirectPath("eski-ad", "yeni-ad"), "/urun/yeni-ad");
});

test("DÖNGÜ YOK: hedefe varıldığında (ham ya da yüzde-kodlu) istek kayıtlı slug'a eşittir", () => {
  const stored = "çiçek-buketi";
  const target = productSlugRedirectPath("Çiçek-Buketi", stored)!;
  assert.equal(target, `/urun/${encodeURIComponent(stored)}`);
  const kodlu = target.replace("/urun/", "");
  assert.equal(productSlugRedirectPath(kodlu, stored), null, "Next params'ı kodlu verirse");
  assert.equal(productSlugRedirectPath(decodeURIComponent(kodlu), stored), null, "Next params'ı çözülmüş verirse");
  // ASCII slug'ta hedef kayıtlı slug'ın kendisidir.
  assert.equal(productSlugRedirectPath("abc-1", "abc-1"), null);
});

test("kayıtlı slug yoksa / boşsa yönlendirme yok (bugünkü davranış)", () => {
  for (const bos of [null, undefined, "", "   "]) assert.equal(productSlugRedirectPath("abc", bos), null);
});

test("bozuk yüzde-kodlaması patlamaz", () => {
  assert.equal(productSlugRedirectPath("%E0%A4%A", "abc"), "/urun/abc");
  assert.equal(productSlugRedirectPath("%zz", "%zz"), null);
});

// ---------------------------------------------------------------------------
// 2) Birincil kategori çözümü
// ---------------------------------------------------------------------------

const AGAC = [
  {
    id: "3", name: "Çiçekler", slug: "cicekler", status: "active",
    children: [
      { id: 13, name: "Güller", slug: "guller", status: "active", children: [{ id: "102", name: "Kırmızı Gül Buketleri", slug: "kirmizi-gul-buketleri" }] },
      { id: 14, name: "  ", slug: "adsiz" },
    ],
  },
  { id: 9, name: "Bitkiler", slug: "bitkiler", status: "passive" },
];

test("findCategoryNodeById: derinlik dahil bulur; id sayı ya da metin olabilir", () => {
  assert.equal(findCategoryNodeById(AGAC, 3)?.slug, "cicekler");
  assert.equal(findCategoryNodeById(AGAC, "13")?.slug, "guller");
  assert.equal(findCategoryNodeById(AGAC, 102)?.slug, "kirmizi-gul-buketleri");
});

test("findCategoryNodeById: ağaç yok / id geçersiz / bulunamadı → null", () => {
  assert.equal(findCategoryNodeById(null, 3), null);
  assert.equal(findCategoryNodeById(undefined, 3), null);
  assert.equal(findCategoryNodeById(AGAC, 999), null);
  for (const bad of [null, undefined, "", "abc", 0, -1]) assert.equal(findCategoryNodeById(AGAC, bad as never), null);
});

test("breadcrumbCategoryOf: ad + slug doluysa; biri boşsa null (orta basamak yazılmaz)", () => {
  assert.deepEqual(breadcrumbCategoryOf(findCategoryNodeById(AGAC, 13)), { name: "Güller", slug: "guller" });
  assert.equal(breadcrumbCategoryOf(findCategoryNodeById(AGAC, 14)), null);
  assert.equal(breadcrumbCategoryOf(null), null);
  assert.equal(breadcrumbCategoryOf({ name: "X" }), null);
});

// ---------------------------------------------------------------------------
// 3) BreadcrumbList JSON-LD
// ---------------------------------------------------------------------------

type Basamak = { "@type": string; position: number; name: string; item: string };

test("kategori varken: Ana Sayfa → kategori → ürün; mutlak adresler, sıralı position, '/urunler' YOK", () => {
  const ld = buildProductBreadcrumbJsonLd(
    { name: "101 Kırmızı Gül Buketi", path: "/urun/101-kirmizi-gul-buketi", category: { name: "Güller", slug: "guller" } },
    mutlak,
  );
  assert.equal(ld["@context"], "https://schema.org");
  assert.equal(ld["@type"], "BreadcrumbList");
  assert.deepEqual((ld.itemListElement as Basamak[]).map((x) => [x["@type"], x.position, x.name, x.item]), [
    ["ListItem", 1, "Ana Sayfa", `${SITE}/`],
    ["ListItem", 2, "Güller", `${SITE}/kategori/guller`],
    ["ListItem", 3, "101 Kırmızı Gül Buketi", `${SITE}/urun/101-kirmizi-gul-buketi`],
  ]);
  assert.ok(!JSON.stringify(ld).includes("/urunler"));
});

test("kategori yokken iki basamak: Ana Sayfa → ürün", () => {
  for (const category of [null, undefined]) {
    const ld = buildProductBreadcrumbJsonLd({ name: "Orkide", path: "/urun/orkide", category }, mutlak);
    assert.deepEqual((ld.itemListElement as Basamak[]).map((x) => [x.position, x.name, x.item]), [
      [1, "Ana Sayfa", `${SITE}/`],
      [2, "Orkide", `${SITE}/urun/orkide`],
    ]);
  }
});

test("serializeJsonLd ile gömülünce '<' kaçırılır (ürün/kategori adı script'i erken kapatamaz)", () => {
  const html = serializeJsonLd(
    buildProductBreadcrumbJsonLd({ name: "</script><b>x", path: "/urun/x", category: { name: "A<B", slug: "a" } }, mutlak),
  );
  assert.equal(html.includes("<"), false);
  assert.equal(JSON.parse(html).itemListElement[2].name, "</script><b>x");
});

// ---------------------------------------------------------------------------
// 3b) EK — yönlendirme sorgu dizesini taşır (tıklama ilişkilendirmesi kaybolmaz)
// ---------------------------------------------------------------------------

test("withRequestQuery: sorgu yoksa yol aynen; gclid / utm_* hedefe taşınır", () => {
  assert.equal(withRequestQuery("/urun/kirmizi-gul", undefined), "/urun/kirmizi-gul");
  assert.equal(withRequestQuery("/urun/kirmizi-gul", null), "/urun/kirmizi-gul");
  assert.equal(withRequestQuery("/urun/kirmizi-gul", {}), "/urun/kirmizi-gul");
  // İnceleme senaryosu: /urun/Kirmizi-Gul?gclid=abc → 308 /urun/kirmizi-gul?gclid=abc
  const hedef = productSlugRedirectPath("Kirmizi-Gul", "kirmizi-gul");
  assert.equal(withRequestQuery(hedef!, { gclid: "abc" }), "/urun/kirmizi-gul?gclid=abc");
  assert.equal(
    withRequestQuery("/urun/kirmizi-gul", { gclid: "abc", utm_source: "google", utm_campaign: "s 03 & marka" }),
    "/urun/kirmizi-gul?gclid=abc&utm_source=google&utm_campaign=s+03+%26+marka",
  );
});

test("withRequestQuery: yinelenen anahtar sırasıyla korunur; değersiz (undefined) anahtar yazılmaz; boş değer korunur", () => {
  assert.equal(withRequestQuery("/urun/x", { a: ["1", "2"], b: undefined, c: "" }), "/urun/x?a=1&a=2&c=");
  assert.equal(withRequestQuery("/urun/x", { a: [] }), "/urun/x");
  // Hedefe varıldığında yönlendirme yeniden tetiklenmez (sorgu slug karşılaştırmasına girmez) → döngü yok.
  assert.equal(productSlugRedirectPath("kirmizi-gul", "kirmizi-gul"), null);
});

// ---------------------------------------------------------------------------
// 4) Kaynak nöbeti — sayfada TAM BİR BreadcrumbList, canonical kayıtlı slug'tan
// ---------------------------------------------------------------------------

test("kaynak nöbeti: /urun sayfası canonical/og:url/JSON-LD'yi kayıtlı slug'tan üretir ve farklı slug'ı kalıcı yönlendirir", () => {
  const src = oku("../app/urun/[slug]/page.tsx");
  assert.ok(!src.includes("absoluteUrl(`/urun/${params.slug}`)"), "canonical/og:url istek slug'ından üretilmez");
  assert.ok(!/slug:\s*params\.slug/.test(src), "Product JSON-LD istek slug'ını almaz");
  assert.match(src, /const canonicalPath = `\/urun\/\$\{product\.slug \|\| params\.slug\}`;/);
  assert.match(src, /alternates: \{ canonical: absoluteUrl\(canonicalPath\) \}/);
  assert.match(src, /url: absoluteUrl\(canonicalPath\)/);
  assert.match(src, /productSlugRedirectPath\(params\.slug, data\.product\.slug\)/);
  // EK: yönlendirme isteğin sorgu dizesini (gclid, utm_*) taşır.
  assert.match(src, /if \(slugRedirect\) permanentRedirect\(withRequestQuery\(slugRedirect, searchParams\)\);/);
  assert.ok(src.includes("export default async function ProductPage({ params, searchParams }: PageProps) {"));
  assert.ok(!/generateStaticParams|export const revalidate|force-static/.test(src), "rota istek başına çizilir (searchParams render türünü değiştirmez)");
  assert.match(src, /serializeJsonLd\(breadcrumbJsonLd\)/, "BreadcrumbList sunucuda basılır");
  assert.match(src, /<ProductDetail data=\{data\} sizeProducts=\{sizeProducts\} breadcrumbCategory=\{breadcrumbCategory\} \/>/);
});

test("kaynak nöbeti: istemci izleyici /urun/ sayfasına BreadcrumbList enjekte ETMEZ (çift liste yok)", () => {
  const src = oku("../components/analytics/BreadcrumbSchemaTracker.tsx");
  assert.match(src, /^const CLIENT_BREADCRUMB_ENABLED: boolean = false;$/m);
  assert.match(src, /if \(!CLIENT_BREADCRUMB_ENABLED \|\| !pathname\.startsWith\("\/urun\/"\)\) return;/);
  // Koşul, enjeksiyon kodundan (createElement) ÖNCE durur.
  assert.ok(src.indexOf("!CLIENT_BREADCRUMB_ENABLED ||") < src.indexOf('document.createElement("script")'));
});

test("kaynak nöbeti: görünür kırıntının orta basamağı kategori varken GERÇEK bağlantı, yokken bugünkü etiket", () => {
  const src = oku("../components/product/ProductDetail.tsx");
  assert.match(src, /breadcrumbCategory\?: \{ name: string; slug: string \} \| null;/);
  // EK: prefetch kapalı — hedef istek başına çizilen kategori rotası; her PDP görüntülemesi ek bir RSC isteği üretmesin.
  assert.match(src, /<Link href=\{`\/kategori\/\$\{breadcrumbCategory\.slug\}`\} prefetch=\{false\} className="text-\[#6B7280\] hover:text-\[#7C3AED\] transition-colors">/);
  assert.ok(
    src.includes('<span className="text-[#6B7280]">{locale === "tr" ? (TYPE_LABEL[product.product_type] ?? t("pdp.breadcrumbProduct")) : t("pdp.breadcrumbProduct")}</span>'),
    "kategori verilmezse bugünkü düz etiket aynen",
  );
});
