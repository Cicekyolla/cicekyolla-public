// productSchema.test.ts — Product/Offer/AggregateRating JSON-LD kuralları.
//
// EN ÖNEMLİ BÖLÜM: "PUAN UYDURMA YASAĞI". Yorumu olmayan ürüne yıldız
// üretilmediği ve sabit 5.0 yazılmadığı burada kilitlenir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRAND_NAME, buildAggregateRating, buildProductJsonLd, serializeJsonLd } from "./productSchema.ts";
import { toPlainText } from "./richText.ts";
import { absoluteUrl } from "./site-config.ts";

// Sayfanin kullandigi GERCEK fonksiyonlar enjekte edilir -> test ile production
// ayni kodu calistirir (stub yok).
const DEPS = { absolute: absoluteUrl, plainText: toPlainText };

const SITE = "https://www.cicekyolla.com.tr";

/** Canlıdaki gerçek bir ürünün alanları (mor-orkide-kaktus-aranjmani, 05.09.2026). */
const GERCEK = {
  name: "Mor Orkide & Kaktüs Aranjmanı",
  slug: "mor-orkide-kaktus-aranjmani",
  productId: 1243,
  priceMinor: 299900,
  currency: "TRY",
  stockQuantity: 12,
  images: [
    { url: "/r2/1784458921010-mor-orkide-kakt-s-aranjman.webp", role: "cover" },
    { url: "/r2/ikinci-gorsel.webp", role: "gallery" },
  ],
  shortDescription: "<p>Doğanın en özel dokularını modern tasarım anlayışıyla buluşturan aranjman.</p>",
  longDescription: null,
  sku: "SKU-2CRT649D",
};

// ═══ PUAN KURALI — SAHTE YILDIZ YASAĞI ════════════════════════════════════

test("YORUMU OLMAYAN ürüne aggregateRating ÜRETİLMEZ", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingAvg: 0, ratingCount: 0 }, DEPS);
  assert.equal(ld.aggregateRating, undefined);
  assert.ok(!("aggregateRating" in ld), "anahtar hiç bulunmamalı");
});

test("rating alanları YOK/null gelirse de yıldız uydurulmaz", () => {
  for (const [avg, cnt] of [[null, null], [undefined, undefined], ["", ""], [0, 0]] as const) {
    const ld = buildProductJsonLd({ ...GERCEK, ratingAvg: avg, ratingCount: cnt }, DEPS);
    assert.ok(!("aggregateRating" in ld), `avg=${String(avg)} cnt=${String(cnt)}`);
  }
});

test("GERÇEK 5.0 ortalama → 5.0 yazılır (kırpılmaz, yuvarlanmaz)", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingAvg: 5, ratingCount: 7 }, DEPS);
  const ar = ld.aggregateRating as Record<string, unknown>;
  assert.equal(ar.ratingValue, "5.0");
  assert.equal(ar.reviewCount, 7);
});

test("GERÇEK 4.8 ortalama → 4.8 yazılır (5'e YUVARLANMAZ)", () => {
  const ar = buildAggregateRating(4.8, 12)!;
  assert.equal(ar.ratingValue, "4.8");
  assert.equal(ar.reviewCount, 12);
  assert.notEqual(ar.ratingValue, "5.0");
});

test("ondalıklı gerçek ortalamalar bire bir aktarılır", () => {
  assert.equal(buildAggregateRating(4.33, 3)!.ratingValue, "4.3");
  assert.equal(buildAggregateRating(3.5, 2)!.ratingValue, "3.5");
  assert.equal(buildAggregateRating(1, 1)!.ratingValue, "1.0");
});

test("tutarsız veri (count>0 ama avg=0) yıldız üretmez — yanlış puan göstermektense hiç gösterme", () => {
  assert.equal(buildAggregateRating(0, 5), null);
  assert.equal(buildAggregateRating(0.4, 5), null, "1'in altı geçersiz");
  assert.equal(buildAggregateRating(5.4, 5), null, "5'in üstü geçersiz");
  assert.equal(buildAggregateRating("abc", 5), null);
});

test("count 0'dan büyük olmalı — kesirli/negatif sayım reddedilir", () => {
  assert.equal(buildAggregateRating(5, 0), null);
  assert.equal(buildAggregateRating(5, -3), null);
  assert.equal(buildAggregateRating(5, 0.4), null, "0.4 → trunc 0");
  assert.equal(buildAggregateRating(5, "2")!.reviewCount, 2, "string sayım kabul");
});

