import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ADS_CLICK_STORAGE_KEY,
  COOKIE_PREFS_KEY,
  captureAdsClick,
  gaClientIdField,
  gecerliGaIstemciKimligi,
  parseConsentPrefs,
  parseGaClientId,
  parseStoredAdsClick,
  resolveAdsAttribution,
  whatsAppRefFor,
  withWhatsAppRef,
} from "./adsAttribution.ts";

/* Reklam kimliği yakalama (20 Kas 2026):
 *  • wbraid / gbraid oturum boyunca saklanır — YALNIZ pazarlama onayı varken.
 *  • okuma önceliği: çerez → URL → oturum kaydı; kullanım anında okunur.
 *  • WhatsApp etiketi kimlik türünü taşır (gb. / wb.), gclid öneksiz kalır.
 *  • GA istemci kimliği yalnız analitik onayı varken sipariş gövdesine girer. */

const GCLID = "Cj0KCQjw-sahte-gclid-0123456789";
const GBRAID = "0AAAAAsahte-gbraid-0123456789";
const WBRAID = "0BBBBBsahte-wbraid-0123456789";
const WBRAID2 = "0CCCCCsahte-wbraid-9876543210";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");

/** Bellek içi sessionStorage; yazma / silme çağrılarını sayar. */
function sahteDepo(ilk: Record<string, string> = {}) {
  const veri = new Map<string, string>(Object.entries(ilk));
  const sayac = { set: 0, remove: 0 };
  return {
    veri,
    sayac,
    getItem: (k: string) => veri.get(k) ?? null,
    setItem: (k: string, v: string) => { sayac.set++; veri.set(k, v); },
    removeItem: (k: string) => { sayac.remove++; veri.delete(k); },
  };
}

/* ── ONAY ───────────────────────────────────────────────────────────────── */

test("onay: karar yoksa / kayıt bozuksa ikisi de reddedilmiş sayılır; yalnız gerçek true kabul edilir", () => {
  assert.deepEqual(parseConsentPrefs(null), { analytics: false, marketing: false });
  assert.deepEqual(parseConsentPrefs(""), { analytics: false, marketing: false });
  assert.deepEqual(parseConsentPrefs("{bozuk"), { analytics: false, marketing: false });
  assert.deepEqual(parseConsentPrefs("null"), { analytics: false, marketing: false });
  assert.deepEqual(parseConsentPrefs('{"analytics":"true","marketing":1}'), { analytics: false, marketing: false });
  assert.deepEqual(parseConsentPrefs('{"analytics":true,"marketing":false,"ts":1}'), { analytics: true, marketing: false });
  assert.deepEqual(parseConsentPrefs('{"analytics":false,"marketing":true}'), { analytics: false, marketing: true });
});

test("onay: anahtar ConsentManager ve layout'taki Consent Mode varsayılanıyla AYNI", () => {
  assert.equal(COOKIE_PREFS_KEY, "cy_cookie_prefs");
  assert.ok(src("../components/consent/ConsentManager.tsx").includes('const PREFS_KEY = "cy_cookie_prefs";'));
  assert.ok(src("../app/layout.tsx").includes('window.localStorage.getItem("cy_cookie_prefs")'));
});

/* ── OTURUM KAYDI ───────────────────────────────────────────────────────── */

test("saklama: pazarlama onayı YOKKEN hiçbir şey yazılmaz", () => {
  const depo = sahteDepo();
  assert.equal(captureAdsClick(`?wbraid=${WBRAID}&gbraid=${GBRAID}`, false, depo), null);
  assert.equal(depo.sayac.set, 0);
  assert.equal(depo.veri.size, 0);
});

test("saklama: onay geri çekilmişse eski kayıt silinir ve okunmaz", () => {
  const depo = sahteDepo({ [ADS_CLICK_STORAGE_KEY]: JSON.stringify({ gbraid: null, wbraid: WBRAID }) });
  assert.equal(captureAdsClick("", false, depo), null);
  assert.equal(depo.veri.has(ADS_CLICK_STORAGE_KEY), false);
  assert.equal(depo.sayac.set, 0);
});

