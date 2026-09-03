import test from "node:test";
import assert from "node:assert/strict";

/* --------------------------------------------------------------------------
 * pendingDelivery.ts tarayıcı depolarına dokunur. Node test koşucusunda DOM
 * yoktur; bu yüzden modül YÜKLENMEDEN ÖNCE asgari bir `window` taklidi kurulur.
 * Amaç gerçek davranışı ölçmek: adres hatırlanıyor mu, bayat kayıt güvenli
 * biçimde düşüyor mu, slot/tarih ASLA aynalanıyor mu.
 * ------------------------------------------------------------------------ */

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string): void { this.map.set(k, String(v)); }
  removeItem(k: string): void { this.map.delete(k); }
  clear(): void { this.map.clear(); }
}

const sessionStorage = new MemoryStorage();
const localStorage = new MemoryStorage();
const events: string[] = [];

(globalThis as unknown as { window: unknown }).window = {
  sessionStorage,
  localStorage,
  dispatchEvent: (e: { type: string }) => { events.push(e.type); return true; },
};
(globalThis as unknown as { CustomEvent: unknown }).CustomEvent =
  class { type: string; constructor(type: string) { this.type = type; } };

const {
  savePendingDelivery,
  savePendingAddress,
  readPendingDelivery,
  readRememberedAddress,
  forgetRememberedAddress,
  clearPendingDelivery,
  clearPendingSelection,
  hasPendingAddress,
} = await import("./pendingDelivery.ts");

const ADDR = {
  formattedAddress: "Bağlarbaşı Mah. Maltepe/İstanbul",
  placeId: "place-1",
  placeName: null,
  lat: 40.93,
  lng: 29.15,
  il: "İstanbul",
  ilce: "Maltepe",
  mahalle: "Bağlarbaşı",
};

function reset(): void {
  sessionStorage.clear();
  localStorage.clear();
  events.length = 0;
}

test("adres seçilince hem oturuma hem kalıcı hafızaya yazılır", () => {
  reset();
  savePendingAddress(ADDR);
  const remembered = readRememberedAddress();
  assert.ok(remembered, "kalıcı adres yazılmalı");
  assert.equal(remembered!.district, "Maltepe");
  assert.equal(remembered!.city, "İstanbul");
  assert.equal(remembered!.neighborhood, "Bağlarbaşı");
  assert.ok(hasPendingAddress(remembered));
});

test("oturum kaydı yokken bile adres hatırlanır (yeni sekme / geri dönen ziyaretçi)", () => {
  reset();
  savePendingAddress(ADDR);
  sessionStorage.clear(); // yeni sekme
  const p = readPendingDelivery();
  assert.ok(p, "adres hatırlanmalı");
  assert.equal(p!.district, "Maltepe");
});

test("kalıcı hafızada SLOT/TARİH/ÜRÜN tutulmaz — yalnız adres", () => {
  reset();
  savePendingDelivery({
    ...{ address: ADDR.formattedAddress, lat: ADDR.lat, lng: ADDR.lng, city: "İstanbul", district: "Maltepe" },
    date: "2026-09-04",
    slotId: 7,
    slotLabel: "09:00–12:00",
    slotEnd: "12:00:00",
    mode: "sameday",
    productSlug: "kirmizi-gul",
  });
  const remembered = readRememberedAddress();
  assert.ok(remembered);
  assert.equal(remembered!.date, undefined, "tarih aynalanmamalı");
  assert.equal(remembered!.slotId, undefined, "slot aynalanmamalı");
  assert.equal(remembered!.mode, undefined, "mod aynalanmamalı");
  assert.equal(remembered!.productSlug, undefined, "ürün aynalanmamalı");
  assert.equal(remembered!.address, ADDR.formattedAddress);
});

test("2 saatten eski oturum seçimi düşer ama adres ayakta kalır", () => {
  reset();
  savePendingAddress(ADDR);
  // Oturum kaydını elle bayatlat (3 saat önce), tarih/slot içersin.
  sessionStorage.setItem("cy_pending_delivery", JSON.stringify({
    address: ADDR.formattedAddress, lat: ADDR.lat, lng: ADDR.lng,
    date: "2026-01-01", slotId: 3, ts: Date.now() - 3 * 60 * 60 * 1000,
  }));
  const p = readPendingDelivery();
  assert.ok(p, "adres hâlâ okunmalı");
  assert.equal(p!.date, undefined, "bayat SEÇİM taşınmaz");
  assert.equal(p!.address, ADDR.formattedAddress);
});

test("30 günden eski kalıcı kayıt güvenle düşer ve temizlenir", () => {
  reset();
  localStorage.setItem("cy_delivery_address_v1", JSON.stringify({
    address: ADDR.formattedAddress, lat: ADDR.lat, lng: ADDR.lng,
    city: "İstanbul", district: "Maltepe", ts: Date.now() - 31 * 24 * 60 * 60 * 1000, version: 2,
  }));
  assert.equal(readRememberedAddress(), null);
  assert.equal(localStorage.getItem("cy_delivery_address_v1"), null, "bayat kayıt silinir");
});

test("koordinatı geçersiz kayıt kabul edilmez (güvenli fallback)", () => {
  reset();
  localStorage.setItem("cy_delivery_address_v1", JSON.stringify({
    address: "Bir yer", lat: null, lng: null, ts: Date.now(), version: 2,
  }));
  assert.equal(readRememberedAddress(), null);
  assert.equal(localStorage.getItem("cy_delivery_address_v1"), null);
});

test("bozuk JSON çökertmez", () => {
  reset();
  localStorage.setItem("cy_delivery_address_v1", "{bozuk");
  assert.equal(readRememberedAddress(), null);
  sessionStorage.setItem("cy_pending_delivery", "{bozuk");
  assert.equal(readPendingDelivery(), null);
});

test("sipariş sonrası clearPendingDelivery adresi UNUTTURMAZ", () => {
  reset();
  savePendingAddress(ADDR);
  clearPendingDelivery();
  assert.equal(sessionStorage.getItem("cy_pending_delivery"), null);
  assert.ok(readRememberedAddress(), "adres hatırlanmaya devam eder");
});

test("forgetRememberedAddress adresi tamamen unutur ve olay yayınlar", () => {
  reset();
  savePendingAddress(ADDR);
  forgetRememberedAddress();
  assert.equal(readRememberedAddress(), null);
  assert.ok(events.includes("cy:pending-address"));
});

test("clearPendingSelection: slot/tarih düşer, adres korunur", () => {
  reset();
  savePendingDelivery({
    address: ADDR.formattedAddress, lat: ADDR.lat, lng: ADDR.lng,
    city: "İstanbul", district: "Maltepe", date: "2026-09-04", slotId: 7, mode: "sameday",
  });
  clearPendingSelection();
  const p = readPendingDelivery();
  assert.ok(p);
  assert.equal(p!.date, undefined);
  assert.equal(p!.slotId, undefined);
  assert.equal(p!.address, ADDR.formattedAddress);
});
