// "150 TL Hoş Geldin" teklif alanı: görünürlük kuralları + kaynak korumaları.
// Çalıştır: node --test lib/welcomeTeaser.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WELCOME_TEASER_HIDDEN_PREFIXES,
  WELCOME_TEASER_SNOOZE_MS,
  memberFlagState,
  snoozeValue,
  teaserSitsAboveBuyBar,
  welcomeTeaserCopy,
  welcomeTeaserVisible,
  type WelcomeTeaserInput,
} from "./welcomeTeaser.ts";

const ROOT = join(import.meta.dirname, "..");
const BLOCKED = ["/checkout", "/sepet", "/odeme", "/siparis", "/hizli-siparis", "/e-posta-tercihleri"];
const base: WelcomeTeaserInput = {
  pathname: "/kategori/buketler",
  campaignActive: true,
  memberFlag: "none",
  sessionState: "guest",
  cookieDecided: true,
  overlayFree: true,
  isLocalePath: false,
  blockedPrefixes: BLOCKED,
};
const fmt = (m: number | null | undefined) => (typeof m === "number" ? `${m / 100} TL` : "");

test("görünür: kampanya açık, misafir, çerez kararı verilmiş, alışveriş sayfası", () => {
  assert.equal(welcomeTeaserVisible(base), true);
  assert.equal(welcomeTeaserVisible({ ...base, pathname: "/" }), true);
  assert.equal(welcomeTeaserVisible({ ...base, pathname: "/urun/kirmizi-gul" }), true);
  assert.equal(welcomeTeaserVisible({ ...base, sessionState: "unknown" }), true, "oturum bilinmiyorsa misafir görünümü");
});

test("gizli: kampanya kapalı / üye / katılmış / ertelenmiş / çerez kararı yok / locale", () => {
  assert.equal(welcomeTeaserVisible({ ...base, campaignActive: false }), false);
  assert.equal(welcomeTeaserVisible({ ...base, sessionState: "member" }), false);
  assert.equal(welcomeTeaserVisible({ ...base, memberFlag: "joined" }), false);
  assert.equal(welcomeTeaserVisible({ ...base, memberFlag: "snoozed" }), false);
  assert.equal(welcomeTeaserVisible({ ...base, cookieDecided: false }), false);
  assert.equal(welcomeTeaserVisible({ ...base, isLocalePath: true }), false);
  assert.equal(welcomeTeaserVisible({ ...base, pathname: "" }), false);
});

test("gizli: ekranda başka bir pencere (teslimat adresi) açıkken", () => {
  assert.equal(welcomeTeaserVisible({ ...base, overlayFree: false }), false);
  // Pencere kapanınca teklif yeniden kullanılabilir.
  assert.equal(welcomeTeaserVisible({ ...base, overlayFree: true }), true);
});

test("gizli: ödeme/sepet/checkout ve üyelik formunun zaten olduğu sayfalar", () => {
  for (const p of ["/checkout", "/checkout/sonuc", "/sepet", "/odeme/guvenli", "/siparis-takibi", "/hizli-siparis", "/e-posta-tercihleri"]) {
    assert.equal(welcomeTeaserVisible({ ...base, pathname: p }), false, p);
  }
  for (const p of ["/giris", "/hesabim", "/sifre-belirle", "/sifremi-unuttum"]) {
    assert.equal(welcomeTeaserVisible({ ...base, pathname: p }), false, p);
  }
  assert.deepEqual([...WELCOME_TEASER_HIDDEN_PREFIXES], ["/giris", "/hesabim", "/sifre-belirle", "/sifremi-unuttum"]);
  // Önek taşması yok: "/girisimci-cicekleri" gibi bir sayfa gizlenmez.
  assert.equal(welcomeTeaserVisible({ ...base, pathname: "/girisimci-cicekleri" }), true);
});

test("cy_member değeri: joined / ileri tarihli erteleme / süresi dolmuş / bozuk", () => {
  const now = 1_700_000_000_000;
  assert.equal(memberFlagState("joined", now), "joined");
  assert.equal(memberFlagState(String(now + 1000), now), "snoozed");
  assert.equal(memberFlagState(String(now - 1000), now), "none");
  assert.equal(memberFlagState("bozuk", now), "none");
  assert.equal(memberFlagState(null, now), "none");
  assert.equal(snoozeValue(now), String(now + WELCOME_TEASER_SNOOZE_MS));
  assert.equal(WELCOME_TEASER_SNOOZE_MS, 24 * 60 * 60 * 1000);
});