test("saklama: onay varken URL'deki wbraid / gbraid açık adlı anahtara yazılır", () => {
  const depo = sahteDepo();
  assert.equal(ADS_CLICK_STORAGE_KEY, "cicekyolla:ads-click");
  assert.deepEqual(captureAdsClick(`?utm_source=google&wbraid=${WBRAID}`, true, depo), { gbraid: null, wbraid: WBRAID });
  assert.deepEqual(JSON.parse(depo.veri.get(ADS_CLICK_STORAGE_KEY) ?? "null"), { gbraid: null, wbraid: WBRAID });
  // Sonraki sayfa: URL'de parametre yok → kayıt korunur, yeniden yazılmaz.
  assert.deepEqual(captureAdsClick("", true, depo), { gbraid: null, wbraid: WBRAID });
  assert.equal(depo.sayac.set, 1);
  // gbraid sonradan gelirse eklenir, wbraid korunur.
  assert.deepEqual(captureAdsClick(`?gbraid=${GBRAID}`, true, depo), { gbraid: GBRAID, wbraid: WBRAID });
  // Yeni reklam tıklaması eskisinin üzerine yazar.
  assert.deepEqual(captureAdsClick(`?wbraid=${WBRAID2}`, true, depo), { gbraid: GBRAID, wbraid: WBRAID2 });
});

test("saklama: biçime uymayan değer (test123 vb.) yazılmaz; depo yoksa / patlarsa akış bozulmaz", () => {
  const depo = sahteDepo();
  assert.deepEqual(captureAdsClick("?wbraid=test123&gbraid=<script>", true, depo), { gbraid: null, wbraid: null });
  assert.equal(depo.sayac.set, 0);
  assert.equal(captureAdsClick(`?wbraid=${WBRAID}`, true, null), null);
  const patlayan = {
    getItem: () => { throw new Error("engelli"); },
    setItem: () => { throw new Error("engelli"); },
    removeItem: () => { throw new Error("engelli"); },
  };
  assert.equal(captureAdsClick(`?wbraid=${WBRAID}`, true, patlayan), null);
  assert.equal(captureAdsClick(`?wbraid=${WBRAID}`, false, patlayan), null);
});

test("saklama: bozuk / elle değiştirilmiş kayıt süzgeçten geçer", () => {
  assert.deepEqual(parseStoredAdsClick(null), { gbraid: null, wbraid: null });
  assert.deepEqual(parseStoredAdsClick("{bozuk"), { gbraid: null, wbraid: null });
  assert.deepEqual(parseStoredAdsClick(JSON.stringify({ gbraid: 42, wbraid: "kisa" })), { gbraid: null, wbraid: null });
  assert.deepEqual(parseStoredAdsClick(JSON.stringify({ gbraid: GBRAID, wbraid: WBRAID })), { gbraid: GBRAID, wbraid: WBRAID });
});

/* ── OKUMA ÖNCELİĞİ ─────────────────────────────────────────────────────── */

test("okuma: gclid `_gcl_aw` çerezinden, gbraid `_gcl_gb` çerezinden (checkout'ta URL parametresi yokken)", () => {
  const cookie = `cy_lang=tr; _gcl_aw=GCL.1724750000.${GCLID}; _gcl_gb=GCL.1724750001.${GBRAID}; _ga=GA1.1.111.222`;
  assert.deepEqual(resolveAdsAttribution({ cookie, search: "", stored: null, marketing: true }), { gclid: GCLID, gbraid: GBRAID, wbraid: null });
});

test("okuma: çerez URL'den, URL oturum kaydından önce gelir", () => {
  const cookie = `_gcl_aw=GCL.1.${GCLID}; _gcl_gb=GCL.2.${GBRAID}`;
  const stored = { gbraid: "0DDDDDsaklanan-gbraid-0123456789", wbraid: WBRAID };
  // Çerez varken URL ve kayıt yok sayılır.
  assert.deepEqual(
    resolveAdsAttribution({ cookie, search: "?gclid=Cj0KCQjw-url-gclid-000000000000&gbraid=0EEEEEurl-gbraid-00000000000000", stored, marketing: true }),
    { gclid: GCLID, gbraid: GBRAID, wbraid: WBRAID },
  );
  // Çerez yok: URL kazanır.
  assert.deepEqual(
    resolveAdsAttribution({ cookie: "", search: `?gbraid=${GBRAID}&wbraid=${WBRAID2}`, stored, marketing: true }),
    { gclid: null, gbraid: GBRAID, wbraid: WBRAID2 },
  );
  // Çerez de URL de yok: oturum kaydı.
  assert.deepEqual(resolveAdsAttribution({ cookie: "", search: "", stored, marketing: true }), { gclid: null, gbraid: stored.gbraid, wbraid: WBRAID });
});