test("bestRating/worstRating 5/1 — ratingValue ölçeği belirsiz kalmaz", () => {
  const ar = buildAggregateRating(4.8, 12)!;
  assert.equal(ar.bestRating, "5");
  assert.equal(ar.worstRating, "1");
});

// ═══ GÖRSEL — Google MUTLAK URL ister ═════════════════════════════════════

test("göreli görsel URL'leri MUTLAK hale gelir (canlıdaki kusur)", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS);
  const img = ld.image as string[];
  assert.equal(img[0], `${SITE}/r2/1784458921010-mor-orkide-kakt-s-aranjman.webp`);
  for (const u of img) assert.ok(u.startsWith("https://"), `mutlak olmalı: ${u}`);
});

test("kapak görseli İLK sırada, galeri arkasında", () => {
  const ld = buildProductJsonLd({
    ...GERCEK,
    images: [
      { url: "/a-galeri.webp", role: "gallery" },
      { url: "/b-kapak.webp", role: "cover" },
      { url: "/c-galeri.webp", role: "gallery" },
    ],
    ratingCount: 0,
  }, DEPS);
  assert.deepEqual(ld.image, [`${SITE}/b-kapak.webp`, `${SITE}/a-galeri.webp`, `${SITE}/c-galeri.webp`]);
});

test("aynı görsel iki kez yazılmaz; boş/bozuk kayıt atlanır", () => {
  const ld = buildProductJsonLd({
    ...GERCEK,
    images: [{ url: "/x.webp", role: "cover" }, { url: "/x.webp" }, { url: "  " }, { url: "" }],
    ratingCount: 0,
  }, DEPS);
  assert.deepEqual(ld.image, [`${SITE}/x.webp`]);
});

test("hiç görsel yoksa image anahtarı BOŞ DİZİ olarak yazılmaz, hiç yazılmaz", () => {
  const ld = buildProductJsonLd({ ...GERCEK, images: [], ratingCount: 0 }, DEPS);
  assert.ok(!("image" in ld));
});

// ═══ AÇIKLAMA — düz metin ═════════════════════════════════════════════════

test("HTML açıklama DÜZ METNE indirgenir (canlıda ham <p> gidiyordu)", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS);
  const d = String(ld.description);
  assert.ok(!d.includes("<"), `HTML kalmamalı: ${d}`);
  assert.ok(d.startsWith("Doğanın en özel"), d);
});

test("blok sonlarında kelimeler birbirine yapışmaz", () => {
  assert.equal(toPlainText("<p>Bir</p><p>İki</p>"), "Bir İki");
  assert.equal(toPlainText("<li>A</li><li>B</li>"), "A B");
});

test("HTML varlıkları çözülür", () => {
  assert.equal(toPlainText("Orkide &amp; Kaktüs"), "Orkide & Kaktüs");
  assert.equal(toPlainText("&quot;taze&quot;&nbsp;çiçek"), '"taze" çiçek');
});

test("açıklama yoksa ürün adına düşer — metin UYDURULMAZ", () => {
  const ld = buildProductJsonLd({ ...GERCEK, shortDescription: null, longDescription: null, ratingCount: 0 }, DEPS);
  assert.equal(ld.description, GERCEK.name);
});

test("uzun açıklama kelime ortasından kesilmez", () => {
  const uzun = "kelime ".repeat(2000);
  const out = toPlainText(uzun, 100);
  assert.ok(out.length <= 100);
  assert.ok(!out.endsWith("kel"), "kelime ortasından kesilmemeli");
});

// ═══ OFFER ════════════════════════════════════════════════════════════════

test("fiyat sayfadaki değerle aynı; biçim GA4 tracker için korunur", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS);
  const o = ld.offers as Record<string, unknown>;
  assert.equal(o.price, "2999.00", "string, iki ondalık — EcommerceViewItemTracker bunu okuyor");
  assert.equal(o.priceCurrency, "TRY");
});

test("stok > 0 → InStock", () => {
  const o = buildProductJsonLd({ ...GERCEK, stockQuantity: 3, ratingCount: 0 }, DEPS).offers as Record<string, unknown>;
  assert.equal(o.availability, "https://schema.org/InStock");
});

test("stok 0 → OutOfStock (uydurma InStock yok)", () => {
  const o = buildProductJsonLd({ ...GERCEK, stockQuantity: 0, ratingCount: 0 }, DEPS).offers as Record<string, unknown>;
  assert.equal(o.availability, "https://schema.org/OutOfStock");
});

