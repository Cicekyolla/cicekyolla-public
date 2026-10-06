// Tek fiyat kuralı — API sipariş birim fiyatıyla (VARIANT_UNIT_PRICE_SQL) aynı karar + bağlantılar.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveUnitPrice, type PriceSource } from "./productPrice.ts";
import { formatMoney } from "./currency/format.ts";

/** API ifadesinin (backend/src/pricing/unitPriceSql.ts VARIANT_UNIT_PRICE_SQL) satır satır karşılığı — bağımsız referans. */
function apiUnitPrice(p: { price: number; sale: number | null }, v: { price: number | null; sale: number | null } | null): number {
  if (v && v.sale !== null && v.sale > 0 && v.sale < (v.price ?? p.price)) return v.sale;
  if (v && v.price !== null) return v.price;
  if (p.sale !== null && p.sale > 0 && p.sale < p.price) return p.sale;
  return p.price;
}

test("ürün (varyantsız): indirim yalnız 0 < indirim < taban iken geçerli", () => {
  assert.deepEqual(resolveUnitPrice({ price_minor: 100000, sale_price_minor: null }), { unitMinor: 100000, baseMinor: 100000, hasSale: false });
  assert.deepEqual(resolveUnitPrice({ price_minor: "100000", sale_price_minor: "80000" }), { unitMinor: 80000, baseMinor: 100000, hasSale: true });
  // İndirim tabana EŞİT ya da tabandan YÜKSEK → geçersiz: taban fiyat (eski JSON-LD kuralı burada indirimi basıyordu).
  assert.deepEqual(resolveUnitPrice({ price_minor: 100000, sale_price_minor: 100000 }), { unitMinor: 100000, baseMinor: 100000, hasSale: false });
  assert.deepEqual(resolveUnitPrice({ price_minor: 100000, sale_price_minor: 120000 }), { unitMinor: 100000, baseMinor: 100000, hasSale: false });
  // 0 / negatif / boş / sayı olmayan indirim → geçersiz.
  for (const sale of [0, -5, "", "abc", undefined]) {
    assert.equal(resolveUnitPrice({ price_minor: 100000, sale_price_minor: sale as PriceSource["sale_price_minor"] }).unitMinor, 100000, String(sale));
  }
  // Kuruşlu fiyat aynen taşınır (yuvarlama yok).
  assert.equal(resolveUnitPrice({ price_minor: 124950, sale_price_minor: 112455 }).unitMinor, 112455);
});

test("varyantlı ürün: varyant indirimi → varyant fiyatı → ürün indirimi → ürün fiyatı", () => {
  const product = { price_minor: 90000, sale_price_minor: 80000 };
  // 1) varyantın geçerli indirimi
  assert.deepEqual(resolveUnitPrice(product, { price_minor: 150000, sale_price_minor: 120000 }), { unitMinor: 120000, baseMinor: 150000, hasSale: true });
  // 2) varyantın kendi fiyatı var, indirimi yok → varyant fiyatı (ürünün indirimi UYGULANMAZ: sipariş böyle faturalar)
  assert.deepEqual(resolveUnitPrice(product, { price_minor: 150000, sale_price_minor: null }), { unitMinor: 150000, baseMinor: 150000, hasSale: false });
  assert.deepEqual(resolveUnitPrice(product, { price_minor: 70000, sale_price_minor: null }), { unitMinor: 70000, baseMinor: 70000, hasSale: false });
  // varyant indirimi varyant fiyatından yüksek → geçersiz → varyant fiyatı
  assert.deepEqual(resolveUnitPrice(product, { price_minor: 150000, sale_price_minor: 160000 }), { unitMinor: 150000, baseMinor: 150000, hasSale: false });
  // 3) varyantın fiyatı yok → ürün kuralı (varyant indirimi ürün tabanına göre geçerliyse o)
  assert.deepEqual(resolveUnitPrice(product, { price_minor: null, sale_price_minor: null }), { unitMinor: 80000, baseMinor: 90000, hasSale: true });
  assert.deepEqual(resolveUnitPrice(product, { price_minor: null, sale_price_minor: 60000 }), { unitMinor: 60000, baseMinor: 90000, hasSale: true });
  // varyant verilmedi → ürün kuralı
  assert.deepEqual(resolveUnitPrice(product, null), { unitMinor: 80000, baseMinor: 90000, hasSale: true });
});

test("API sipariş kuralıyla BİREBİR aynı karar (ürün × varyant değer ızgarası)", () => {
  const prices = [50000, 100000, 124950];
  const sales: Array<number | null> = [null, 0, 40000, 100000, 130000];
  const vPrices: Array<number | null> = [null, 60000, 110000];
  let n = 0;
  for (const price of prices) for (const sale of sales) {
    assert.equal(resolveUnitPrice({ price_minor: price, sale_price_minor: sale }).unitMinor, apiUnitPrice({ price, sale }, null));
    for (const vp of vPrices) for (const vs of sales) {
      const got = resolveUnitPrice({ price_minor: price, sale_price_minor: sale }, { price_minor: vp, sale_price_minor: vs }).unitMinor;
      assert.equal(got, apiUnitPrice({ price, sale }, { price: vp, sale: vs }), JSON.stringify({ price, sale, vp, vs }));
      n++;
    }
  }
  assert.equal(n, prices.length * sales.length * vPrices.length * sales.length);
});

