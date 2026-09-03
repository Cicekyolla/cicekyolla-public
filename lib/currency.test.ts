// currency.test.ts — vitrin tarafı çevrim/biçim/varsayılan kuralları.
//
// EN ÖNEMLİ İŞ: buradaki sayısal beklentiler backend'deki
// `cicekyolla-api/backend/src/fxService.test.ts` ile BİREBİR AYNIDIR. İki taraf
// ayrışırsa müşteriye gösterilen tutar ile PayTR'ye giden tutar ayrışır; bu
// dosya o ayrışmayı yakalayan koruma bandıdır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { convertMinor, priceInCurrency, rateFor } from "./currency/price.ts";
import { formatMoney } from "./currency/format.ts";
import {
  BASE_CURRENCY,
  CURRENCIES,
  defaultCurrencyForLocale,
  isCurrency,
  parseCurrencyCookie,
  hasPreviewCookie,
  CURRENCY_ENABLED,
} from "./currency/config.ts";

// 03.09.2026 TCMB bülteni — backend testiyle AYNI kurlar.
const USD = 48.2238;
const EUR = 55.9713;

// ── Çevrim: backend ile birebir aynı sayılar ───────────────────────────────

test("₺1.999 → USD backend ile AYNI sonucu verir", () => {
  assert.equal(convertMinor(199900, USD), 4145); // fxService.test.ts ile aynı
});

test("₺1.999 → EUR backend ile AYNI sonucu verir", () => {
  assert.equal(convertMinor(199900, EUR), 3571); // fxService.test.ts ile aynı
});

test("TRY kimlik çevrimi (rate=1) kuruşu korur", () => {
  assert.equal(convertMinor(199900, 1), 199900);
});

test("geçersiz kur sessiz yanlış fiyat üretmez", () => {
  assert.throws(() => convertMinor(1000, 0));
  assert.throws(() => convertMinor(1000, -1));
  assert.throws(() => convertMinor(1000, Number.NaN));
});

test("ÇİFT ÇEVRİM YASAK — EUR daima TRY tabanından", () => {
  assert.equal(convertMinor(199900, EUR), 3571);
  // Çift çevrimin gerçekten saptığı, aynı gerçek kurlarla ölçülmüş örnekler.
  for (const [base, dogru] of [[1200, 21], [1600, 29], [2000, 36]] as const) {
    assert.equal(convertMinor(base, EUR), dogru);
    assert.notEqual(dogru, Math.round(convertMinor(base, USD) * (USD / EUR)));
  }
});

test("TRY → USD → EUR → TRY döngüsünde taban fiyat bozulmaz (§44)", () => {
  const base = 199900;
  // Her adım TABANDAN hesaplanır; hiçbir adım bir öncekinin çıktısını girdi almaz.
  assert.equal(convertMinor(base, USD), 4145);
  assert.equal(convertMinor(base, EUR), 3571);
  assert.equal(convertMinor(base, 1), base, "TRY'ye dönünce ilk fiyat aynen döner");
});

// ── Sipariş toplamı: DISPLAY == CART == CHECKOUT == PAYTR (§45) ────────────

test("satırların toplamı ara toplama BİREBİR eşit", () => {
  const lines = [
    { unit_price_minor: 199900, quantity: 2 },
    { unit_price_minor: 34900, quantity: 3 },
  ];
  const r = priceInCurrency(lines, 0, 0, USD);
  assert.equal(r.subtotal_minor, r.unit_minor[0] * 2 + r.unit_minor[1] * 3);
  assert.equal(r.total_minor, r.subtotal_minor);
});

test("sabit TRY kuponu USD olarak DEĞİL, TRY karşılığı düşülür", () => {
  const r = priceInCurrency([{ unit_price_minor: 199900, quantity: 1 }], 15000, 0, USD);
  assert.equal(r.discount_minor, 311); // 150 TRY → $3,11
  assert.notEqual(r.discount_minor, 15000);
});

test("kargo ücreti ürünle AYNI para biriminde eklenir (karışık para imkânsız)", () => {
  const r = priceInCurrency([{ unit_price_minor: 100000, quantity: 1 }], 0, 5000, EUR);
  assert.equal(r.total_minor, r.subtotal_minor + r.delivery_fee_minor);
  assert.equal(r.delivery_fee_minor, convertMinor(5000, EUR));
});

