import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { engineSaysCargo, catalogDecision } from "./global/globalCatalog.ts";
import { buildProductJsonLd } from "./productSchema.ts";

/**
 * TESLİMAT GERÇEĞİ (24 Eyl 2026): canlı Delivery Motor İstanbul'da Maltepe şubeden 45 km'ye kadar
 * aynı gün kurye tanıyor; Silivri (103 km), Şile (67 km), Çatalca (83 km) vb. servis alanı DIŞINDA.
 * 13 dildeki İstanbul lokasyon sayfaları ise şehir kuralıyla ("istanbul = aynı gün") aynı gün
 * vaadi ve yalnız-kurye ürünleri basıyordu → checkout'ta "adrese gidemez" duvarı.
 * Bu test, katalog yanıtındaki motor kararının (location.same_day=false) sayfayı KARGO sunumuna
 * geçirdiğini ve motor sessizken bugünkü davranışın korunduğunu nöbet tutar.
 */

const base = { locale: "en", total: 1, selection: "none", featured_ids: [], categories: [], products: [] };
const loc = (o: Partial<{ found: boolean; same_day: boolean }>) => ({ city: "istanbul", district: "silivri", neighborhood: null, found: true, same_day: true, ...o });

test("engineSaysCargo: lokasyon çözüldü + same_day=false → kargo sunumu", () => {
  const d = catalogDecision({ ...base, location: loc({ same_day: false }) }, true);
  assert.equal(d.mode, "catalog");
  assert.equal(engineSaysCargo(d), true);
});

test("engineSaysCargo: same_day=true → İstanbul davranışı aynen (regresyon yok)", () => {
  assert.equal(engineSaysCargo(catalogDecision({ ...base, location: loc({}) }, true)), false);
});

test("engineSaysCargo: motor sessiz (fallback) / lokasyon yok / çözülemedi → false (bugünkü davranış)", () => {
  assert.equal(engineSaysCargo({ mode: "fallback" }), false);
  assert.equal(engineSaysCargo(undefined), false);
  assert.equal(engineSaysCargo(null), false);
  assert.equal(engineSaysCargo(catalogDecision({ ...base, location: null }, false)), false);
  // found=false → katalog boş ama sunum kararı şehir kuralına kalır (yeni vaat üretilmez)
  assert.equal(engineSaysCargo(catalogDecision({ ...base, location: loc({ found: false, same_day: false }) }, true)), false);
});

test("kaynak nöbeti: GlobalPageBody kargo kararı şehir kuralı VEYA motor; kargo bölümleri ilçe adını alır", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("(!isSameDayDestination(loc.city) || engineSaysCargo(source))"), "cargoCity kararı");
  assert.ok(src.includes("<CargoTrustStrip locale={locale} city={cargoCity} label={cargoLabel} />"));
  assert.ok(src.includes("<CargoCatalogSection locale={locale} city={cargoCity} label={cargoLabel}"));
  const sections = readFileSync(new URL("./global/sections.tsx", import.meta.url), "utf8");
  assert.ok(sections.includes("CARGO[locale].trust(label ?? cityDisplayName(locale, city))"));
});

test("locale PDP Product JSON-LD: URL locale yolundan, TR /urun yolu korunur", () => {
  const deps = { absolute: (p: string) => `https://www.cicekyolla.com.tr${p}`, plainText: (h: string | null | undefined) => (h ?? "").replace(/<[^>]+>/g, "") };
  const input = { name: "White roses", slug: "white-roses", productId: 7, priceMinor: 149900, stockQuantity: 3, images: [{ url: "/r2/a.jpg" }] };
  const tr = buildProductJsonLd(input, deps);
  assert.equal(tr.url, "https://www.cicekyolla.com.tr/urun/white-roses");
  const en = buildProductJsonLd({ ...input, path: "/en/product/white-roses" }, deps);
  assert.equal(en.url, "https://www.cicekyolla.com.tr/en/product/white-roses");
  assert.equal((en.offers as { url: string }).url, "https://www.cicekyolla.com.tr/en/product/white-roses");
  assert.equal((en.offers as { priceCurrency: string }).priceCurrency, "TRY", "fiyat/tahsilat DAİMA TRY");
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("path: localeProductPath(locale, surface.slug)"), "locale PDP yolu");
  assert.ok(src.includes(`<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />`));
});
