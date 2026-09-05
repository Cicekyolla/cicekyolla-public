// productWaMessage.test.ts — çalıştırma: node --test lib/productWaMessage.test.ts
//
// Siteden WhatsApp'a giden ürün mesajı, ürün bağlantısını DAİMA taşımalı.
//
// CANLI KUSUR (5 Eyl 2026): mesaj `window.location.href` ile kuruluyordu.
// Sunucu render'ında `window` yoktur → URL kısmı BOŞ kalıyordu; müşteri
// hidrasyondan önce dokununca mesaj LİNKSİZ gidiyordu ve operatör hangi ürün
// olduğunu açamıyordu. Gerçek sohbette iki mesajla doğrulandı.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../components/product/ProductDetail.tsx", import.meta.url), "utf8");

test("KAYNAK: hazır mesaj window.location.href KULLANMAZ", () => {
  const i = SRC.indexOf("const waText = encodeURIComponent(");
  assert.ok(i > 0, "hazır mesaj üretimi bulunmalı");
  const blok = SRC.slice(i, i + 400);
  assert.ok(
    !blok.includes("window.location.href"),
    "SSR'da boş kalan window.location.href geri gelmemeli:\n" + blok,
  );
});

test("KAYNAK: bağlantı ürünün KANONİK adresinden üretilir", () => {
  assert.match(
    SRC,
    /const waProductUrl = absoluteUrl\(canonicalPath \?\? `\/urun\/\$\{product\.slug\}`\);/,
    "kanonik URL üretimi olmalı (TR varsayılanı /urun/<slug>)",
  );
  assert.match(SRC, /\$\{waProductUrl\}`/, "hazır mesaj kanonik URL'i taşımalı");
  assert.match(SRC, /import \{ absoluteUrl \} from "@\/lib\/site-config";/, "absoluteUrl içe aktarılmalı");
});

test("KAYNAK: locale vitrinleri kendi PDP yolunu geçebilir", () => {
  assert.match(SRC, /canonicalPath\?: string;/, "prop tanımlı olmalı");
  const GLOBAL = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.match(
    GLOBAL,
    /canonicalPath=\{`\/\$\{locale\}\/\$\{seg\.product\}\/\$\{parsed\.slug\}`\}/,
    "global vitrin locale PDP yolunu geçmeli (TR adresine düşmemeli)",
  );
});

test("BİÇİM: mesaj metni DEĞİŞMEDİ (yalnız adres kaynağı değişti)", () => {
  assert.match(
    SRC,
    /`Merhaba, "\$\{product\.name\}" ürününü sipariş vermek istiyorum\. \$\{waProductUrl\}`/,
    "operatörün alıştığı mesaj biçimi korunmalı",
  );
});