test("okuma: pazarlama onayı yokken oturum kaydı KULLANILMAZ; hiçbir kaynak yoksa hepsi null", () => {
  const stored = { gbraid: GBRAID, wbraid: WBRAID };
  assert.deepEqual(resolveAdsAttribution({ cookie: "", search: "", stored, marketing: false }), { gclid: null, gbraid: null, wbraid: null });
  assert.deepEqual(resolveAdsAttribution({ cookie: "", search: "", stored: null, marketing: true }), { gclid: null, gbraid: null, wbraid: null });
});

test("okuma: biçim süzgeci her kaynakta geçerli (20–255 karakter, harf/rakam/._-)", () => {
  const r = resolveAdsAttribution({
    cookie: "_gcl_aw=GCL.1.test123; _gcl_gb=GCL.1.kisa",
    search: "?gclid=test123&gbraid=kisa&wbraid=" + "a".repeat(256),
    stored: null,
    marketing: true,
  });
  assert.deepEqual(r, { gclid: null, gbraid: null, wbraid: null });
  // Bozuk yüzde kodlaması patlatmaz.
  assert.deepEqual(resolveAdsAttribution({ cookie: "_gcl_aw=%E0%A4%A", search: "", stored: null, marketing: true }).gclid, null);
});

test("KAYNAK: checkout kimlikleri KULLANIM ANINDA (sipariş gövdesi kurulurken) okur, mount'ta değil", () => {
  for (const dosya of ["../components/checkout/CheckoutWizard.tsx", "../components/checkout/CheckoutForm.tsx"]) {
    const s = src(dosya);
    assert.equal((s.match(/readAdsAttribution\(\)/g) || []).length, 1, dosya);
    assert.equal((s.match(/readGaClientIdField\(\)/g) || []).length, 1, dosya);
    const oku = s.indexOf("const adsAttr = readAdsAttribution();");
    const alan = s.indexOf("ads_gclid: adsAttr.gclid");
    assert.ok(oku > 0 && alan > oku && alan - oku < 3000, `${dosya}: okuma gövdenin hemen önünde`);
    // Okuma bir useEffect / useState başlatıcısında DEĞİL: aynı satırlarda hook yok.
    assert.equal(/use(Effect|State|Memo|Ref)\([^)]*readAdsAttribution/.test(s), false, dosya);
    assert.ok(s.includes("ads_gbraid: adsAttr.gbraid") && s.includes("ads_wbraid: adsAttr.wbraid"), dosya);
    assert.ok(s.indexOf("...readGaClientIdField(),") > oku, dosya);
  }
  const lib = src("./adsAttribution.ts");
  // readAdsAttribution her çağrıda çerezi, URL'i ve onayı taze okur (modül düzeyinde önbellek yok).
  assert.match(lib, /export function readAdsAttribution\(\): AdsAttribution \{[\s\S]{0,420}document\.cookie[\s\S]{0,80}window\.location\.search/);
  assert.equal(/^(let|var) /m.test(lib), false, "modül düzeyinde değişken (önbellek) yok");
});

test("KAYNAK: yakalama açılışta ve onay verildiği anda çağrılır", () => {
  const ref = src("../components/AdsWhatsAppRef.tsx");
  assert.match(ref, /useEffect\(\(\) => \{[\s\S]{0,400}captureAdsClickFromUrl\(\);/);
  const cm = src("../components/consent/ConsentManager.tsx");
  const persist = cm.slice(cm.indexOf("function persist(prefs: CookiePrefs) {"));
  const kayit = persist.indexOf("safeSet(PREFS_KEY");
  const yakala = persist.indexOf("captureAdsClickFromUrl();");
  assert.ok(kayit > 0 && yakala > kayit && yakala < 900, "tercih kaydedildikten SONRA, persist içinde");
});

/* ── WHATSAPP ETİKETİ ───────────────────────────────────────────────────── */

test("WhatsApp etiketi: gclid öneksiz (eski biçim), gbraid gb., wbraid wb.; öncelik gclid > gbraid > wbraid", () => {
  assert.equal(whatsAppRefFor({ gclid: GCLID, gbraid: GBRAID, wbraid: WBRAID }), GCLID);
  assert.equal(whatsAppRefFor({ gclid: null, gbraid: GBRAID, wbraid: WBRAID }), `gb.${GBRAID}`);
  assert.equal(whatsAppRefFor({ gclid: null, gbraid: null, wbraid: WBRAID }), `wb.${WBRAID}`);
  assert.equal(whatsAppRefFor({ gclid: null, gbraid: null, wbraid: null }), null);
  // Açılış sayfasındaki URL gclid'i en taze kaynaktır; geçersizse yok sayılır.
  const urlGclid = "Cj0KCQjw-url-gclid-000000000000";
  assert.equal(whatsAppRefFor({ gclid: GCLID, gbraid: null, wbraid: null }, urlGclid), urlGclid);
  assert.equal(whatsAppRefFor({ gclid: null, gbraid: GBRAID, wbraid: null }, "test123"), `gb.${GBRAID}`);
});

test("WhatsApp etiketi: yeni biçim API'nin eski ve yeni ayıklayıcısıyla uyumlu", () => {
  const TABAN = "https://www.cicekyolla.com.tr";
  for (const [ref, tur, deger] of [[GCLID, "gclid", GCLID], [`gb.${GBRAID}`, "gbraid", GBRAID], [`wb.${WBRAID}`, "wbraid", WBRAID]] as const) {
    const out = withWhatsAppRef("https://wa.me/905458813450?text=Merhaba", ref, TABAN);
    const metin = new URL(out ?? "").searchParams.get("text") ?? "";
    // whatsappOrderBridge.ts REF_DESENI (eski, değişmedi): etiketi bütün olarak yakalar.
    const ham = /\[ref:\s*([A-Za-z0-9._-]{6,255})\s*\]/i.exec(metin)?.[1];
    assert.equal(ham, ref);
    // whatsappOrderBridge.ts REF_TUR_DESENI (yeni): öneki türe çevirir; öneksiz = gclid.
    const m = /^(gb|wb)\.([A-Za-z0-9._-]{6,252})$/.exec(ham ?? "");
    assert.equal(m ? (m[1] === "gb" ? "gbraid" : "wbraid") : "gclid", tur);
    assert.equal(m ? m[2] : ham, deger);
  }
});

/* ── GA İSTEMCİ KİMLİĞİ ─────────────────────────────────────────────────── */

test("_ga ayrıştırma: GA1.1.<a>.<b> → <a>.<b>; _ga_<ID> çerezi karıştırılmaz", () => {
  assert.equal(parseGaClientId("_ga=GA1.1.1234567890.1700000000"), "1234567890.1700000000");
  assert.equal(parseGaClientId("cy_lang=tr; _ga_9MNZQER9R1=GS2.1.s1700000000$o1$g0; _ga=GA1.2.987654321.1699999999; x=1"), "987654321.1699999999");
  assert.equal(parseGaClientId("_ga_9MNZQER9R1=GS2.1.s1700000000$o1$g0"), null, "yalnız oturum çerezi varsa kimlik yok");
  for (const kotu of ["", null, undefined, "_ga=", "_ga=1234567890.1700000000", "_ga=GA1.1.abc.def", "_ga=GA1.1.1234567890", "_ga=GA1.1.1.2.3", "_ga=GA1.1.1234567890123.1", "_ga=%E0%A4%A"]) {
    assert.equal(parseGaClientId(kotu), null, String(kotu));
  }
});

test("_ga biçim süzgeci: yalnız <en çok 12 hane>.<en çok 12 hane>", () => {
  assert.equal(gecerliGaIstemciKimligi("1.2"), "1.2");
  assert.equal(gecerliGaIstemciKimligi(" 123456789012.123456789012 "), "123456789012.123456789012");
  for (const kotu of ["", null, undefined, "1234567890123.1", "1.", ".2", "a.b", "1.2.3", "GA1.1.1.2"]) {
    assert.equal(gecerliGaIstemciKimligi(kotu), null, String(kotu));
  }
});

test("sipariş gövdesi: analitik onayı YOKKEN alan hiç eklenmez; varken yalnız geçerli kimlik eklenir", () => {
  const cookie = "_ga=GA1.1.1234567890.1700000000";
  assert.deepEqual(gaClientIdField(cookie, false), {});
  assert.equal("ga_client_id" in gaClientIdField(cookie, false), false);
  assert.deepEqual(gaClientIdField(cookie, true), { ga_client_id: "1234567890.1700000000" });
  assert.deepEqual(gaClientIdField("", true), {});
  assert.deepEqual(gaClientIdField("_ga=bozuk", true), {});
});