test("indirim toplamı aşarsa negatif tutar oluşmaz", () => {
  const r = priceInCurrency([{ unit_price_minor: 1000, quantity: 1 }], 999999, 0, USD);
  assert.equal(r.total_minor, 0);
});

test("adet çarpanı çevrimden SONRA uygulanır (kuruş kayması yok)", () => {
  const r = priceInCurrency([{ unit_price_minor: 199900, quantity: 7 }], 0, 0, USD);
  assert.equal(r.total_minor, 4145 * 7);
  // Toplamı çevirmek farklı sonuç verirdi; satırlar toplamla tutmazdı.
  assert.notEqual(r.total_minor, convertMinor(199900 * 7, USD));
});

// ── Kur çözümü / arıza güvenliği ──────────────────────────────────────────

test("TRY kur tablosu olmadan da çalışır (mağaza asla durmaz)", () => {
  assert.equal(rateFor(null, "TRY"), 1);
  assert.equal(rateFor({}, "TRY"), 1);
});

test("kur yoksa USD/EUR null döner (fiyat UYDURULMAZ)", () => {
  assert.equal(rateFor(null, "USD"), null);
  assert.equal(rateFor({}, "EUR"), null);
  assert.equal(rateFor({ USD: 0 }, "USD"), null);
  assert.equal(rateFor({ USD: -1 }, "USD"), null);
  assert.equal(rateFor({ USD: Number.NaN }, "USD"), null);
});

// ── Biçim (§33) ───────────────────────────────────────────────────────────

test("TRY biçimi CANLIDAKİYLE BİREBİR AYNI — kuruş gösterilmez (§41)", () => {
  // Bu satır TRY regresyon koruması: çıktı değişirse Türk müşteri fark eder.
  assert.equal(formatMoney(199900, "TRY", "tr-TR"), "₺1.999");
  assert.equal(formatMoney(124000, "TRY", "tr-TR"), "₺1.240");
  // Dil ne olursa olsun TRY yazımı sabittir.
  assert.equal(formatMoney(199900, "TRY", "en-GB"), "₺1.999");
  assert.equal(formatMoney(199900, "TRY", "ar-u-nu-latn"), "₺1.999");
});

test("USD/EUR cent GÖSTERİR — vitrin ile PayTR tutarı ayrışamaz (§12)", () => {
  assert.match(formatMoney(4145, "USD", "en-GB"), /41[.,]45/);
  assert.match(formatMoney(3571, "EUR", "de-DE"), /35[.,]71/);
});

test("13 global dilin hepsinde biçim üretilir ve boş dönmez", () => {
  const intls = ["en-GB", "de-DE", "fr-FR", "nl-NL", "it-IT", "es-ES", "pt-PT",
                 "az-Latn-AZ", "ru-RU", "ar-u-nu-latn", "zh-CN", "ja-JP", "ko-KR"];
  for (const intl of intls) {
    for (const c of ["TRY", "USD", "EUR"] as const) {
      const out = formatMoney(199900, c, intl);
      assert.ok(out.length > 0, `${intl}/${c} boş döndü`);
      assert.ok(/\d/.test(out), `${intl}/${c} sayı içermiyor: ${out}`);
    }
  }
});

test("RTL (Arapça) latin rakam üretir — fiyat ters okunmaz", () => {
  const out = formatMoney(4145, "USD", "ar-u-nu-latn");
  assert.match(out, /41/, `latin rakam bekleniyordu: ${out}`);
});

test("bozuk/boş girdi biçimlendiriciyi çökertmez", () => {
  assert.equal(formatMoney(null, "USD", "en-GB"), "");
  assert.equal(formatMoney(undefined, "USD", "en-GB"), "");
  assert.equal(formatMoney(Number.NaN, "USD", "en-GB"), "");
  assert.equal(formatMoney("abc", "USD", "en-GB"), "");
  // Geçersiz locale'de bile sembollü bir çıktı döner (asla boş değil).
  assert.ok(formatMoney(4145, "USD", "xx-INVALID-!!").length > 0);
});

// ── Dil ≠ Para birimi (§5) ────────────────────────────────────────────────