test("API kaynağı yanındaysa: referans ifade API'deki VARIANT_UNIT_PRICE_SQL ile aynı dallara sahip", () => {
  // Yerel geliştirme düzeninde API deposu kardeş klasördedir; CI'da yoksa bu denetim atlanmaz, yalnız çalışmaz.
  const candidates = ["../../wt-api-seo/backend/src/pricing/unitPriceSql.ts", "../../cicekyolla-api/backend/src/pricing/unitPriceSql.ts"];
  const file = candidates.map((c) => join(import.meta.dirname, c)).find((p) => existsSync(p));
  if (!file) return;
  const sql = readFileSync(file, "utf8").replace(/\s+/g, " ");
  assert.ok(sql.includes("WHEN v.sale_price_minor IS NOT NULL AND v.sale_price_minor > 0 AND v.sale_price_minor < COALESCE(v.price_minor, p.price_minor) THEN v.sale_price_minor"));
  assert.ok(sql.includes("WHEN v.price_minor IS NOT NULL THEN v.price_minor"));
  assert.ok(sql.includes("WHEN p.sale_price_minor IS NOT NULL AND p.sale_price_minor > 0 AND p.sale_price_minor < p.price_minor THEN p.sale_price_minor"));
  assert.ok(sql.includes("ELSE p.price_minor END)"));
});

