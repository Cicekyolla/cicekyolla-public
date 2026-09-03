import test from "node:test";
import assert from "node:assert/strict";
import {
  DESTINATION_ROOTS, DESTINATION_ROOT, isDestinationRoot, isSameDayDestination, parseLocalePath, GLOBAL_LOCALES,
} from "./global/config.ts";
import { parseLocationKey } from "./global/locationKey.ts";
import { CARGO, CARGO_COLLECTION_PATH } from "./global/cargoCopy.ts";
import { CITY_NAMES, cityDisplayName, ilceBasligi, mahalleBasligi } from "./global/locationLabels.ts";

/**
 * GLOBAL GENİŞLEME (3 Eyl 2026): Antalya + Muğla + İzmir, İstanbul mimarisiyle.
 * Bu test dosyası dört kanunu nöbet tutar:
 *  1) destinasyon kapısı yalnız 4 şehir (bilinmeyen şehir 404),
 *  2) İstanbul davranışı birebir korunur (regresyon),
 *  3) kargo şehirlerinde aynı gün / saat / 90 dk / gece vaadi YOK,
 *  4) 13 dilde şehir eksonimleri ve etiketler tam.
 */

test("destinasyon kökleri: İstanbul + Antalya + Muğla + İzmir; başka şehir yok", () => {
  assert.deepEqual([...DESTINATION_ROOTS], ["istanbul", "antalya", "mugla", "izmir"]);
  assert.equal(DESTINATION_ROOT, "istanbul");
  for (const c of DESTINATION_ROOTS) assert.equal(isDestinationRoot(c), true);
  for (const c of ["ankara", "bursa", "Antalya", "", "antalya/", 34, null]) assert.equal(isDestinationRoot(c), false, String(c));
});

test("parseLocalePath: üç yeni şehir il/ilçe/mahalle derinliğinde tanınır; derinlik 3, küçük harf", () => {
  assert.deepEqual(parseLocalePath("de", ["antalya"]), { kind: "page", key: "antalya" });
  assert.deepEqual(parseLocalePath("ru", ["antalya", "alanya"]), { kind: "page", key: "antalya/alanya" });
  assert.deepEqual(parseLocalePath("en", ["mugla", "bodrum", "yalikavak"]), { kind: "page", key: "mugla/bodrum/yalikavak" });
  assert.deepEqual(parseLocalePath("fr", ["izmir", "konak", "alsancak"]), { kind: "page", key: "izmir/konak/alsancak" });
  assert.equal(parseLocalePath("de", ["antalya", "alanya", "x", "y"]).kind, "unknown");
  assert.equal(parseLocalePath("de", ["Antalya"]).kind, "unknown");
  assert.equal(parseLocalePath("de", ["ankara", "cankaya"]).kind, "unknown", "Ankara kurul kararı olmadan açılmaz");
  assert.equal(parseLocalePath("de", ["muğla"]).kind, "unknown", "slug ASCII olmalı");
});

test("İSTANBUL REGRESYONU: eski davranış birebir", () => {
  assert.deepEqual(parseLocalePath("de", ["istanbul"]), { kind: "page", key: "istanbul" });
  assert.deepEqual(parseLocalePath("en", ["istanbul", "kadikoy", "moda"]), { kind: "page", key: "istanbul/kadikoy/moda" });
  assert.deepEqual(parseLocationKey("istanbul/kadikoy"), { kind: "district", city: "istanbul", district: "kadikoy" });
  assert.equal(isSameDayDestination("istanbul"), true);
  assert.equal(ilceBasligi("en"), "Districts of Istanbul");
  assert.equal(ilceBasligi("az"), "İstanbulun rayonları");
  assert.equal(ilceBasligi("ru"), "Районы Стамбула");
  assert.equal(ilceBasligi("fr"), "Arrondissements d'Istanbul");
});

test("parseLocationKey: yeni şehirler hiyerarşiyle çözülür, yanlış kök null", () => {
  assert.deepEqual(parseLocationKey("antalya"), { kind: "city", city: "antalya" });
  assert.deepEqual(parseLocationKey("mugla/bodrum"), { kind: "district", city: "mugla", district: "bodrum" });
  assert.deepEqual(parseLocationKey("izmir/konak/alsancak"), { kind: "neighborhood", city: "izmir", district: "konak", neighborhood: "alsancak" });
  assert.equal(parseLocationKey("ankara/cankaya"), null);
  assert.equal(parseLocationKey("home"), null);
});

test("teslimat gerçeği: yalnız İstanbul aynı gün; üç şehir kargo destinasyonu", () => {
  for (const c of ["antalya", "mugla", "izmir"]) assert.equal(isSameDayDestination(c), false, c);
});

const VAAT_YASAK = [
  /same.?day|taggleich|le jour même|dezelfde dag|in giornata|mismo día|mesmo dia|eyni gün|в тот же день|نفس اليوم|当天|当日|당일/i,
  /90 ?(min|dak|dk|минут)|\b90\b/i,
  /\d{1,2}[:.]\d{2}/,
  /night|nacht|nuit|nacht|notte|noche|noite|gecə|ноч|ليل|夜|밤/i,
  /istanbul|стамбул|إسطنبول|伊斯坦布尔|イスタンブール|이스탄불/i, // kargo şeridinde İstanbul geçmez (şehir kirliliği)
];

test("KARGO KOPYASI (13 dil): aynı gün / saat / 90 dk / gece / İstanbul kirliliği yok; şehir adı doldurulur", () => {
  for (const l of GLOBAL_LOCALES) {
    const c = CARGO[l];
    const sample = cityDisplayName(l, "antalya");
    const metin = [...c.trust(sample).flat(), c.catalogTitle(sample), c.catalogNote, c.cta, c.empty(sample)].join(" | ");
    for (const re of VAAT_YASAK) assert.doesNotMatch(metin, re, `${l}: ${metin}`);
    assert.equal(c.trust(sample).length, 4, `${l}: 4 güven maddesi`);
    assert.ok(metin.includes(sample), `${l}: şehir adı geçmeli`);
    assert.doesNotMatch(metin, /\{|\}|undefined|null/, `${l}: yer tutucu/artefakt`);
    // 1–3 iş günü gerçeği her dilde geçer (rakam olarak; FR "1 à 3", JA "1〜3", diğerleri "1–3")
    assert.match(c.catalogNote, /1\s*(?:[–\-〜~]|à)\s*3/, `${l}: 1–3 iş günü notu`);
  }
  assert.equal(CARGO_COLLECTION_PATH, "/kategori/turkiye-geneli-kargo");
});

test("şehir eksonimleri 13 dil × 4 şehir tam; ilçe/mahalle başlıkları şehir-parametrik", () => {
  for (const l of GLOBAL_LOCALES) {
    for (const c of DESTINATION_ROOTS) {
      assert.ok(CITY_NAMES[l][c] && CITY_NAMES[l][c].trim().length > 1, `${l}/${c}`);
      const t = ilceBasligi(l, c);
      assert.ok(t.length > 3 && !/undefined/.test(t), `${l}/${c}: ${t}`);
    }
    assert.ok(mahalleBasligi(l, "Alanya").includes("Alanya"), l);
  }
  assert.equal(ilceBasligi("es", "izmir"), "Distritos de Esmirna");
  assert.equal(ilceBasligi("ru", "antalya"), "Районы Антальи");
  assert.equal(ilceBasligi("fr", "izmir"), "Arrondissements d'Izmir");
  assert.equal(ilceBasligi("fr", "mugla"), "Arrondissements de Muğla");
  assert.equal(cityDisplayName("de", "bilinmeyen"), "Bilinmeyen");
});
