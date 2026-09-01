// lib/anasayfaAnahtarKelime.test.ts — ana sayfa hedef kelime nöbetçisi.
// Çalıştırma: node --test lib/anasayfaAnahtarKelime.test.ts   (npm run test:unit)
//
// NEDEN KAYNAK DOSYA OKUYOR: BrandStory bir client component; motion/react ve
// lucide-react import ettiği için node test ortamına alınamaz. Korunması gereken
// şey de zaten davranış değil METNİN KENDİSİ — bu yüzden metni bulunduğu yerde
// doğruluyoruz.
//
// NEDEN VAR: 1 Eyl 2026 GSC ölçümünde beş ana kelimeden dördü ana sayfa
// gövdesinde geçiyordu; "online çiçekçi" 0 kez geçiyordu ve pozisyonu 45-55
// bandındaydı (beşi içinde en kötüsü). Cümle eklendi. İleride bir tasarım
// yenilemesi bu paragrafı sessizce silerse bu test kırılır ve haber verir.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const KAYNAK = new URL("../components/home/BrandStory.tsx", import.meta.url);
const metin = readFileSync(KAYNAK, "utf8").replace(/\s+/g, " ").toLowerCase();

test("ana sayfa marka metninde 'online çiçekçi' geçer", () => {
  assert.ok(
    metin.includes("online çiçekçi"),
    "BrandStory paragrafından 'online çiçekçi' kaybolmuş — ana sayfanın bu kelimeye tek on-page sinyali burasıydı."
  );
});

test("ana sayfa marka metninde teslimat vaadi sitenin geri kalanıyla TUTARLI", () => {
  // Uydurma vaat nöbetçisi: "Türkiye geneli aynı gün" YANLIŞTIR — kargo 1-3 iş günü.
  // İstanbul aynı gün + Türkiye geneli kargo ayrımı korunmalı.
  assert.ok(metin.includes("i̇stanbul'da aynı gün") || metin.includes("istanbul'da aynı gün"),
    "aynı gün vaadi İstanbul'a bağlı olmalı");
  assert.ok(metin.includes("türkiye genelinde kargo"),
    "Türkiye geneli için kargo denmeli, aynı gün DENMEMELİ");
  assert.ok(!/türkiye genelinde aynı gün/.test(metin),
    "UYDURMA VAAT: Türkiye geneli aynı gün teslimat sunulmuyor");
});
