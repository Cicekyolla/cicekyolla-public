import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTelegram, TELEGRAM_FALLBACK, TELEGRAM_LABELS, telegramLocale } from "./telegramContact.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

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

test("kablolama: layout tek kaynaktan çizer, ChromeGate DIŞINDA (13 dilde de görünür); WhatsApp korunur", () => {
  const layout = src("../app/layout.tsx");
  assert.match(layout, /resolveTelegram\(heroConfig\)/);
  assert.match(layout, /<TelegramButton \{\.\.\.telegram\} \/>/);
  assert.doesNotMatch(layout, /<ChromeGate><TelegramButton/);
  assert.match(layout, /<ChromeGate><WhatsAppButton \/><\/ChromeGate>/);
});