test("metin yalnız sunucu alanlarından: tutar yoksa teklif alanı yok", () => {
  assert.deepEqual(welcomeTeaserCopy({ amount_minor: 15000, min_cart_total_minor: 50000, first_order_only: true }, fmt),
    { amount: "150 TL", condition: "500 TL ve üzeri ilk siparişte" });
  assert.deepEqual(welcomeTeaserCopy({ amount_minor: 15000, min_cart_total_minor: null, first_order_only: true }, fmt),
    { amount: "150 TL", condition: "İlk siparişinize özel" });
  assert.deepEqual(welcomeTeaserCopy({ amount_minor: 15000, min_cart_total_minor: 50000, first_order_only: false }, fmt),
    { amount: "150 TL", condition: "500 TL ve üzeri siparişlerde" });
  assert.equal(welcomeTeaserCopy({ amount_minor: null, min_cart_total_minor: 50000, first_order_only: true }, fmt), null);
  assert.equal(welcomeTeaserCopy(null, fmt), null);
});

test("ürün sayfasında mobil satın alma çubuğunun üstünde durur", () => {
  assert.equal(teaserSitsAboveBuyBar("/urun/kirmizi-gul"), true);
  assert.equal(teaserSitsAboveBuyBar("/kategori/buketler"), false);
  assert.equal(teaserSitsAboveBuyBar(undefined), false);
});

