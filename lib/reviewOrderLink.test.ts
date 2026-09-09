import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* --------------------------------------------------------------------------
 * Yorumu siparişe bağlayan davet linki — vitrin tarafı.
 *
 * WhatsApp daveti şu adrese gelir:
 *   /urun/<slug>?y=<imzalı jeton>#yorum-yaz
 *
 * Kanıtlanan sözleşme:
 *   • Jeton POST gövdesine `order_token` olarak konur — HAM sipariş kimliği
 *     ASLA gönderilmez (sahte "doğrulanmış alışveriş" imkânsız).
 *   • #yorum-yaz ile gelen müşteri forma iner ve form AÇIK gelir: ürün sayfası
 *     ~12.000 px, "Yorum Yaz" düğmesi ~4.200 px aşağıdaydı; çıpasız link
 *     müşteriyi tepeye bırakıyordu (canlıda ölçüldü).
 *   • Bozuk URL yorum akışını KIRMAZ.
 * ------------------------------------------------------------------------ */

const SRC = readFileSync(join(process.cwd(), "components/product/ProductReviews.tsx"), "utf8");

test("jeton URL'den okunur ve POST gövdesine order_token olarak konur", () => {
  assert.match(SRC, /url\.searchParams\.get\("y"\)/);
  assert.match(SRC, /order_token: orderToken/);
});

test("HAM sipariş kimliği gönderilmez", () => {
  assert.equal(/order_id\s*:/.test(SRC), false, "order_id gövdeye sızmamalı");
});

test("jeton ekranda gösterilmez (yalnız gövdede taşınır)", () => {
  // Değer JSX içinde basılmamalı: {orderToken} gibi bir kullanım olmamalı.
  assert.equal(/\{\s*orderToken\s*\}/.test(SRC), false);
});

test("#yorum-yaz: bölüme kaydırır ve formu açar", () => {
  assert.match(SRC, /id="yorum-yaz"/);
  assert.match(SRC, /url\.hash === "#yorum-yaz"/);
  assert.match(SRC, /setOpen\(true\)/);
  assert.match(SRC, /scrollIntoView\(/);
  // Sabit başlığın altında kalmasın.
  assert.match(SRC, /scroll-mt-\d+/);
});

test("bozuk URL yorum akışını kırmaz (try/catch)", () => {
  const blok = SRC.slice(SRC.indexOf("const url = new URL"), SRC.indexOf("}, []);"));
  assert.ok(blok.length > 0);
  assert.match(SRC, /try \{[\s\S]{0,400}new URL\(window\.location\.href\)[\s\S]{0,600}\} catch \{/);
});

test("jeton yoksa akış bugünküyle aynı: order_token null gider", () => {
  assert.match(SRC, /useState<string \| null>\(null\)/);
  // Gönderim jetonun varlığına BAĞLI DEĞİL — koşullu erken dönüş yok.
  const submit = SRC.slice(SRC.indexOf("const submit = async"));
  assert.equal(/if \(!orderToken\)/.test(submit), false, "jetonsuz yorum da gönderilebilmeli");
});

test("doğrulanmış alışveriş rozeti hâlâ sunucudan gelen alana bakar", () => {
  assert.match(SRC, /r\.is_verified_purchase/);
});
