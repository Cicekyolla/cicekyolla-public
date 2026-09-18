import test from "node:test";
import assert from "node:assert/strict";
import {
  couponStatusLabel,
  couponValueText,
  displayPhone,
  formatDeliveryDate,
  formatMinorTry,
  isSyntheticPhone,
  memberInitials,
  orderStatusLabel,
  ownershipNotice,
  partitionCoupons,
  paymentStatusLabel,
  phoneVerifyConfirmText,
  splitOrdersByPhase,
  summaryTiles,
  tierLabel,
  welcomeOfferView,
  welcomeRuleText,
  welcomeSectionVisible,
  type AccountOrderSummary,
  type MemberCoupon,
  type MemberOrder,
  checkoutPrefillAllowed,
  emailReviewView,
} from "./memberAccountView.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const order = (over: Partial<MemberOrder>): MemberOrder => ({
  id: 1,
  order_number: "CY-1",
  status: "new",
  payment_status: "pending",
  delivery_date: "2026-09-20",
  delivery_time_slot: null,
  delivery_city: null,
  delivery_district: null,
  recipient_name: "Alıcı",
  total_amount_minor: 10000,
  created_at: "2026-09-17T08:00:00.000Z",
  ...over,
});

test("ham enum ASLA ekrana basılmaz; bilinmeyen değer nötr Türkçe cümleye döner", () => {
  assert.equal(orderStatusLabel("delivered"), "Teslim edildi");
  assert.equal(orderStatusLabel("uydurma_durum"), "Durum bilgisi bekleniyor");
  assert.equal(orderStatusLabel(null), "Durum bilgisi bekleniyor");
  assert.equal(paymentStatusLabel("paid"), "Ödeme alındı");
  assert.equal(paymentStatusLabel("weird"), "Ödeme durumu bekleniyor");
  assert.equal(couponStatusLabel("used"), "Kullanıldı");
  assert.equal(couponStatusLabel("zzz"), "Durum bilgisi bekleniyor");
  assert.equal(tierLabel("gold"), "Altın");
  assert.equal(tierLabel("bilinmiyor"), "Standart");
});

test("KPI rakamları YALNIZ order_summary'den gelir; özet yoksa kart çizilmez", () => {
  assert.deepEqual(summaryTiles(null), []);
  assert.deepEqual(summaryTiles(undefined), []);
  const summary: AccountOrderSummary = {
    visible_order_count: 4,
    open_order_count: 2,
    awaiting_payment_count: 1,
    paid_order_count: 3,
    paid_spent_minor: 123456,
    last_paid_order_at: "2026-09-16T10:00:00.000Z",
  };
  const tiles = summaryTiles(summary);
  assert.equal(tiles.length, 4);
  assert.equal(tiles[0].value, "2");
  assert.match(tiles[0].detail, /4 sipariş/);
  assert.equal(tiles[1].value, "1");
  assert.equal(tiles[2].value, "3");
  assert.match(tiles[2].detail, /1\.234,56/);
});

test("özet sayıları istemcide YENİDEN HESAPLANMAZ: liste ile özet çelişse bile özet kazanır", () => {
  // 3 sipariş listelenmiş ama sunucu 'ödenen 1' demiş → ekranda 1 yazar.
  const tiles = summaryTiles({
    visible_order_count: 3,
    open_order_count: 0,
    awaiting_payment_count: 2,
    paid_order_count: 1,
    paid_spent_minor: 0,
    last_paid_order_at: null,
  });
  assert.equal(tiles[2].value, "1");
  assert.equal(tiles[3].value, "—");
  assert.match(tiles[3].detail, /Henüz ödemesi alınan sipariş yok/);
});

test("siparişler sunucunun status alanına göre gruplanır", () => {
  const { active, past } = splitOrdersByPhase([
    order({ id: 1, status: "preparing" }),
    order({ id: 2, status: "delivered" }),
    order({ id: 3, status: "cancelled" }),
    order({ id: 4, status: "DELIVERED" }),
    order({ id: 5, status: "uydurma" }),
  ]);
  assert.deepEqual(active.map((o) => o.id), [1, 5]);
  assert.deepEqual(past.map((o) => o.id), [2, 3, 4]);
  assert.deepEqual(splitOrdersByPhase(null), { active: [], past: [] });
});

test("kuponlar sunucu status'una göre ayrılır; used_count/usage_limit ile karar VERİLMEZ", () => {
  const coupons: MemberCoupon[] = [
    { id: 1, name: "A", code: "A1", percentage: null, status: "available", usage_limit: 1, used_count: 1 },
    { id: 2, name: "B", code: "B1", percentage: 40, status: "used", usage_limit: 1, used_count: 0 },
    { id: 3, name: "C", code: "C1", percentage: null, status: "expired" },
  ];
  const { available, other } = partitionCoupons(coupons);
  // used_count === usage_limit olmasına rağmen sunucu 'available' dediği için kullanılabilir.
  assert.deepEqual(available.map((c) => c.id), [1]);
  assert.deepEqual(other.map((c) => c.id), [2, 3]);
  assert.equal(couponValueText(coupons[1]), "%40");
  assert.equal(couponValueText(coupons[0]), null);
});