test("KAYNAK: panel yalnız müşteri dokununca açılır — süre/kaydırma ile kendiliğinden açılma YOK", () => {
  const src = readFileSync(join(ROOT, "components/consent/NewMemberPopup.tsx"), "utf8");
  assert.doesNotMatch(src, /addEventListener\("scroll"/, "kaydırma tetikleyicisi kalmamalı");
  assert.doesNotMatch(src, /setTimeout\(arm/, "süre tetikleyicisi kalmamalı");
  assert.doesNotMatch(src, /scroll_ratio|delay_ms/, "Admin gecikme/kaydırma ayarı paneli açmaz");
  // Tek açılış yolu teklif alanının düğmesi.
  assert.match(src, /onClick=\{openPanel\}/);
  assert.equal((src.match(/setVisible\(true\)/g) ?? []).length, 1, "paneli açan tek yer openPanel");
  // Erişilebilirlik: diyalog rolü, başlık bağlantısı, Esc ile kapanma, iç kaydırma.
  assert.match(src, /role="dialog"/);
  assert.match(src, /aria-modal="true"/);
  assert.match(src, /aria-labelledby="hosgeldin-panel-baslik"/);
  assert.match(src, /e\.key === "Escape"/);
  assert.match(src, /overscroll-contain/);
  // Büyük kahraman görseli kaldırıldı.
  assert.doesNotMatch(src, /image_url|unsplash/);
  // Kayıttan sonra müşteri bulunduğu sayfada kalır (başka sayfaya yönlendirme yok).
  assert.doesNotMatch(src, /window\.location\.href\s*=/);
});

test("KAYNAK: üyelik, KVKK ve isteğe bağlı pazarlama izni aynen korunur", () => {
  const src = readFileSync(join(ROOT, "components/consent/NewMemberPopup.tsx"), "utf8");
  assert.match(src, /registerMember\(\{ email: email\.trim\(\), password, kvkkOnay \}\)/);
  assert.match(src, /validateRegister\(\{ email, password, kvkkOnay \}\)/);
  assert.match(src, /const \[kvkkOnay, setKvkkOnay\] = useState\(false\)/, "KVKK işaretsiz başlar");
  assert.match(src, /const \[marketingTicked, setMarketingTicked\] = useState\(false\)/, "pazarlama izni işaretsiz başlar");
  assert.match(src, /marketingConfig\.text\.body/, "izin metninin tamamı gösterilir");
  assert.match(src, /fontSize: "16px"/, "izin metni en az 12 punto");
  assert.match(src, /href="\/kvkk"/);
  assert.match(src, /fetchWelcomeCoupon\(\)/, "kupon kodu sunucudan");
});

test("KAYNAK: uzun izin açıklaması kapalı başlar — AÇMAK İZİN VERMEK DEĞİLDİR", () => {
  const src = readFileSync(join(ROOT, "components/consent/NewMemberPopup.tsx"), "utf8");
  assert.match(src, /const \[marketingTextOpen, setMarketingTextOpen\] = useState\(false\)/, "metin kapalı başlar");
  assert.match(src, /setMarketingTextOpen\(false\)/, "her açılışta yine kapalı");
  // Açma düğmesi AYRI bir düğmedir ve yalnız görünürlüğü değiştirir.
  assert.match(src, /onClick=\{\(\) => setMarketingTextOpen\(\(open\) => !open\)\}/);
  assert.match(src, /aria-expanded=\{marketingTextOpen\}/);
  assert.match(src, /aria-controls="hosgeldin-izin-metni"/);
  assert.match(src, /"İzin metninin tamamını oku"/);
  assert.match(src, /\{marketingTextOpen && \(/, "tam metin yalnız açıkken çizilir");
  // Onay kutusu yalnız kendi onChange'i ile değişir: açma düğmesi kutuya dokunmaz.
  assert.equal((src.match(/setMarketingTicked\(/g) ?? []).length, 1, "kutuyu yalnız kendi onChange'i değiştirir");
  assert.match(src, /onChange=\{\(e\) => setMarketingTicked\(e\.target\.checked\)\}/);
});

test("KAYNAK: teslimat penceresi açıkken teklif alanı çizilmez, panel açılmaz", () => {
  const src = readFileSync(join(ROOT, "components/consent/NewMemberPopup.tsx"), "utf8");
  // Görünürlük kararı tek kaynaktan: ConsentManager'ın overlay kilidi.
  assert.match(src, /overlayBusy\("member"\)/);
  assert.match(src, /setOverlayFree\(!overlayBusy\("member"\)\)/);
  assert.match(src, /onOverlayChange\(refresh\)/, "kilit el değiştirince hemen güncellenir");
  assert.match(src, /const \[overlayFree, setOverlayFree\] = useState\(false\)/, "başlangıçta gösterme");
  assert.match(src, /overlayFree,/, "kural bu girdiyi alır");
  // İkinci kapı: kilit alınamıyorsa panel AÇILMAZ.
  assert.match(src, /if \(!acquireOverlay\("member"\)\) \{\s*\n\s*setOverlayFree\(false\);\s*\n\s*return;/);
  assert.equal((src.match(/setVisible\(true\)/g) ?? []).length, 1, "paneli açan tek yer openPanel");

  const cm = readFileSync(join(ROOT, "components/consent/ConsentManager.tsx"), "utf8");
  assert.match(cm, /export function overlayBusy\(exceptId\?: string\): boolean/);
  assert.match(cm, /export function onOverlayChange\(fn: \(\) => void\)/);
  // Kilit alınırken ve bırakılırken dinleyiciler haberdar edilir.
  assert.match(cm, /if \(yeni\) notifyOverlayChange\(\);/);
  assert.equal((cm.match(/notifyOverlayChange\(\)/g) ?? []).length, 4);
});

test("KAYNAK: panel kompakt — masaüstünde tam boy levha değil", () => {
  const src = readFileSync(join(ROOT, "components/consent/NewMemberPopup.tsx"), "utf8");
  assert.doesNotMatch(src, /sm:h-\[100dvh\]/, "masaüstünde tam ekran yükseklik yok");
  assert.match(src, /sm:w-\[372px\]/, "masaüstünde dar kart");
  assert.match(src, /sm:bottom-6 sm:right-6/, "sağ altta duran kart");
  // Mobilde panel KISA açılır; gerisi panelin içinde kaydırılır.
  assert.match(src, /max-h-\[max\(420px,60dvh\)\]/, "mobilde panel kısa açılır");
  assert.match(src, /min-h-0 flex-1 overflow-y-auto overscroll-contain/, "gövde kendi içinde kayar");
});
