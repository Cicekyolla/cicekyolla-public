import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MARKETING_CONFIG_PATH,
  MARKETING_CONSENT_PATH,
  MARKETING_NOT_RECORDED_NOTICE,
  formatMinor,
  marketingCheckboxVisible,
  marketingConsentRequestBody,
  marketingErrorMessage,
  marketingToggleView,
  parseMarketingConfig,
  parseMarketingConsentState,
  registerConsentNotice,
  registerMarketingField,
  registerRequestBody,
  type MarketingConsentState,
} from "./consent.ts";

/*
 * BU TESTİN VAR OLMA SEBEBİ (DECISIONS D6 · DESIGN §3.A.10)
 *
 * lib/consent.ts kayıt gövdesine SABİT `kvkk_onay: true` yazıyordu. Kullanıcı
 * hiçbir kutuyu işaretlemese bile API `auth_users.kvkk_onay_at`'i dolduruyor,
 * admin ekranı da "KVKK onayı: kayıt formunda işaretlendi" diyordu — yani
 * sistem, alınmamış bir onayı alınmış gibi KAYDEDİYORDU.
 *
 * Aşağıdaki ilk iddia, o satır geri gelirse KIRILIR.
 */

test("kvkk_onay gövdeye UYDURULARAK yazılmaz: işaretlenmediyse false gider", () => {
  const body = registerRequestBody({ email: "a@b.com", password: "sifre1234", kvkkOnay: false });
  assert.equal(body.kvkk_onay, false);
});

test("kvkk_onay yalnız gerçekten işaretlendiğinde true olur", () => {
  const body = registerRequestBody({ email: "a@b.com", password: "sifre1234", kvkkOnay: true });
  assert.equal(body.kvkk_onay, true);
});

test("true'ya benzeyen değerler (string/1) true'ya YÜKSELTİLMEZ", () => {
  for (const sneaky of ["true", 1, {}, [], "on"] as unknown[]) {
    const body = registerRequestBody({
      email: "a@b.com",
      password: "sifre1234",
      kvkkOnay: sneaky as boolean,
    });
    assert.equal(body.kvkk_onay, false, `true sayıldı: ${JSON.stringify(sneaky)}`);
  }
});

test("gövde yalnız sözleşmedeki alanları taşır (ad opsiyonel)", () => {
  assert.deepEqual(registerRequestBody({ email: "a@b.com", password: "sifre1234", kvkkOnay: true }), {
    email: "a@b.com",
    password: "sifre1234",
    name: undefined,
    kvkk_onay: true,
  });
  assert.deepEqual(
    registerRequestBody({ email: "a@b.com", password: "sifre1234", name: "Ad Soyad", kvkkOnay: true }),
    { email: "a@b.com", password: "sifre1234", name: "Ad Soyad", kvkk_onay: true },
  );
});

test("formatMinor: kuruş → okunur TL; geçersiz değer boş dize", () => {
  assert.equal(formatMinor(15000), "150 TL");
  assert.equal(formatMinor(14950), "149,50 TL");
  assert.equal(formatMinor(0), "0 TL");
  assert.equal(formatMinor(null), "");
  assert.equal(formatMinor(undefined), "");
  assert.equal(formatMinor(Number.NaN), "");
});

