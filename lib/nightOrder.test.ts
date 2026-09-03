import test from "node:test";
import assert from "node:assert/strict";
import { GECE_SIPARIS, nightOrderWhatsAppHref } from "./nightOrder.ts";

const TABAN = "https://wa.me/905458813450";

test("hazır mesaj operatörün kesinleştirdiği metindir ve saat/garanti vaadi içermez", () => {
  assert.equal(
    GECE_SIPARIS.hazirMesaj,
    "Merhaba, gece çiçek teslimatı hakkında bilgi almak istiyorum. İstediğim teslimat saati:",
  );
  for (const v of Object.values(GECE_SIPARIS)) {
    assert.doesNotMatch(v, /\d{1,2}:\d{2}|garanti|dakika|90 dk|ücretsiz/i, v);
  }
  assert.equal(GECE_SIPARIS.cta, "WhatsApp'tan Bilgi Al");
  assert.equal(GECE_SIPARIS.baslik, "Gece Çiçek Siparişi");
});

test("wa.me bağlantısı hazır mesajı text parametresi olarak taşır, numara değişmez", () => {
  const href = nightOrderWhatsAppHref(TABAN);
  const u = new URL(href);
  assert.equal(u.origin + u.pathname, TABAN);
  assert.equal(u.searchParams.get("text"), GECE_SIPARIS.hazirMesaj);
  // Mesaj tek satır: WhatsApp hazır metinde ilk satırdan sonrasını düşürüyor (27 Ağu bulgusu).
  assert.doesNotMatch(GECE_SIPARIS.hazirMesaj, /\n/);
});