test("hiçbir dil bir para birimine KİLİTLİ DEĞİL — 3'ü de her dilde seçilebilir", () => {
  assert.deepEqual(CURRENCIES.map((c) => c.code), ["TRY", "USD", "EUR"]);
  assert.equal(BASE_CURRENCY, "TRY");
});

test("dile göre MANTIKLI varsayılan: avro bölgesi → EUR, diğerleri → USD, tr → TRY", () => {
  for (const l of ["de", "fr", "nl", "it", "es", "pt"]) {
    assert.equal(defaultCurrencyForLocale(l), "EUR", `${l} → EUR bekleniyordu`);
  }
  for (const l of ["en", "ru", "ar", "zh", "ja", "ko", "az"]) {
    assert.equal(defaultCurrencyForLocale(l), "USD", `${l} → USD bekleniyordu`);
  }
  assert.equal(defaultCurrencyForLocale("tr"), "TRY");
});

test("13 global dilin TAMAMI bir varsayılana sahip (boşta kalan dil yok)", () => {
  const globals = ["de", "en", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"];
  assert.equal(globals.length, 13);
  for (const l of globals) {
    assert.ok(isCurrency(defaultCurrencyForLocale(l)), `${l} varsayılanı geçersiz`);
  }
});

// ── Kalıcılık ve güvenlik (§14, §40) ──────────────────────────────────────

test("cookie yoksa null döner (kullanıcı seçmedi → dil varsayılanı uygulanır)", () => {
  assert.equal(parseCurrencyCookie(null), null);
  assert.equal(parseCurrencyCookie(""), null);
  assert.equal(parseCurrencyCookie("cy_lang=de"), null);
});

test("kullanıcı seçimi cookie'den okunur ve dil değişse bile korunur", () => {
  assert.equal(parseCurrencyCookie("cy_currency=USD"), "USD");
  assert.equal(parseCurrencyCookie("cy_lang=de; cy_currency=USD; other=1"), "USD",
    "Almanca dil + USD seçimi: dil EUR varsayılanı seçimi EZMEZ");
  assert.equal(parseCurrencyCookie("cy_currency=eur"), "EUR", "küçük harf kabul");
});

test("desteklenmeyen/manipüle cookie reddedilir (allowlist)", () => {
  for (const kotu of ["cy_currency=GBP", "cy_currency=RUB", "cy_currency=BTC", "cy_currency=XX", "cy_currency=TRY123"]) {
    assert.equal(parseCurrencyCookie(kotu), null, `reddedilmeli: ${kotu}`);
  }
});

test("yalnız TRY/USD/EUR geçerli para birimidir", () => {
  for (const ok of ["TRY", "USD", "EUR"]) assert.equal(isCurrency(ok), true);
  for (const kotu of ["GBP", "RUB", "try", "", null, undefined, 1, {}, []]) {
    assert.equal(isCurrency(kotu), false, `reddedilmeli: ${String(kotu)}`);
  }
});

// ── Yayın bayrağı + kanarya (deploy ≠ müşteriye açılma) ───────────────────

test("kanarya cookie'si TAM olarak =1 olmalı (sınır kuralı)", () => {
  assert.equal(hasPreviewCookie("cy_currency_preview=1"), true);
  assert.equal(hasPreviewCookie("cy_lang=en; cy_currency_preview=1; x=2"), true);
  // Sınır olmadan "=10" ve "=1x" sızardı — para birimi cookie'siyle aynı hata sınıfı.
  assert.equal(hasPreviewCookie("cy_currency_preview=10"), false);
  assert.equal(hasPreviewCookie("cy_currency_preview=1x"), false);
  assert.equal(hasPreviewCookie("cy_currency_preview=0"), false);
  assert.equal(hasPreviewCookie("xcy_currency_preview=1"), false);
  assert.equal(hasPreviewCookie(""), false);
  assert.equal(hasPreviewCookie(null), false);
});

test("bayrak varsayılanı KAPALI — kod canlıya çıksa da müşteri döviz görmez", () => {
  // NEXT_PUBLIC_CURRENCY_ENABLED ayarlanmadığında false olmalı.
  assert.equal(CURRENCY_ENABLED, process.env.NEXT_PUBLIC_CURRENCY_ENABLED === "true");
  assert.equal(CURRENCY_ENABLED, false, "test ortamında bayrak kapalı olmalı");
});