/* ─────────────── Pazarlama e-posta izni (E2E CAP-ON/public) ───────────────
 * Public tarafta hiçbir yakalama noktası yoktu: /giris ve yeni üye
 * penceresinde kutucuk, Hesabım'da anahtar, /api/auth/marketing proxy'si ve
 * config okuyucusu yoktu (DESIGN §3.G.2 · §6.9).
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEXT = { version: "eposta-izin-tr-test", label: "Kampanya e-postalarını almak istiyorum.", body: "Metin gövdesi." };
const ON = { ok: true, marketing_email: { capture_enabled: true, unsubscribe_ready: true, text: TEXT } };
const OFF = { ok: true, marketing_email: { capture_enabled: false, unsubscribe_ready: false, text: null } };

function state(over: Partial<MarketingConsentState> = {}): MarketingConsentState {
  return {
    status: "none",
    status_label: "İzin yok",
    granted_at: null,
    withdrawn_at: null,
    text_version: null,
    capture_enabled: true,
    suppressed_reason: null,
    suppressed_label: null,
    ...over,
  };
}

test("proxy route'ları mevcut: /api/marketing/config (kimliksiz) ve /api/auth/marketing/consent (üye çerezi iletilir)", () => {
  assert.equal(MARKETING_CONFIG_PATH, "/api/marketing/config");
  assert.equal(MARKETING_CONSENT_PATH, "/api/auth/marketing/consent");
  const config = join(ROOT, "app/api/marketing/config/route.ts");
  const consent = join(ROOT, "app/api/auth/marketing/consent/route.ts");
  assert.ok(existsSync(config) && existsSync(consent));
  const c = readFileSync(config, "utf8");
  assert.match(c, /\/api\/public\/marketing\/config/);
  assert.doesNotMatch(c, /cookie:\s*true/);
  const m = readFileSync(consent, "utf8");
  assert.match(m, /export async function GET/);
  assert.match(m, /export async function POST/);
  assert.equal((m.match(/cookie:\s*true/g) ?? []).length, 2, "GET ve POST üye çerezini iletmeli");
});

test("kutucuk YALNIZ yakalama açık + metin varken çizilir; kapalıyken/bozuk yanıtta çizilmez", () => {
  assert.equal(marketingCheckboxVisible(parseMarketingConfig(ON)), true);
  assert.equal(marketingCheckboxVisible(parseMarketingConfig(OFF)), false);
  assert.equal(marketingCheckboxVisible(parseMarketingConfig(null)), false);
  assert.equal(marketingCheckboxVisible(parseMarketingConfig({ error: "proxy_error" })), false);
  // Bayrak açık ama metin yok/boş → okunmamış bir metne onay verdirilemez.
  assert.equal(marketingCheckboxVisible(parseMarketingConfig({ marketing_email: { capture_enabled: true, text: null } })), false);
  assert.equal(
    marketingCheckboxVisible(parseMarketingConfig({ marketing_email: { capture_enabled: true, text: { ...TEXT, label: " " } } })),
    false,
  );
  // "true" dizesi açık sayılmaz.
  assert.equal(marketingCheckboxVisible(parseMarketingConfig({ marketing_email: { capture_enabled: "true", text: TEXT } })), false);
  // Eski sürüm (başlıksız) metin: heading null döner.
  assert.deepEqual(parseMarketingConfig(ON)?.text, { ...TEXT, heading: null });
  // Y1: kutucuk başlığı API'den gelir (m.7/5); boş başlık null sayılır.
  const withHeading = { ok: true, marketing_email: { capture_enabled: true, unsubscribe_ready: true, text: { ...TEXT, heading: "Ticari Elektronik İleti İzni" } } };
  assert.equal(parseMarketingConfig(withHeading)?.text?.heading, "Ticari Elektronik İleti İzni");
  assert.equal(parseMarketingConfig({ marketing_email: { capture_enabled: true, text: { ...TEXT, heading: "  " } } })?.text?.heading, null);
});

test("/giris gövdesi: kutucuk yoksa alan HİÇ eklenmez; varsa gerçek değer (true'ya yükseltilmez)", () => {
  assert.deepEqual(registerMarketingField(false, true), {});
  assert.deepEqual(registerMarketingField(true, false), { marketing_email: false });
  assert.deepEqual(registerMarketingField(true, true), { marketing_email: true });
  for (const sneaky of ["true", "on", 1, {}] as unknown[]) {
    assert.deepEqual(registerMarketingField(true, sneaky), { marketing_email: false });
  }
});

test("kayıt yanıtı izni doğrulamazsa DÜRÜST not; işaretlenmediyse not yok", () => {
  assert.equal(registerConsentNotice(true, true, { ok: true, marketing_email: "granted" }), null);
  assert.equal(registerConsentNotice(true, true, { ok: true, marketing_email: { status: "granted" } }), null);
  assert.equal(registerConsentNotice(true, true, { ok: true, marketing_email: { outcome: "granted" } }), null);
  assert.equal(registerConsentNotice(true, true, { ok: true, marketing_email: "not_recorded" }), MARKETING_NOT_RECORDED_NOTICE);
  assert.equal(registerConsentNotice(true, true, { ok: true, user_id: "1" }), MARKETING_NOT_RECORDED_NOTICE);
  assert.equal(registerConsentNotice(true, false, { ok: true }), null);
  assert.equal(registerConsentNotice(false, true, { ok: true }), null);
});

test("üye ucu gövdesi: yalnız gerçek true izin verir; kaynak API kümesinden", () => {
  assert.deepEqual(marketingConsentRequestBody(true, "account_settings"), { granted: true, source: "account_settings" });
  assert.deepEqual(marketingConsentRequestBody("true", "welcome_popup"), { granted: false, source: "welcome_popup" });
  assert.deepEqual(marketingConsentRequestBody(false, "account_settings"), { granted: false, source: "account_settings" });
});

test("Hesabım anahtarı: izin yok + yakalama kapalı → çizilmez; izin VARSA her koşulda geri çekilebilir", () => {
  const off = parseMarketingConfig(OFF);
  const on = parseMarketingConfig(ON);
  assert.equal(marketingToggleView(state({ capture_enabled: false }), off).visible, false);
  assert.equal(marketingToggleView(null, on).visible, false);

  const granted = marketingToggleView(state({ status: "granted", status_label: "İzin verildi", capture_enabled: false }), off);
  assert.deepEqual([granted.visible, granted.checked, granted.canToggle, granted.statusLabel], [true, true, true, "İzin verildi"]);

  const canGrant = marketingToggleView(state(), on);
  assert.deepEqual([canGrant.visible, canGrant.checked, canGrant.canToggle, canGrant.text], [true, false, true, { ...TEXT, heading: null }]);

  // Geri çekilmiş + yakalama kapalı: durum görünür (read-back) ama yeniden verilemez.
  const withdrawnOff = marketingToggleView(
    state({ status: "withdrawn", status_label: "İzin geri çekildi", capture_enabled: false, suppressed_label: "Abonelikten çıktı" }),
    off,
  );
  assert.deepEqual(
    [withdrawnOff.visible, withdrawnOff.checked, withdrawnOff.canToggle, withdrawnOff.suppressedLabel],
    [true, false, false, "Abonelikten çıktı"],
  );
});

test("durum ayrıştırma: bilinmeyen durum reddedilir; etiketler sunucudan", () => {
  assert.equal(parseMarketingConsentState({ marketing_email: { status: "GRANTED" } }), null);
  assert.equal(parseMarketingConsentState({ error: "x" }), null);
  const s = parseMarketingConsentState({
    ok: true,
    marketing_email: {
      status: "withdrawn",
      status_label: "İzin geri çekildi",
      suppressed_reason: "unsubscribe",
      suppressed_label: "Abonelikten çıktı",
      capture_enabled: true,
    },
  });
  assert.equal(s?.status, "withdrawn");
  assert.equal(s?.suppressed_label, "Abonelikten çıktı");
});

test("hata cümleleri Türkçe; teknik kod ekrana basılmaz", () => {
  assert.match(marketingErrorMessage(401, null), /yeniden giriş/);
  assert.equal(
    marketingErrorMessage(409, { ok: false, error: "İletişim izni kaydı şu anda kapalı. Kısa süre içinde açılacak.", code: "capture_disabled" }),
    "İletişim izni kaydı şu anda kapalı. Kısa süre içinde açılacak.",
  );
  assert.doesNotMatch(marketingErrorMessage(502, { error: "proxy_error" }), /proxy_error/);
  assert.doesNotMatch(marketingErrorMessage(400, { error: "capture_disabled" }), /capture_disabled/);
});

test("yakalama noktaları bağlı: /giris, yeni üye penceresi ve Hesabım kutucuğu config'ten çizer", () => {
  const giris = readFileSync(join(ROOT, "app/giris/GirisForm.tsx"), "utf8");
  assert.match(giris, /fetchMarketingConfig\(\)/);
  assert.match(giris, /registerMarketingField\(marketingShown, marketingTicked\)/);
  assert.match(giris, /\{marketingShown && \(/);
  const popup = readFileSync(join(ROOT, "components/consent/NewMemberPopup.tsx"), "utf8");
  assert.match(popup, /setMarketingConsent\(true, "welcome_popup"\)/);
  assert.match(popup, /marketingCheckboxVisible\(marketingConfig\) && marketingTicked/);
  // Popup kök layout'ta her sayfada bağlı: config YALNIZ pencere açılınca okunur
  // (her sayfa görüntülemesinde API'ye fazladan istek atılmaz).
  assert.match(popup, /if \(!visible \|\| marketingConfig\) return;\s*let alive = true;\s*fetchMarketingConfig\(\)/);
  const hesabim = readFileSync(join(ROOT, "app/hesabim/page.tsx"), "utf8");
  assert.match(hesabim, /fetchMarketingConsent\(\)/);
  assert.match(hesabim, /setMarketingConsent\(granted, "account_settings"\)/);
  assert.match(hesabim, /marketingView\.visible &&/);
});