test("bağlantı: ürün sayfası, JSON-LD (TR + dil) ve vitrin kartları aynı çözümleyiciyi kullanır", () => {
  const root = join(import.meta.dirname, "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const detail = read("components/product/ProductDetail.tsx");
  assert.match(detail, /const resolved = resolveUnitPrice\(product, sel\);/);
  assert.match(detail, /const shown = resolved\.unitMinor;/);
  assert.equal(/sel\?\.sale_price_minor \?\? product\.sale_price_minor/.test(detail), false, "eski ayrı kural geri gelmemeli");
  // JSON-LD: sayfanın İLK gösterdiği fiyat (varsayılan seçili varyant = ilk varyant).
  assert.match(read("app/urun/[slug]/page.tsx"), /const price = resolveUnitPrice\(data\.product, data\.variants\?\.\[0\]\)\.unitMinor;/);
  assert.match(read("lib/global/page.tsx"), /const price = resolveUnitPrice\(product, data\.variants\?\.\[0\]\)\.unitMinor;/);
  for (const f of ["app/urun/[slug]/page.tsx", "lib/global/page.tsx"]) {
    assert.equal(/sale_price_minor && Number\([a-z.]*sale_price_minor\) > 0\s*\?/.test(read(f)), false, `${f}: "indirim > 0 ise indirim" kuralı kalmamalı`);
  }
  assert.match(read("components/home/ProductShowcase.tsx"), /const \{ unitMinor, baseMinor, hasSale \} = resolveUnitPrice\(p\);/);
  assert.match(read("components/home/HomepageRenderer.tsx"), /const minor = resolveUnitPrice\(p\)\.unitMinor;/);
});


// ═══ MADDE 3 — KURUŞLU FİYAT: tahsil edilen kuruş vitrine AYNEN taşınır ═══════
// Kaynak: API kuruşu değiştirmez (VARIANT_UNIT_PRICE_SQL), resolveUnitPrice de
// değiştirmez; gösterim lib/currency/format.ts kuralıdır (kuruş var → 2 basamak).
// Bu bölüm yuvarlanmış LİRA (`price`) üzerinden fiyat BASAN yolları da yakalar:
// kart/PDP/editör kartı kuruş kaynağını (`priceMinor`) taşımak zorundadır.

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("MADDE 3: kuruşlu birim fiyat çözümde korunur ve gösterimde gizlenmez", () => {
  const r = resolveUnitPrice({ price_minor: "199902", sale_price_minor: null });
  assert.equal(r.unitMinor, 199902);
  assert.equal(formatMoney(r.unitMinor, "TRY", "tr-TR"), "₺1.999,02");
  const sale = resolveUnitPrice({ price_minor: 250000, sale_price_minor: "224998" });
  assert.deepEqual([sale.unitMinor, sale.baseMinor, sale.hasSale], [224998, 250000, true]);
  assert.equal(formatMoney(sale.unitMinor, "TRY", "tr-TR"), "₺2.249,98");
  assert.equal(formatMoney(sale.baseMinor, "TRY", "tr-TR"), "₺2.500");
  // JSON-LD / feed ile aynı sayı: (minor/100).toFixed(2)
  assert.equal((r.unitMinor / 100).toFixed(2), "1999.02");
});

test("MADDE 3: yuvarlanmış lira × 100 kuruşu KAYBEDER — kart kuruş kaynağını (priceMinor) taşır", () => {
  const minor = 199902;
  const roundedLira = Math.round(minor / 100); // CardProduct.price
  assert.notEqual(roundedLira * 100, minor, "price*100 kuruşu geri getiremez");
  assert.equal(formatMoney(roundedLira * 100, "TRY", "tr-TR"), "₺1.999");
  assert.equal(formatMoney(minor, "TRY", "tr-TR"), "₺1.999,02");
  // lib/api.ts toCardProduct: priceMinor kuruşu aynen taşır.
  const api = src("lib/api.ts");
  assert.ok(api.includes("priceMinor: Math.round(hasSale ? Number(p.sale_price_minor) : Number(p.price_minor)),"));
  // ProductCard yuvarlanmış liraya yalnız kuruş kaynağı YOKSA düşer.
  assert.ok(src("components/home/ProductCard.tsx").includes("money(product.priceMinor ?? product.price * 100)"));
});

test("MADDE 3: PDP boyut önerileri, Editör Seçimi ve 13 dil kartları kuruş kaynağı taşır", () => {
  const pdp = src("components/product/ProductDetail.tsx");
  assert.equal(pdp.split("money(item.priceMinor ?? item.price * 100)").length - 1, 2, "aria-label + görünen fiyat");
  assert.ok(!pdp.includes("money(item.price * 100)"), "yuvarlanmış liradan fiyat basılmaz");
  assert.ok(src("components/home/EditorsPicks.tsx").includes("<Price minor={card.priceMinor ?? card.price*100} />"));
  assert.ok(src("app/page.tsx").includes("priceMinor: Math.round(hasSale ? Number(p.sale_price_minor) : Number(p.price_minor)),"));
  const g = src("lib/global/page.tsx");
  assert.ok(g.includes("priceMinor: Math.round(hasSale ? Number(pr.sale_price_minor) : Number(pr.price_minor)),"), "detailToCard");
  assert.ok(g.includes("priceMinor: Math.round(hasSale ? (sale as number) : price),"), "rowToCard");
  assert.ok(g.includes("priceMinor: Math.round(hasSale ? Number(r.sale_price_minor) : Number(r.price_minor)),"), "locale sizeProducts");
});

test("MADDE 3: TRY biçimlendirici TEK — yerel Intl/toLocaleString kopyaları merkezi kurala devredildi", () => {
  // PayTR tutar etiketi ham toLocaleString ("₺1.691,5") değil, moneyTRY.
  const co = src("components/checkout/CheckoutWizard.tsx");
  assert.ok(co.includes("amountLabel={moneyTRY(paytrAmountMinor ?? total)}"));
  assert.ok(!co.includes('/ 100).toLocaleString("tr-TR")'));
  // Hesabım ve abonelik TRY'de formatMoney'e devreder.
  assert.ok(src("lib/memberAccountView.ts").includes('return formatMoney(minor ?? 0, "TRY", "tr-TR");'));
  assert.ok(src("components/subscription/theme.ts").includes("? formatMoney(minor, 'TRY', 'tr-TR')"));
  // Uzak bölge eşiği metinleri (PDP planlayıcı + lokasyon sayfası).
  assert.ok(src("components/product/DeliveryPlanner.tsx").includes("amount: moneyTRY(sd.min_product_price_minor)"));
  assert.ok(src("app/[...slug]/page.tsx").includes("? formatMinorTRY(locationData.meta.min_product_price_minor)"));
  // Kuruşu SİLEN TRY biçimi (maximumFractionDigits: 0) vitrin/bileşen kodunda kalmadı.
  for (const p of ["components/product/DeliveryPlanner.tsx", "app/[...slug]/page.tsx", "components/checkout/CheckoutWizard.tsx"]) {
    assert.ok(!src(p).includes("maximumFractionDigits: 0"), `${p}: yerel kuruş-silen biçim kalmamalı`);
  }
});

test("MADDE 3: makine okuyan fiyatlar DOKUNULMADI — JSON-LD offers.price ve merchant feed 2 basamaklı kuruş basar", () => {
  assert.ok(src("lib/productSchema.ts").includes("price: (priceMinor / 100).toFixed(2),"));
  const feed = src("app/api/merchant-feed.xml/route.ts");
  assert.ok(feed.includes("<g:price>${(regularMinor / 100).toFixed(2)} ${esc(currency)}</g:price>"));
  assert.ok(feed.includes("<g:sale_price>${(saleMinor / 100).toFixed(2)} ${esc(currency)}</g:sale_price>"));
  // Sepet motoru ve ödeme istemcisi fiyat BİÇİMLEMEZ; kuruş hesaba aynen girer (dokunulmadı).
  assert.ok(src("lib/cart.tsx").includes("subtotalMinor: items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0),"));
  assert.ok(!src("lib/payment.ts").includes("formatMoney"));
});
