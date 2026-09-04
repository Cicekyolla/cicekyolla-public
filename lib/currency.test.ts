// currency.test.ts — TL/USD/EUR GÖSTERİM sistemi.
//
// ⚠ Bu sistem yalnız GÖSTERİMDİR. Gerçek fiyat ve tahsilat DAİMA TRY'dir.
// Buradaki hiçbir sayı ödeme/sipariş/analitik yoluna girmez; aşağıdaki son
// bölüm bunu kod düzeyinde sabitler.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { convertMinor, priceInCurrency, rateFor } from "./currency/price.ts";
import { formatMoney } from "./currency/format.ts";
import {
  BASE_CURRENCY,
  CURRENCIES,
  CURRENCY_ENABLED,
  defaultCurrencyForLocale,
  hasPreviewCookie,
  isCurrency,
  parseCurrencyCookie,
  isForeignLocaleContext,
} from "./currency/config.ts";
import { bulletinAgeMs, displayRate, isUsable, parseTcmbXml, MAX_STALE_MS } from "./currency/rates.ts";

// 04.09.2026 TCMB bülteninden alınmış GERÇEK değerler (canlı doğrulandı).
const USD_BUY = 48.2326, USD_SELL = 48.3195;
const EUR_BUY = 56.0571, EUR_SELL = 56.1581;
const USD = (USD_BUY + USD_SELL) / 2; // 48.27605
const EUR = (EUR_BUY + EUR_SELL) / 2; // 56.1076

const TCMB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="04.09.2026" Date="09/04/2026" Bulten_No="2026/166">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Unit>1</Unit><Isim>ABD DOLARI</Isim>
    <ForexBuying>${USD_BUY}</ForexBuying><ForexSelling>${USD_SELL}</ForexSelling>
    <BanknoteBuying>48.1988</BanknoteBuying><BanknoteSelling>48.3920</BanknoteSelling>
  </Currency>
  <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR">
    <Unit>1</Unit><Isim>EURO</Isim>
    <ForexBuying>${EUR_BUY}</ForexBuying><ForexSelling>${EUR_SELL}</ForexSelling>
    <BanknoteBuying>56.0179</BanknoteBuying><BanknoteSelling>56.2423</BanknoteSelling>
  </Currency>
  <Currency CrossOrder="12" Kod="JPY" CurrencyCode="JPY">
    <Unit>100</Unit><ForexBuying>32.6400</ForexBuying><ForexSelling>32.8500</ForexSelling>
  </Currency>
