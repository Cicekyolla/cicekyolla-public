// lib/globalSiparisYoluMetin.test.ts — Paket E: Global sipariş yolu metinleri (ADDITIVE).
// Çalıştırma: node --test lib/globalSiparisYoluMetin.test.ts
// Sepet / checkout / üst menü / e-bülten bandındaki görünen metinler sözlükten gelir;
// ödeme, teslimat ücreti ve sipariş mantığı bu paketin kapsamı dışındadır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import tr from "./i18n/dict/tr.ts";
import { GLOBAL_DICTS } from "./i18n/dicts.ts";
import { localizeBandLabel, type BandKey } from "./deliveryBandLabel.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

const NEW_KEYS = [
  "co.continueWithAddons", "co.favSaved", "co.favAdd", "co.emailPh", "co.addAddon", "co.dateTime", "co.gate.lead",
  "header.waOrder", "header.noResults", "header.viewAllOf", "header.explore",
  "news.eyebrow", "news.title", "news.desc", "news.email", "news.subscribe",
  "band.near", "band.mid", "band.far", "band.veryFar", "band.remote", "band.europe", "band.asia",
] as const;

test("yeni anahtarlar 14 sözlüğün hepsinde dolu; yer tutucular korunur", () => {
  const all = { tr, ...GLOBAL_DICTS } as Record<string, Record<string, string>>;
  assert.equal(Object.keys(all).length, 14);
  for (const [loc, d] of Object.entries(all)) {
    for (const k of NEW_KEYS) {
      assert.equal(typeof d[k], "string", `${loc}:${k}`);
      assert.ok(d[k].trim().length > 0, `${loc}:${k} boş`);
      const want = (tr[k].match(/\{\w+\}/g) ?? []).sort().join();
      assert.equal((d[k].match(/\{\w+\}/g) ?? []).sort().join(), want, `${loc}:${k} yer tutucu`);
    }
  }
});

test("TR metinleri eski sabit metinle birebir", () => {
  assert.equal(tr["co.continueWithAddons"], "Bunlarla Devam Et");
  assert.equal(tr["co.gate.lead"], "Ürününüz hazır. Şimdi siparişinizi birkaç adımda güvenle tamamlayacağız.");
  assert.equal(tr["header.viewAllOf"], "Tüm {name}'i Gör");
  assert.equal(tr["news.title"], "Özel Fırsatları Kaçırmayın");
  assert.equal(tr["co.dateTime"], "Tarih & Saat");
  // Yeniden kullanılan mevcut anahtarlar: TR değerleri eski sabit metinle aynı.
  assert.equal(tr["common.back"], "Geri");
  assert.equal(tr["common.continue"], "Devam Et");
  assert.equal(tr["common.total"], "Toplam");
  assert.equal(tr["common.edit"], "Düzenle");
  assert.equal(tr["common.decrease"], "Azalt");
  assert.equal(tr["co.phone"], "Telefon *");
  assert.equal(tr["co.email"], "E-posta *");
  assert.equal(tr["co.newDelivery"], "Yeni teslimat");
  assert.equal(tr["co.steps.delivery"], "Teslimat");
  assert.equal(tr["co.gate.deliveryType"], "Teslimat Tipi");
});

test("KAYNAK: CheckoutWizard görünen metinleri sözlükten", () => {
  const src = read("../components/checkout/CheckoutWizard.tsx");
  for (const bad of [
    "> Geri\n", '"Bunlarla Devam Et"', ': "Devam Et"', ">Yeni teslimat<", '"Favorilerde"', '"Favorilere ekle"',
    ">Telefon *<", ">E-posta *<", 'placeholder="ornek@eposta.com"', 'aria-label="Azalt"', "} ekle`",
    'label="Teslimat"', 'label="Tarih & Saat"', 'label="Teslimat Tipi"', ">Toplam<",
  ]) assert.ok(!src.includes(bad), `CheckoutWizard hâlâ sabit: ${bad}`);
  for (const good of ['t("co.continueWithAddons")', 't("co.dateTime")', 't("co.emailPh")', 't("co.addAddon", { name: a.name })']) {
    assert.ok(src.includes(good), good);
  }
});