test("sahiplik kartı: ownership bloğu yoksa (eski API) HİÇ çizilmez", () => {
  assert.equal(ownershipNotice(null, null).visible, false);
  assert.equal(ownershipNotice(undefined, "+905074413474").visible, false);
});

test("sahiplik kartı: doğrulanmış üyede çizilmez", () => {
  assert.equal(ownershipNotice({ status: "verified", phone_verified: true }, "+905074413474").visible, false);
  assert.equal(ownershipNotice({ phone_verified: true, has_phone: true }, "+905074413474").visible, false);
});

test("sahiplik kartı: doğrulanmamış üyede sunucunun cümlesi gösterilir", () => {
  const notice = ownershipNotice(
    {
      status: "needs_phone_verification",
      history_hidden: true,
      phone_verified: false,
      has_phone: true,
      message: "Sunucudan gelen gerçek cümle.",
    },
    "+905074413474",
  );
  assert.equal(notice.visible, true);
  assert.equal(notice.body, "Sunucudan gelen gerçek cümle.");
  assert.equal(notice.needsPhoneInput, false);
  assert.equal(notice.historyHidden, true);
});

test("sahiplik kartı: gönderilebilir numara yoksa kullanıcıdan istenir (sentetik telefon dâhil)", () => {
  const base = { status: "needs_phone_verification", phone_verified: false, has_phone: true };
  assert.equal(ownershipNotice(base, "member-9f2a1c").needsPhoneInput, true);
  assert.equal(ownershipNotice({ ...base, has_phone: false }, null).needsPhoneInput, true);
  assert.match(ownershipNotice(base, null).body, /Telefonunuzu doğrulayın/);
});

test("sentetik telefon müşteriye GÖSTERİLMEZ", () => {
  assert.equal(isSyntheticPhone("member-9f2a1c"), true);
  assert.equal(isSyntheticPhone("legacy-uye-42"), true);
  assert.equal(isSyntheticPhone("+905074413474"), false);
  assert.equal(displayPhone("member-9f2a1c"), null);
  assert.equal(displayPhone(null), null);
  assert.equal(displayPhone("   "), null);
  // Okunur biçim (0507 …) authErrors.formatTrMobile'ın işidir; burada ham değer döner.
  assert.equal(displayPhone(" +905074413474 "), "+905074413474");
});

test("hoş geldin teklifi: kullanılabilir durumda GERÇEK kural metni kurulur", () => {
  const view = welcomeOfferView({
    available: true,
    code: "HOSGELDIN150",
    amount_minor: 15000,
    min_cart_total_minor: 50000,
    first_order_only: true,
    ends_at: null,
  });
  assert.equal(view.state, "usable");
  assert.equal(view.code, "HOSGELDIN150");
  assert.match(view.ruleText, /150,00/);
  assert.match(view.ruleText, /500,00/);
  assert.match(view.ruleText, /ilk siparişinizde/);
});

test("hoş geldin teklifi: kod boşsa 'kazandınız' DENMEZ", () => {
  const view = welcomeOfferView({ available: true, code: "   ", amount_minor: 15000 });
  assert.equal(view.state, "unavailable");
  assert.equal(view.code, null);
});

test("hoş geldin teklifi: telefon doğrulaması gerekiyorsa o durum ayrı taşınır", () => {
  const view = welcomeOfferView({ available: false, reason: "needs_phone_verification" });
  assert.equal(view.state, "needs_phone_verification");
  assert.match(view.message!, /telefonunuzu doğrulayın/i);
});

test("hoş geldin teklifi: sunucu mesajı varsa O gösterilir, yoksa sebep sözlüğü", () => {
  assert.equal(
    welcomeOfferView({ available: false, reason: "used", message: "Sunucu cümlesi." }).message,
    "Sunucu cümlesi.",
  );
  assert.match(welcomeOfferView({ available: false, reason: "expired" }).message!, /süresi doldu/);
  assert.match(welcomeOfferView({ available: false, reason: "bilinmeyen_sebep" }).message!, /kullanılamıyor/);
  assert.equal(welcomeOfferView(null).state, "unavailable");
  assert.equal(welcomeOfferView(null).message, null);
});

test("kural metni uydurulmaz: alan yoksa cümle de yok", () => {
  assert.equal(welcomeRuleText({ available: true, code: "X" }), "");
  assert.equal(welcomeRuleText(null), "");
});

