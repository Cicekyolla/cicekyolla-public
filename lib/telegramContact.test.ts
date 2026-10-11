import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTelegram, TELEGRAM_FALLBACK, TELEGRAM_LABELS, telegramLocale, isProductPagePath, GLOBAL_WHATSAPP_URL, WHATSAPP_FLOAT_LABELS } from "./telegramContact.ts";
import { GLOBAL_LOCALES, SEGMENTS } from "./global/config.ts";

const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("Admin alanı yoksa yedek @cicekyolla, aktif", () => {
  assert.deepEqual(resolveTelegram(null), { enabled: true, username: "cicekyolla", url: "https://t.me/cicekyolla" });
  assert.deepEqual(resolveTelegram({}), { enabled: true, ...TELEGRAM_FALLBACK });
});

test("Admin'de değişen bağlantı / kullanıcı adı public'e yansır", () => {
  assert.equal(resolveTelegram({ telegram_url: "https://t.me/yeni_hesap" }).url, "https://t.me/yeni_hesap");
  assert.equal(resolveTelegram({ telegram_username: "@baska_hesap" }).url, "https://t.me/baska_hesap");
  assert.equal(resolveTelegram({ telegram_username: "baska_hesap" }).username, "baska_hesap");
  // bağlantı kullanıcı adından önce gelir
  assert.equal(resolveTelegram({ telegram_username: "@aaaaa1", telegram_url: "https://telegram.me/bbbbb2/" }).url, "https://t.me/bbbbb2");
});

test("aktif/pasif: yalnız açık false pasifler", () => {
  assert.equal(resolveTelegram({ telegram_enabled: false }).enabled, false);
  assert.equal(resolveTelegram({ telegram_enabled: true }).enabled, true);
  assert.equal(resolveTelegram({ telegram_enabled: "false" }).enabled, true);
});

test("bozuk/yabancı bağlantı yayına çıkmaz → yedek", () => {
  assert.equal(resolveTelegram({ telegram_url: "https://evil.example/cicekyolla" }).url, TELEGRAM_FALLBACK.url);
  assert.equal(resolveTelegram({ telegram_url: "javascript:alert(1)" }).url, TELEGRAM_FALLBACK.url);
  assert.equal(resolveTelegram({ telegram_username: "a b" }).url, TELEGRAM_FALLBACK.url);
});

test("TR + 13 Global dilin hepsinde dil uygun erişilebilir ad var; bağlantı dile göre değişmez", () => {
  for (const l of ["tr", ...GLOBAL_LOCALES]) {
    assert.ok(TELEGRAM_LABELS[l]?.aria.includes("ÇiçekYolla"), l);
    assert.equal(telegramLocale(l === "tr" ? "/" : `/${l}/product/x`), l);
  }
  assert.equal(telegramLocale("/urun/gul"), "tr");
  assert.equal(telegramLocale("/kategori/cicekler"), "tr");
  assert.equal(telegramLocale(null), "tr");
});

test("kablolama: layout tek kaynaktan çizer; WhatsApp + Telegram ChromeGate DIŞINDA (TR + 13 dilde görünür)", () => {
  const layout = src("../app/layout.tsx");
  assert.match(layout, /resolveTelegram\(heroConfig\)/);
  assert.match(layout, /<TelegramButton \{\.\.\.telegram\} \/>/);
  assert.match(layout, /\n\s*<WhatsAppButton \/>\n/);
  assert.doesNotMatch(layout, /<ChromeGate><TelegramButton/);
  assert.doesNotMatch(layout, /<ChromeGate><WhatsAppButton/);
});

test("WhatsApp korunur: TR bağlantısı/etiketi AYNEN; Global bağlantı vitrinin mevcut WHATSAPP_URL'i; numara tek", async () => {
  const wa = src("../components/WhatsAppButton.tsx");
  assert.ok(wa.includes('"https://wa.me/905458813450?text=Merhaba%2C%20sipari%C5%9F%20vermek%20istiyorum"'), "TR bağlantısı değişmedi");
  assert.ok(wa.includes('"WhatsApp ile sipariş ver"') && wa.includes('"Sipariş Ver"'), "TR etiketleri değişmedi");
  assert.match(wa, /isProductPagePath\(pathname\)\) return null/, "ürün sayfasında WA sticky çubukta/panelde kalır (ikinci akış yok)");
  const view = src("./global/v80/view.ts");
  assert.ok(view.includes(`export const WHATSAPP_URL = "${GLOBAL_WHATSAPP_URL}";`), "Global bağlantı vitrinle birebir");
  const pdp = src("../components/product/ProductDetail.tsx");
  assert.ok(pdp.includes('const WHATSAPP = "905458813450";'), "aynı numara");
  for (const l of GLOBAL_LOCALES) assert.ok(WHATSAPP_FLOAT_LABELS[l]?.aria.includes("ÇiçekYolla"), l);
});

test("yerleşim: ürün dışı sayfalarda Telegram WhatsApp'ın ÜSTÜNDE; ürün sayfasında sticky çubuğun ÜSTÜNDE", () => {
  const tg = src("../components/TelegramButton.tsx");
  assert.match(tg, /isProductPagePath\(pathname\)\s*\?\s*"bottom-\[calc\(84px\+env\(safe-area-inset-bottom\)\)\] lg:bottom-6"\s*:\s*"bottom-\[84px\] lg:bottom-\[92px\]"/);
  assert.match(src("../components/WhatsAppButton.tsx"), /fixed bottom-6 right-6 z-50/);
});

test("ürün sayfası tespiti: TR /urun/ + 13 dilin ürün yolu (sticky Sipariş Ver çubuğunun üstüne çıkmak için)", () => {
  assert.equal(isProductPagePath("/urun/beyaz-zarafet-orkide-aranjmani"), true);
  for (const l of GLOBAL_LOCALES) {
    assert.equal(isProductPagePath(`/${l}/${SEGMENTS[l].product}/101-red-rose-bouquet`), true, l);
    assert.equal(isProductPagePath(`/${l}/${SEGMENTS[l].category}/roses`), false, l);
    assert.equal(isProductPagePath(`/${l}`), false, l);
  }
  assert.equal(isProductPagePath("/en/istanbul"), false);
  assert.equal(isProductPagePath("/"), false);
  assert.equal(isProductPagePath("/kategori/cicekler"), false);
  assert.equal(isProductPagePath("/sepet"), false);
  assert.equal(isProductPagePath(null), false);
});

test("açık pencere (çerez/teslimat/üye) varken iki buton da çizilmez — mevcut tek overlay kilidi", () => {
  const hook = src("../components/useOverlayBusy.ts");
  assert.match(hook, /onOverlayChange\(refresh\)/);
  assert.match(hook, /overlayBusy\(\)/);
  for (const f of ["../components/WhatsAppButton.tsx", "../components/TelegramButton.tsx"]) {
    const c = src(f);
    assert.match(c, /useOverlayBusy\(\)/, f);
    assert.match(c, /if \(overlayOpen\) return null;/, f);
  }
});