test("KAYNAK: AccountGate, Header, e-bülten bandı sabit TR metin taşımaz", () => {
  const gate = read("../components/checkout/AccountGate.tsx");
  assert.ok(!gate.includes("/> Düzenle"));
  assert.ok(!gate.includes("Ürününüz hazır."));
  assert.ok(gate.includes('t("co.gate.lead")'));

  const header = read("../components/Header.tsx");
  for (const bad of ["WhatsApp ile Sipariş Ver", "Sonuç bulunamadı.", "'i Gör", "İncele <"]) {
    assert.ok(!header.includes(bad), `Header hâlâ sabit: ${bad}`);
  }

  const band = read("../components/MemberNewsletterBand.tsx");
  for (const bad of ["E-Bülten", "Özel Fırsatları", "Mevsimlik", "E-posta adresiniz", "Abone Ol"]) {
    assert.ok(!band.includes(bad), `MemberNewsletterBand hâlâ sabit: ${bad}`);
  }
  assert.ok(band.startsWith('"use client";'));
});

test("KAYNAK: Header sipariş takibi çalışan rotaya gider (/siparis-takip)", () => {
  const header = read("../components/Header.tsx");
  assert.ok(!header.includes('href="/siparis-takibi"'));
  assert.ok(header.includes('href="/siparis-takip"'));
  const cargo = read("../components/category/CargoCategoryExperience.tsx");
  assert.ok(!cargo.includes("/siparis-takibi?"));
  // Hedef sayfa ?tracking= parametresini okur.
  assert.ok(read("../app/siparis-takip/page.tsx").includes('params.get("tracking")'));
});

test("band adı: TR aynen; Global dilde bilinen band çevrilir, parantez korunur, bilinmeyen aynen", () => {
  const en = GLOBAL_DICTS.en as Record<string, string>;
  const tEn = (k: BandKey) => en[k];
  const tTr = (k: BandKey) => (tr as Record<string, string>)[k];
  assert.equal(localizeBandLabel("Yakın (Maltepe 0-7 km)", "tr", tTr), "Yakın (Maltepe 0-7 km)");
  assert.equal(localizeBandLabel("İstanbul - Çok Uzak (Maltepe 25-45 km)", "tr", tTr), "İstanbul - Çok Uzak (Maltepe 25-45 km)");
  assert.equal(localizeBandLabel("Yakın (Maltepe 0-7 km)", "en", tEn), "Near zone (Maltepe 0-7 km)");
  assert.equal(localizeBandLabel("İstanbul - Çok Uzak (Maltepe 25-45 km)", "en", tEn), "Very far zone (Maltepe 25-45 km)");
  assert.equal(localizeBandLabel("Uzak (Maltepe 15-25 km)", "en", tEn), "Far zone (Maltepe 15-25 km)");
  assert.equal(localizeBandLabel("Uzak Bölge Özel Araç (45-150 km)", "en", tEn), "Remote area · dedicated vehicle (45-150 km)");
  assert.equal(localizeBandLabel("Avrupa Yakası", "en", tEn), "European side");
  assert.equal(localizeBandLabel("Bilinmeyen Bant", "en", tEn), "Bilinmeyen Bant");
  // Zaten çevrilmiş geri dönüş etiketleri (aynı gün / kargo) dokunulmadan geçer.
  assert.equal(localizeBandLabel(en["co.deliverySameDayLine"], "en", tEn), en["co.deliverySameDayLine"]);
  assert.equal(localizeBandLabel("", "en", tEn), "");
});

test("KAYNAK: band adı yalnız görüntü katmanında çevrilir; ücret/kayıt mantığı aynı", () => {
  const fee = read("./deliveryFee.ts");
  assert.ok(fee.includes('const band = (d.band ?? "").replace(/^İstanbul\\s*-\\s*/i, "").trim();'));
  const planner = read("../components/product/DeliveryPlanner.tsx");
  assert.ok(planner.includes('localizeBandLabel(sd!.band.replace("İstanbul - ", ""), locale, t)'));
  assert.ok(planner.includes("band: result?.same_day.band,"), "seçime yazılan band değeri ham kalır");
});

test("güvence metni: iyzico 13 dilde anılmaz (canlıda kapalı), PayTR + 3-D Secure + TL kalır", async () => {
  const { ASSURANCE } = await import("./global/assuranceCopy.ts");
  for (const [l, c] of Object.entries(ASSURANCE)) {
    assert.ok(!/iyzico/i.test(c.pay[1]), `${l}`);
    assert.ok(c.pay[1].includes("PayTR") && c.pay[1].includes("3-D Secure"), `${l}`);
  }
});