test("tutar/tarih biçimlendirme: bozuk değerde ekran kırılmaz", () => {
  assert.match(formatMinorTry(15000), /150,00/);
  assert.match(formatMinorTry(null), /0,00/);
  assert.equal(formatDeliveryDate(null), "Tarih belirlenmedi");
  assert.equal(formatDeliveryDate("bozuk-tarih"), "Tarih belirlenmedi");
  assert.match(formatDeliveryDate("2026-09-20"), /2026/);
});

test("baş harfler: ad yoksa nötr", () => {
  assert.equal(memberInitials("Ayşe Yılmaz"), "AY");
  assert.equal(memberInitials("  "), "ÜY");
  assert.equal(memberInitials(null), "ÜY");
});

test("onay metni: müşteriye mesaj gidecek eylem numarayı açıkça yazar", () => {
  assert.match(phoneVerifyConfirmText("0507 441 34 74"), /0507 441 34 74/);
  assert.match(phoneVerifyConfirmText("member-9f2a1c"), /Yazdığınız numaraya/);
  assert.match(phoneVerifyConfirmText(null), /Yazdığınız numaraya/);
});

test("hoş geldin bölümü: kampanya YOKSA hiç çizilmez, üyeye özel sebepte çizilir", () => {
  // Kampanyanın kendisi yok/kapalı → bölüm yok (her üyeye "şu anda yok" demek gürültü).
  for (const reason of [
    "not_configured",
    "campaign_inactive",
    "coupon_not_found",
    "coupon_inactive",
    "not_started",
    "expired",
    "limit_reached",
    "not_fixed_amount",
    "lookup_failed",
    "not_member",
  ]) {
    assert.equal(welcomeSectionVisible({ available: false, reason }), false, `çizildi: ${reason}`);
  }
  // Üyenin KENDİ durumu → gösterilir.
  for (const reason of ["used", "already_used", "not_first_order", "needs_phone_verification"]) {
    assert.equal(welcomeSectionVisible({ available: false, reason }), true, `çizilmedi: ${reason}`);
  }
  assert.equal(welcomeSectionVisible({ available: true, code: "HOSGELDIN150" }), true);
  assert.equal(welcomeSectionVisible(null), false);
  assert.equal(welcomeSectionVisible(undefined), false);
});

/* ── W4-2: telefon kanıtından sonra "bu e-posta sizin mi?" ─────────────────── */

test("W4-2: e-posta incelemesi yalnız sunucu required:true + maskeli adres verirse görünür", () => {
  assert.deepEqual(emailReviewView({ email_review: { required: true, email_masked: "sa***@ornek.com", message: "Sunucu cümlesi." } }), {
    visible: true, emailMasked: "sa***@ornek.com", message: "Sunucu cümlesi.",
  });
  for (const raw of [undefined, null, { required: false, email_masked: "x***@y.com" }, { required: true, email_masked: "" }, { required: "true" as unknown as boolean, email_masked: "x***@y.com" }]) {
    assert.equal(emailReviewView({ email_review: raw as never }).visible, false, JSON.stringify(raw));
  }
  // Eski API bloğu hiç göndermez → kart yok.
  assert.equal(emailReviewView({} as never).visible, false);
  // Sunucu cümlesi yoksa nötr yedek, ham enum yok.
  const fallback = emailReviewView({ email_review: { required: true, email_masked: "a***@b.com", message: null } });
  assert.ok(fallback.message.length > 20 && !/_/.test(fallback.message));
});

test("W4-2: inceleme sürerken checkout ad/e-posta ÖN DOLDURMAZ (başkasının adresine bildirim gitmez)", () => {
  assert.equal(checkoutPrefillAllowed({ email_review: { required: true, email_masked: "a***@b.com" } }), false);
  assert.equal(checkoutPrefillAllowed({ email_review: { required: false } }), true);
  assert.equal(checkoutPrefillAllowed({} as never), true, "eski API → mevcut davranış");
  const wizard = readFileSync(join(process.cwd(), "components/checkout/CheckoutWizard.tsx"), "utf8");
  const effect = wizard.slice(wizard.indexOf('fetch("/api/account"'), wizard.indexOf('fetch("/api/account"') + 900);
  assert.ok(effect.indexOf("checkoutPrefillAllowed(account)") > -1, "ön doldurma kapısı var");
  assert.ok(effect.indexOf("checkoutPrefillAllowed(account)") < effect.indexOf("setSenderEmail"), "kapı e-posta doldurmadan ÖNCE");
});

test("W4-2: /api/auth/eposta-inceleme köprüsü çerezi ve gövdeyi iletir", () => {
  const route = readFileSync(join(process.cwd(), "app/api/auth/eposta-inceleme/route.ts"), "utf8");
  assert.match(route, /path: "\/api\/auth\/eposta-inceleme"/);
  assert.match(route, /cookie: true/);
  assert.match(route, /body: await request\.text\(\)/);
});
