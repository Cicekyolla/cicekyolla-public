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

test("kaydırma TEK SEFERLİK DEĞİL — sayfa büyürken hedef kaçmasın", () => {
  // Canlıda tek seferlik rAF ile scrollY 0 kalıyordu: bölüm hidrasyondan sonra
  // oluşuyor ve üstteki görseller yüklendikçe konum kayıyor.
  assert.match(SRC, /\[0, 250, 700, 1400\]\.map\(\(ms\) => window\.setTimeout\(git, ms\)\)/);
  assert.equal(/requestAnimationFrame/.test(SRC), false, "tek kare yetmiyor");
});

test("müşteri kendi kaydırırsa denemeler DURUR (kullanıcıyı ezme)", () => {
  assert.match(SRC, /addEventListener\("wheel", iptal/);
  assert.match(SRC, /addEventListener\("touchstart", iptal/);
  assert.match(SRC, /zamanlayicilar\.forEach\(clearTimeout\)/);
});

test("effect temizlik döndürür — zamanlayıcı ve dinleyici sızmaz", () => {
  assert.match(SRC, /return \(\) => \{ zamanlayicilar\.forEach\(clearTimeout\); birak\(\); \};/);
  assert.match(SRC, /removeEventListener\("wheel", iptal\)/);
  assert.match(SRC, /removeEventListener\("touchstart", iptal\)/);
});

test("bozuk URL yorum akışını kırmaz (try/catch)", () => {
  // Uzunluk penceresine dayanan regex kırılgandı; konum karşılaştırması yapıyoruz:
  // try { … new URL(…) … } catch { sırası korunmalı.
  const tryIdx = SRC.indexOf("try {");
  const urlIdx = SRC.indexOf("new URL(window.location.href)");
  const catchIdx = SRC.indexOf("} catch {", urlIdx);
  assert.ok(tryIdx > -1 && urlIdx > tryIdx, "URL ayrıştırma try içinde olmalı");
  assert.ok(catchIdx > urlIdx, "ardından catch gelmeli");
  // catch sessizce yutar: sayfa kırılmaz, yorum akışı jetonsuz sürer.
  assert.match(SRC.slice(catchIdx, catchIdx + 200), /Bozuk URL sayfayı ASLA kırmaz/);
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
