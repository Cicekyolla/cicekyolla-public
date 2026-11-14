// lib/deliveryFacts.test.ts — teslimat bilgi notu + İstanbul yaka kuralı (14 Kas 2026, ADDITIVE).
// Çalıştırma: node --test lib/deliveryFacts.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ANADOLU_ILCELERI, AVRUPA_ILCELERI, YAKA_KURALI, yakaBilgisi, yakaOf } from "./istanbulYakaKurali.ts";
import { KOMSU_ILCELER } from "./istanbulKomsuIlceler.ts";

test("işletme kuralı: Anadolu 18:00 / Avrupa 17:00 son sipariş, ikisinde de son teslimat 22:00", () => {
  assert.deepEqual(YAKA_KURALI.anadolu, { siparisSonSaat: "18:00", teslimatSonSaat: "22:00" });
  assert.deepEqual(YAKA_KURALI.avrupa, { siparisSonSaat: "17:00", teslimatSonSaat: "22:00" });
});

test("39 ilçe: 14 Anadolu + 25 Avrupa, kesişim yok, İstanbul ilçe listesiyle birebir", () => {
  assert.equal(ANADOLU_ILCELERI.size, 14);
  assert.equal(AVRUPA_ILCELERI.size, 25);
  for (const d of ANADOLU_ILCELERI) assert.ok(!AVRUPA_ILCELERI.has(d), d);
  const hepsi = new Set([...ANADOLU_ILCELERI, ...AVRUPA_ILCELERI]);
  assert.deepEqual([...hepsi].sort(), Object.keys(KOMSU_ILCELER).sort());
  assert.equal(yakaOf("kadikoy"), "anadolu");
  assert.equal(yakaOf("besiktas"), "avrupa");
  assert.equal(yakaOf("ankara"), null);
});

test("kural yalnız motor 'in' ve motor saati kuraldan erken değilse gösterilir (14 Kas canlı motor değerleri)", () => {
  // Kadıköy motor 19:00 → kural 18:00 gösterilir (motor daha geç açık; vaat ödemede tutulur)
  assert.deepEqual(yakaBilgisi("kadikoy", { reach: "in", cutoff_time: "19:00:00" }), { yaka: "anadolu", siparisSonSaat: "18:00", teslimatSonSaat: "22:00" });
  // Beşiktaş motor 18:00 → Avrupa 17:00
  assert.equal(yakaBilgisi("besiktas", { reach: "in", cutoff_time: "18:00:00" })!.siparisSonSaat, "17:00");
  // Şişli motor 17:00 = kural 17:00 → gösterilir
  assert.equal(yakaBilgisi("sisli", { reach: "in", cutoff_time: "17:00:00" })!.siparisSonSaat, "17:00");
  // Beykoz motor 17:00 < Anadolu 18:00 → YANLIŞ VAAT olur → gösterilmez
  assert.equal(yakaBilgisi("beykoz", { reach: "in", cutoff_time: "17:00:00" }), null);
});

test("uzak / özel araç / karışık / okunamayan → null (ödeme motoru geçerli)", () => {
  assert.equal(yakaBilgisi("sile", { reach: "far", cutoff_time: "12:00:00" }), null);
  assert.equal(yakaBilgisi("esenyurt", { reach: "mixed", cutoff_time: "12:00:00" }), null);
  assert.equal(yakaBilgisi("sultangazi", { reach: "mixed", cutoff_time: "17:00:00" }), null);
  assert.equal(yakaBilgisi("kadikoy", { reach: "in", cutoff_time: null }), null);
  assert.equal(yakaBilgisi("kadikoy", null), null);
  assert.equal(yakaBilgisi("ankara", { reach: "in", cutoff_time: "20:00:00" }), null);
});

test("bileşen ve motor okuyucuda sabit saat ya da ücretsiz vaadi yok — saatler yalnız kural dosyasında", () => {
  const comp = readFileSync(new URL("../components/DeliveryFactsNote.tsx", import.meta.url), "utf8");
  const lib = readFileSync(new URL("./deliveryFacts.ts", import.meta.url), "utf8");
  for (const src of [comp, lib]) {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
    assert.ok(!/\b\d{2}:\d{2}\b/.test(code), "sabit HH:MM yok");
    assert.ok(!/ücretsiz|free delivery|kostenlos/i.test(code), "ücretsiz teslimat vaadi yok");
  }
  // İki kavram ayrı metinlerle: son sipariş saati ≠ son teslimat saati
  assert.match(comp, /Aynı gün teslimat için son sipariş saati/);
  assert.match(comp, /Teslimatlar saat \$\{b\.teslimatSonSaat\}'ye kadar yapılabilir/);
});

test("kapsam: TR İstanbul ilçe + mahalle sayfaları (kargo/uzak/belirsiz hariç), EN Kadıköy, DE iki sayfa, TR ana sayfa", () => {
  const slug = readFileSync(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const global = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.match(slug, /isDistrictScope && parts\[0\] === "istanbul" && parts\[1\] && !cargoMode && !reachOut && !reachNeutral && sameDayFloorMinor == null/);
  assert.equal((home.match(/<DeliveryFactsNote /g) ?? []).length, 2, "TR ana sayfa: CMS ve yedek düzen");
  assert.match(global, /loc\.district === "kadikoy"/);
  assert.match(global, /locale === "de" && row\.page_key === DESTINATION_ROOT/);
  assert.match(global, /afterHero=\{locale === "de" \?/);
});