test("offer.url ve product.url = gerçek canonical ürün URL'si", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS);
  const o = ld.offers as Record<string, unknown>;
  assert.equal(ld.url, `${SITE}/urun/mor-orkide-kaktus-aranjmani`);
  assert.equal(o.url, ld.url, "iki URL de canonical ile aynı olmalı");
});

test("itemCondition NewCondition", () => {
  const o = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS).offers as Record<string, unknown>;
  assert.equal(o.itemCondition, "https://schema.org/NewCondition");
});

test("TAAHHÜT alanları YAZILMAZ — sitede karşılığı olmayan vaat verilmez", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS);
  const o = ld.offers as Record<string, unknown>;
  for (const k of ["priceValidUntil", "shippingDetails", "hasMerchantReturnPolicy"]) {
    assert.ok(!(k in o), `${k} olmamalı (yanlış beyan riski)`);
  }
});

// ═══ ÜRÜN KİMLİĞİ ═════════════════════════════════════════════════════════

test("sku gerçek değerden gelir; yoksa alan hiç yazılmaz (uydurma SKU yok)", () => {
  assert.equal(buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS).sku, "SKU-2CRT649D");
  assert.ok(!("sku" in buildProductJsonLd({ ...GERCEK, sku: null, ratingCount: 0 }, DEPS)));
  assert.ok(!("sku" in buildProductJsonLd({ ...GERCEK, sku: "", ratingCount: 0 }, DEPS)));
});

test("brand mağazanın kendisi (products'ta brand kolonu yok)", () => {
  const b = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS).brand as Record<string, unknown>;
  assert.equal(b["@type"], "Brand");
  assert.equal(b.name, BRAND_NAME);
  assert.equal(BRAND_NAME, "ÇiçekYolla");
});

test("productID gerçek products.id — GA4 item_id ile aynı kimlik", () => {
  assert.equal(buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS).productID, "1243");
});

// ═══ GÜVENLİ GÖMME ════════════════════════════════════════════════════════

test("HTML açıklama zaten düz metne indiği için etiket schema'ya hiç girmez", () => {
  const ld = buildProductJsonLd({
    ...GERCEK,
    shortDescription: "Taze çiçek</script><script>alert(1)</script>",
    ratingCount: 0,
  }, DEPS);
  const d = String(ld.description);
  assert.ok(!d.includes("<"), `birinci savunma: etiket kalmamalı — ${d}`);
});

test("düz metne ÇEVRİLMEYEN alanda (ürün adı) `<` KAÇIRILIR — script erken kapanmaz", () => {
  // İkinci savunma hattı: description sanitize edilse de name/sku doğrudan geçer.
  // Operatör ürün adına yanlışlıkla `</script>` yazarsa sayfa BOZULMAMALI.
  const out = serializeJsonLd(
    buildProductJsonLd({ ...GERCEK, name: "Gül</script><script>alert(1)</script>", ratingCount: 0 }, DEPS),
  );
  assert.ok(!out.includes("</script"), "ham </script kalmamalı");
  assert.ok(out.includes("\\u003c"), "< kaçırılmış olmalı");
  // Kaçırma sonrası hâlâ geçerli JSON olmalı (Google ayrıştırabilmeli).
  assert.doesNotThrow(() => JSON.parse(out));
  const parsed = JSON.parse(out);
  assert.equal(parsed["@type"], "Product");
  assert.ok(String(parsed.name).includes("</script>"), "değer korunur, yalnız gömme kaçırılır");
});

test("serialize çıktısı geçerli JSON ve Product tipinde", () => {
  const out = serializeJsonLd(buildProductJsonLd({ ...GERCEK, ratingAvg: 4.8, ratingCount: 9 }, DEPS));
  const parsed = JSON.parse(out);
  assert.equal(parsed["@context"], "https://schema.org");
  assert.equal(parsed["@type"], "Product");
  assert.equal(parsed.aggregateRating.ratingValue, "4.8");
});

// ═══ GOOGLE ZORUNLU/ÖNERİLEN ALAN KAPSAMI ═════════════════════════════════

test("Google Product için gereken alanlar tam (yorumsuz ürün senaryosu)", () => {
  const ld = buildProductJsonLd({ ...GERCEK, ratingCount: 0 }, DEPS);
  for (const k of ["@context", "@type", "name", "description", "image", "sku", "productID", "url", "brand", "offers"]) {
    assert.ok(k in ld, `${k} eksik`);
  }
  const o = ld.offers as Record<string, unknown>;
  for (const k of ["@type", "price", "priceCurrency", "availability", "url", "itemCondition"]) {
    assert.ok(k in o, `offers.${k} eksik`);
  }
});
