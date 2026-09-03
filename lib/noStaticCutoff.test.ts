import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Statik saat vaadi bekçisi (3 Eyl 2026 kararı): kesin teslimat saati yalnız
 * Delivery Engine'den (HeroDeliveryBar / DeliveryPlanner) gelir. Aşağıdaki
 * pazarlama yüzeylerinde "14:00'a kadar" türü sabit saat cümlesi bir daha
 * ortaya çıkarsa bu test kırılır. Checkout saat DİLİMLERİ (09:00–12:00) kapsam
 * dışıdır; onlar vaat değil seçenektir.
 */
const oku = (p: string) => readFileSync(p, "utf8");
const SABIT_SAAT = /1[24]:00(?:'|&apos;|’)[ae]|Son sipariş \{r\.cutoff\}|\$\{cutoff\}/;

const YUZEYLER = [
  "components/home/UrgencyStrip.tsx",
  "components/home/HomeHero.tsx",
  "components/home/DistrictDelivery.tsx",
  "components/category/CargoCategoryExperience.tsx",
  "app/urun/[slug]/page.tsx",
  "app/[...slug]/page.tsx",
  "app/teslimat-bolgeleri/page.tsx",
];

test("pazarlama yüzeylerinde sabit 14:00/12:00 vaadi yok", () => {
  for (const f of YUZEYLER) assert.doesNotMatch(oku(f), SABIT_SAAT, f);
});

test("13 dilde co.trust.sameDayDesc saat içermez", () => {
  for (const l of ["tr", "en", "de", "es", "it", "nl", "pt", "ru", "ar", "az", "ja", "ko", "zh"]) {
    const m = oku(`lib/i18n/dict/${l}.ts`).match(/"co\.trust\.sameDayDesc": "([^"]*)"/);
    assert.ok(m, `${l}: anahtar yok`);
    assert.doesNotMatch(m![1], /\d{1,2}:\d{2}/, `${l}: ${m![1]}`);
  }
});

test("Gece şeridi ana sayfada (CMS'li ve fallback yolu) ve İstanbul içi lokasyon sayfasında bağlı", () => {
  const renderer = oku("components/home/HomepageRenderer.tsx");
  assert.equal((renderer.match(/<NightOrderStrip \/>/g) ?? []).length, 2, "HomepageRenderer: 2 bağlantı bekleniyor");
  const slug = oku("app/[...slug]/page.tsx");
  assert.match(slug, /\{cargoMode \? null : <NightOrderStrip \/>\}/);
});

test("UrgencyStrip fallback başlığı dört satış mesajından ikisini taşır", () => {
  assert.match(oku("components/home/UrgencyStrip.tsx"), /"Aynı Gün Teslimat · Hızlı ve Acil Çiçek Teslimatı"/);
});