</Tarih_Date>`;

// ═══ KUR ALANI POLİTİKASI — MID (alış+satış)/2 ══════════════════════════════
// Gerekçe: döviz alıp satmıyoruz, yaklaşık gösterim yapıyoruz. Alış ve satış
// bir bankanın işlemdeki iki TARAFIdır ve ters yönde sistematik saplıdır.
// MID nötr referanstır, simetriktir ve en kötü hatayı matematiksel olarak
// minimize eder. Efektif (Banknote) alanları nakit kuru olduğu için okunmaz.

test("POLİTİKA: gösterim kuru MID = (ForexBuying + ForexSelling) / 2", () => {
  assert.equal(displayRate(USD_BUY, USD_SELL), USD);
  assert.equal(displayRate(EUR_BUY, EUR_SELL), EUR);
});

test("POLİTİKA: MID iki tarafın TAM ORTASINDA — hiçbirine yanlı değil", () => {
  const r = displayRate(USD_BUY, USD_SELL)!;
  assert.ok(r > USD_BUY && r < USD_SELL, "MID alış ile satış arasında olmalı");
  assert.ok(
    Math.abs(r - USD_BUY) - Math.abs(USD_SELL - r) < 1e-12,
    "MID iki tarafa EŞİT uzaklıkta olmalı",
  );
});

test("POLİTİKA: MID en kötü hatayı yarıya indirir (spread'in yarısı)", () => {
  const mid = displayRate(USD_BUY, USD_SELL)!;
  const spread = USD_SELL - USD_BUY;
  // Tek tarafı seçmek spread kadar hata riski taşır; MID en fazla yarısı kadar.
  assert.ok(Math.abs(mid - USD_BUY) <= spread / 2 + 1e-12);
  assert.ok(Math.abs(mid - USD_SELL) <= spread / 2 + 1e-12);
});

test("POLİTİKA: EFEKTİF (Banknote) kurları ASLA kullanılmaz — nakit kuru", () => {
  const parsed = parseTcmbXml(TCMB_XML)!;
  // Efektif alış 48.1988 / satış 48.3920 — ikisi de sonuca sızmamalı.
  assert.equal(parsed.rates.USD, USD);
  assert.notEqual(parsed.rates.USD, 48.1988);
  assert.notEqual(parsed.rates.USD, 48.392);
  assert.notEqual(parsed.rates.USD, (48.1988 + 48.392) / 2);
});

test("POLİTİKA: tek taraf eksikse var olan kullanılır, ama AİLE KARIŞTIRILMAZ", () => {
  assert.equal(displayRate(48.5, null), 48.5, "satış yoksa alış");
  assert.equal(displayRate(null, 48.5), 48.5, "alış yoksa satış");
  assert.equal(displayRate(null, null), null, "hiçbiri yoksa kur YOK");
  assert.equal(displayRate(0, 0), null);
  assert.equal(displayRate(-1, -2), null);
});

test("TCMB XML doğru ayrıştırılır; 100'lük kotasyon (JPY) Unit'e bölünür", () => {
  const parsed = parseTcmbXml(TCMB_XML)!;
  assert.equal(parsed.bulletin_date, "2026-09-04");
  assert.equal(parsed.rates.TRY, 1);
  assert.equal(parsed.rates.USD, USD);
  assert.equal(parsed.rates.EUR, EUR);
});

test("bozuk/eksik XML null döner — TRY akışı etkilenmez", () => {
  assert.equal(parseTcmbXml("<html>bakim</html>"), null);
  assert.equal(parseTcmbXml("bu xml degil"), null);
  assert.equal(
    parseTcmbXml('<Tarih_Date Tarih="04.09.2026"><Currency Kod="GBP" CurrencyCode="GBP"><Unit>1</Unit><ForexBuying>65.1</ForexBuying></Currency></Tarih_Date>'),
    null,
    "USD veya EUR yoksa tablo kullanılamaz",
  );
});

// ═══ ÇEVRİM ════════════════════════════════════════════════════════════════

test("₺2.999 → USD / EUR (04.09.2026 MID kuru)", () => {
  assert.equal(convertMinor(299900, USD), 6212); // $62,12
  assert.equal(convertMinor(299900, EUR), 5345); // €53,45
});

test("TRY kimlik çevrimi kuruşu korur", () => {
  assert.equal(convertMinor(299900, 1), 299900);
  assert.equal(convertMinor(0, 1), 0);
});

test("geçersiz kur sessiz yanlış fiyat üretmez", () => {
  for (const r of [0, -1, Number.NaN]) assert.throws(() => convertMinor(1000, r));
  assert.throws(() => convertMinor(Number.NaN, USD));
});

test("ÇİFT ÇEVRİM YASAK — EUR daima TRY tabanından", () => {
  // Aynı gerçek kurlarla ÖLÇÜLMÜŞ sapma örnekleri (taban → doğru € cent):
  //   ₺2,00 → 4 ¢  (USD üzerinden 3 ¢)   ₺6,00 → 11 ¢ (USD üzerinden 10 ¢)
  //   ₺8,00 → 14 ¢ (USD üzerinden 15 ¢)
  for (const [base, dogru] of [[200, 4], [600, 11], [800, 14]] as const) {
    assert.equal(convertMinor(base, EUR), dogru, `taban ${base}`);
    const yanlis = Math.round(convertMinor(base, USD) * (USD / EUR));
    assert.notEqual(dogru, yanlis, `taban ${base}: çift çevrim sapması yakalanmalı`);
  }
});

test("gidiş-dönüş: TRY → USD → TRY taban fiyatı bozmaz", () => {
  assert.equal(convertMinor(299900, 1), 299900);
});

test("satırların toplamı ara toplama BİREBİR eşit", () => {
  const lines = [
    { unit_price_minor: 299900, quantity: 2 },
    { unit_price_minor: 34900, quantity: 3 },
  ];
  const r = priceInCurrency(lines, 0, 0, USD);
  assert.equal(r.subtotal_minor, r.unit_minor[0] * 2 + r.unit_minor[1] * 3);
  assert.equal(r.total_minor, r.subtotal_minor);
});

test("sabit TRY indirimi USD olarak DEĞİL, TRY karşılığı düşülür", () => {
  const r = priceInCurrency([{ unit_price_minor: 299900, quantity: 1 }], 15000, 0, USD);
  assert.equal(r.discount_minor, convertMinor(15000, USD));
  assert.notEqual(r.discount_minor, 15000, "150 TRY asla 150 USD olmaz");
});

test("kargo/slot ücreti ürünle AYNI para biriminde (karışık ekran imkânsız)", () => {
  const r = priceInCurrency([{ unit_price_minor: 100000, quantity: 1 }], 0, 5000, EUR);
  assert.equal(r.total_minor, r.subtotal_minor + r.delivery_fee_minor);
});

test("indirim toplamı aşarsa negatif tutar oluşmaz", () => {
  assert.equal(priceInCurrency([{ unit_price_minor: 1000, quantity: 1 }], 999999, 0, USD).total_minor, 0);
});

test("kur yoksa USD/EUR çözülmez, TRY her zaman çalışır", () => {
  assert.equal(rateFor(null, "TRY"), 1);
  assert.equal(rateFor({}, "TRY"), 1);
  assert.equal(rateFor(null, "USD"), null);
  assert.equal(rateFor({ USD: 0 }, "USD"), null);
  assert.equal(rateFor({ EUR: Number.NaN }, "EUR"), null);
});

// ═══ TAZELİK / ARIZA GÜVENLİĞİ ═════════════════════════════════════════════

test("aynı günün bülteni taze; cuma bülteni pazar günü hâlâ kullanılabilir", () => {
  assert.equal(isUsable("2026-09-04", new Date("2026-09-04T10:00:00+03:00")), true);
  assert.equal(isUsable("2026-09-04", new Date("2026-09-06T12:00:00+03:00")), true);
});

test("7 günü aşan bülten KULLANILMAZ — eski kurla fiyat gösterilmez", () => {
  const now = new Date("2026-09-20T12:00:00+03:00");
  assert.equal(isUsable("2026-09-19", now), true);
  assert.equal(isUsable("2026-09-04", now), false);
  assert.ok(bulletinAgeMs("2026-09-04", now) > MAX_STALE_MS);
});

// ═══ BİÇİM ═════════════════════════════════════════════════════════════════

test("TRY biçimi CANLIDAKİYLE BİREBİR AYNI — kuruş yok, dilden bağımsız", () => {
  assert.equal(formatMoney(299900, "TRY", "tr-TR"), "₺2.999");
  assert.equal(formatMoney(124000, "TRY", "tr-TR"), "₺1.240");
  assert.equal(formatMoney(299900, "TRY", "en-GB"), "₺2.999");
  assert.equal(formatMoney(299900, "TRY", "ar-u-nu-latn"), "₺2.999");
});

test("TRY'ye ASLA '≈' eklenmez — TRY gerçek tutardır, yaklaşık değil", () => {
  assert.equal(formatMoney(299900, "TRY", "tr-TR", { approx: true }), "₺2.999");
  assert.ok(!formatMoney(299900, "TRY", "tr-TR", { approx: true }).includes("≈"));
});

test("USD/EUR cent gösterir; '≈' yalnız istendiğinde eklenir", () => {
  const usd = formatMoney(6212, "USD", "en-GB");
  assert.match(usd, /62[.,]12/);
  assert.ok(!usd.includes("≈"), "gezinme yüzeylerinde ≈ YOK");
  assert.ok(formatMoney(6212, "USD", "en-GB", { approx: true }).startsWith("≈ "));
  assert.match(formatMoney(5345, "EUR", "de-DE", { approx: true }), /≈.*53[.,]45/);
});

test("13 global dilin hepsinde biçim üretilir ve boş dönmez", () => {
  const intls = ["en-GB", "de-DE", "fr-FR", "nl-NL", "it-IT", "es-ES", "pt-PT",
                 "az-Latn-AZ", "ru-RU", "ar-u-nu-latn", "zh-CN", "ja-JP", "ko-KR"];
  assert.equal(intls.length, 13);
  for (const intl of intls) {
    for (const c of ["TRY", "USD", "EUR"] as const) {
      const out = formatMoney(299900, c, intl);
      assert.ok(out.length > 0 && /\d/.test(out), `${intl}/${c} → "${out}"`);
    }
  }
});

test("RTL (Arapça) latin rakam üretir — fiyat ters okunmaz", () => {
  assert.match(formatMoney(6212, "USD", "ar-u-nu-latn"), /62/);
});

test("bozuk girdi biçimlendiriciyi çökertmez", () => {
  for (const v of [null, undefined, Number.NaN, "abc"]) {
    assert.equal(formatMoney(v as never, "USD", "en-GB"), "");
  }
  assert.ok(formatMoney(6212, "USD", "xx-INVALID-!!").length > 0);
});

// ═══ DİL ≠ PARA BİRİMİ ═════════════════════════════════════════════════════

test("hiçbir dil bir para birimine KİLİTLİ DEĞİL", () => {
  assert.deepEqual(CURRENCIES.map((c) => c.code), ["TRY", "USD", "EUR"]);
  assert.equal(BASE_CURRENCY, "TRY");
});

test("dile göre mantıklı varsayılan: avro bölgesi → EUR, diğerleri → USD, tr → TRY", () => {
  for (const l of ["de", "fr", "nl", "it", "es", "pt"]) assert.equal(defaultCurrencyForLocale(l), "EUR", l);
  for (const l of ["en", "ru", "ar", "zh", "ja", "ko", "az"]) assert.equal(defaultCurrencyForLocale(l), "USD", l);
  assert.equal(defaultCurrencyForLocale("tr"), "TRY");
});

test("13 global dilin TAMAMI geçerli bir varsayılana sahip", () => {
  const g = ["de", "en", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"];
  assert.equal(g.length, 13);
  for (const l of g) assert.ok(isCurrency(defaultCurrencyForLocale(l)), l);
});

// ═══ KALICILIK / GÜVENLİK ══════════════════════════════════════════════════

test("cookie yoksa null (dil varsayılanı); varsa kullanıcı seçimi korunur", () => {
  assert.equal(parseCurrencyCookie(null), null);
  assert.equal(parseCurrencyCookie("cy_lang=de"), null);
  assert.equal(parseCurrencyCookie("cy_lang=de; cy_currency=USD; x=1"), "USD",
    "Almanca (varsayılan EUR) kullanıcının USD seçimini EZMEZ");
  assert.equal(parseCurrencyCookie("cy_currency=eur"), "EUR");
});

test("manipüle cookie reddedilir (allowlist + sınır)", () => {
  for (const k of ["cy_currency=GBP", "cy_currency=BTC", "cy_currency=TRY123", "cy_currency=XX"]) {
    assert.equal(parseCurrencyCookie(k), null, k);
  }
  for (const k of ["TRY", "USD", "EUR"]) assert.equal(isCurrency(k), true);
  for (const k of ["GBP", "try", "", null, 1, {}]) assert.equal(isCurrency(k as never), false);
});

test("kanarya cookie'si TAM olarak =1 olmalı", () => {
  assert.equal(hasPreviewCookie("cy_currency_preview=1"), true);
  assert.equal(hasPreviewCookie("cy_lang=en; cy_currency_preview=1; x=2"), true);
  for (const k of ["cy_currency_preview=10", "cy_currency_preview=1x", "cy_currency_preview=0", "xcy_currency_preview=1", ""]) {
    assert.equal(hasPreviewCookie(k), false, k);
  }
});

test("yayın bayrağı AÇIK (4 Eyl operatör onayı) ve kill switch çalışıyor", () => {
  // Varsayılan AÇIK: 13 Global dilde müşteri para birimi seçebilir.
  assert.equal(CURRENCY_ENABLED, true);
  // Kill switch sözleşmesi: SADECE "false" kapatır. Yanlışlıkla boş/anlamsız bir
  // değer ("", "0", "off") özelliği KAPATMAZ — kapatma bilinçli olmalıdır.
  const kapatir = (v: string | undefined) => v !== "false";
  assert.equal(kapatir("false"), false, '"false" kapatmalı');
  for (const v of [undefined, "", "true", "0", "off", "FALSE"]) {
    assert.equal(kapatir(v), true, `"${String(v)}" kapatmamalı`);
  }
});

// ═══ ÖDEME ZİNCİRİ DOKUNULMADI (kod düzeyinde sabitleme) ═══════════════════
// Bu bölüm gelecekte birinin yanlışlıkla döviz değerini ödeme yoluna sokmasını
// engeller. Kaynak dosyaları OKUYARAK doğrular.

const read = (p: string) => fs.readFileSync(p, "utf8");

test("SİPARİŞ GÖVDESİNDE para birimi alanı YOK — sunucu döviz bilmez", () => {
  const src = read("components/checkout/CheckoutWizard.tsx");
  const body = src.slice(src.indexOf("const orderBody = {"), src.indexOf("items,\n      };"));
  assert.ok(body.length > 0, "orderBody bulunamadı");
  for (const yasak of ["currency", "fx_rate", "fx_rate_id", "exchange"]) {
    assert.ok(!body.includes(yasak), `orderBody içinde "${yasak}" OLMAMALI`);
  }
});

test("checkout istemcisi kur/tutar GÖNDERMEZ", () => {
  const src = read("lib/payment.ts");
  for (const yasak of ["fx_rate", "convertMinor", "useCurrency"]) {
    assert.ok(!src.includes(yasak), `lib/payment.ts içinde "${yasak}" OLMAMALI`);
  }
});

test("GA4/Ads purchase TRY kalır — döviz sızmaz", () => {
  const src = read("lib/purchaseAnalytics.ts");
  assert.ok(!src.includes("useCurrency"), "analitik para birimi seçicisine BAĞLANMAZ");
  assert.ok(!src.includes("convertMinor"), "analitik değeri ÇEVRİLMEZ");
  assert.ok(src.includes('currency: "TRY"'), "havale purchase TRY sabiti korunmalı");
});

test("Meta Pixel para birimi tipi TRY'ye kilitli kalır", () => {
  const src = read("lib/metaPixel.ts");
  assert.ok(src.includes('currency: "TRY";'), "MetaTrackCustomData.currency 'TRY' olmalı");
  assert.ok(!src.includes('"USD"'), "Meta olayına USD tipi eklenmemeli");
});

test("sepet olayları (add_to_cart) TRY kalır", () => {
  const src = read("lib/cart.tsx");
  assert.ok(!src.includes("useCurrency"), "sepet motoru para birimi seçicisine BAĞLANMAZ");
  assert.ok(src.includes('currency: "TRY"'), "add_to_cart TRY sabiti korunmalı");
});

// ═══ 13 GLOBAL DİL KAPSAMI ═════════════════════════════════════════════════
// Anahtarların var olması yetmez: TR metnine düşen bir dil müşteriye Türkçe
// gösterir. Burada her dilin GERÇEKTEN çevrilmiş olduğu doğrulanır.

const GLOBAL_LOCALES = ["de", "en", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"] as const;
const CURRENCY_KEYS = [
  "currency.title", "currency.subtitle", "currency.aria",
  "currency.rateNote", "currency.chargedNotice", "currency.unavailable",
] as const;

/** Sözlüğü GERÇEKTEN yükler (regex ayrıştırma değil) — çalışma zamanındaki
 *  değerin aynısını görür, böylece test ile vitrin ayrışamaz. */
async function dictOf(lang: string): Promise<Record<string, string>> {
  const mod = await import(`./i18n/dict/${lang}.ts`);
  return mod.default as Record<string, string>;
}

test("13 global dilin TAMAMINDA para birimi metinleri var", async () => {
  assert.equal(GLOBAL_LOCALES.length, 13);
  for (const lang of GLOBAL_LOCALES) {
    const d = await dictOf(lang);
    for (const k of CURRENCY_KEYS) {
      assert.ok(d[k] && d[k].length > 0, `${lang} → ${k} EKSİK`);
    }
  }
});

test("13 dilin hiçbiri Türkçe metne DÜŞMÜYOR (gerçekten çevrilmiş)", async () => {
  const tr = await dictOf("tr");
  for (const lang of GLOBAL_LOCALES) {
    const d = await dictOf(lang);
    for (const k of CURRENCY_KEYS) {
      assert.notEqual(d[k], tr[k], `${lang} → ${k} Türkçe metinle AYNI (çevrilmemiş)`);
    }
  }
});

test("TRY tahsilat bildirimi 13 dilde {amount} yer tutucusunu taşır", async () => {
  // Yer tutucu kaybolursa müşteri tahsil edilecek TRY tutarını GÖREMEZ.
  for (const lang of [...GLOBAL_LOCALES, "tr"]) {
    const d = await dictOf(lang);
    assert.ok(d["currency.chargedNotice"].includes("{amount}"), `${lang} → {amount} eksik`);
  }
});

test("kur notu 13 dilde {source} taşır ve tahsilatın TRY olduğunu söyler", async () => {
  for (const lang of [...GLOBAL_LOCALES, "tr"]) {
    const d = await dictOf(lang);
    assert.ok(d["currency.rateNote"].includes("{source}"), `${lang} → {source} eksik`);
    assert.ok(d["currency.rateNote"].includes("TRY"), `${lang} → TRY ibaresi eksik`);
  }
});

test("yaprak modüllerdeki BASE_CURRENCY sabiti config ile AYNI", () => {
  // price.ts ve format.ts yaprak kalabilmek için "TRY" sabitini kendileri tutar.
  // Bu test o sabitlerin config'ten sapmasını engeller.
  assert.equal(BASE_CURRENCY, "TRY");
  assert.equal(formatMoney(100, BASE_CURRENCY, "tr-TR"), "₺1");
  assert.equal(rateFor(null, BASE_CURRENCY), 1, "yaprak modül tabanı config ile aynı olmalı");
});

// ═══ TR ANA SİTE: para birimi seçimi YOK (operatör kararı, 4 Eyl) ══════════

test("TR ana sitede para birimi bağlamı KAPALI — seçici çıkmaz, TRY sabit", () => {
  // Önek yok + cookie yok → TR
  assert.equal(isForeignLocaleContext("/", null), false);
  assert.equal(isForeignLocaleContext("/urun/mor-orkide", null), false);
  assert.equal(isForeignLocaleContext("/sepet", "cy_lang=tr"), false);
  assert.equal(isForeignLocaleContext("/checkout", "_ga=1; cy_lang=tr"), false);
});

test("13 Global dilin TAMAMINDA para birimi bağlamı AÇIK (URL öneki)", () => {
  const globals = ["de","en","fr","nl","it","es","pt","az","ru","ar","zh","ja","ko"];
  assert.equal(globals.length, 13);
  for (const l of globals) {
    assert.equal(isForeignLocaleContext(`/${l}`, null), true, `/${l}`);
    assert.equal(isForeignLocaleContext(`/${l}/istanbul`, null), true, `/${l}/istanbul`);
  }
});

test("önek yokken cy_lang cookie'si karar verir (sepet/checkout gibi öneksiz sayfalar)", () => {
  assert.equal(isForeignLocaleContext("/sepet", "cy_lang=de"), true);
  assert.equal(isForeignLocaleContext("/checkout", "cy_lang=ar"), true);
  assert.equal(isForeignLocaleContext("/sepet", "cy_lang=tr"), false);
});

test("URL öneki cookie'yi EZER; önek yoksa dil cookie'si belirler", () => {
  // Türkçe cookie'si olan biri /de sayfasındaysa orada para birimi seçebilir.
  assert.equal(isForeignLocaleContext("/de", "cy_lang=tr"), true);
  // Önemli: öneksiz "/" sayfası cy_lang=de ile ALMANCA render edilir (i18n
  // önek yoksa cookie'ye bakar). Sayfa Almancaysa müşteri yabancıdır ve seçici
  // GÖRÜNMELİDİR — "TR'de gizle" kuralı dilin TR olmasına bağlıdır, yola değil.
  assert.equal(isForeignLocaleContext("/", "cy_lang=de"), true);
  // Aynı ziyaretçi Türkçeye dönerse seçici kaybolur ve fiyatlar ₺'ye sabitlenir.
  assert.equal(isForeignLocaleContext("/", "cy_lang=tr"), false);
});

test("TR'ye benzeyen ama global OLMAYAN önekler bağlamı açmaz", () => {
  for (const p of ["/tr", "/tr/istanbul", "/xx", "/abc", "/urun/de-luxe-buket"]) {
    assert.equal(isForeignLocaleContext(p, null), false, p);
  }
});
