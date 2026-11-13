// lib/guvenceTakipTazelik.test.ts — 12 Kas 2026 (ADDITIVE): doğrulanmamış vaatler sitede kalmasın.
// Kanıt (salt okuma denetimi 12 Kas): API'de kurye konumu/GPS/SSE yok, SMS kanalı yok → "canlı takip" vaadi yanlış.
// "7–10 gün" bakım koşuluna bağlı bir beklenti → garanti olarak sunulmaz. WhatsApp: AI asistan 14 dilde yanıtlar
// (prompt.ts) → "TR/EN" ile "dilinizde" çelişkisi tek ifadeye indi.
// Çalıştırma: node --test lib/guvenceTakipTazelik.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const V80 = ["west", "south", "east"].map((f) => oku(`lib/global/v80/copy.${f}.ts`)).join("\n");
const DICTS = ["tr", "en", "de", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"];

test("13 dil: 'canlı/gerçek zamanlı takip' vaadi yok; WhatsApp notu 'TR/EN' değil", () => {
  const desc = [...V80.matchAll(/whatsapp: \{ title: "[^"]*", desc: "([^"]*)" \}/g)].map((m) => m[1]);
  assert.equal(desc.length, 13);
  for (const d of desc) assert.doesNotMatch(d, /live|direct|tempo reale|directo|direto|canlı|онлайн|مباشرة|实时|リアルタイム|실시간/i, d);
  const notes = [...V80.matchAll(/waNote: "([^"]*)"/g)].map((m) => m[1]);
  assert.equal(notes.length, 13);
  for (const n of notes) assert.doesNotMatch(n, /TR\/EN/, n);
});

test("13 dil: V80 tazelik başlığı 'garanti' değil", () => {
  const titles = [...V80.matchAll(/fresh: \{ title: "([^"]*)"/g)].map((m) => m[1]);
  assert.equal(titles.length, 13);
  for (const t of titles) assert.doesNotMatch(t, /guarantee|garantie|garanzia|garantía|garantia|zəmanət|гарант|ضمان|保证|保証|보장/i, t);
});

test("14 dil: '7–10 gün' bakım koşuluyla, garanti olarak değil", () => {
  for (const l of DICTS) {
    const d = oku(`lib/i18n/dict/${l}.ts`);
    const t = (d.match(/"co\.trust\.fresh": "([^"]*)"/) ?? [])[1] ?? "";
    const x = (d.match(/"co\.trust\.freshDesc": "([^"]*)"/) ?? [])[1] ?? "";
    assert.ok(t && x, l);
    assert.doesNotMatch(`${t} ${x}`, /garanti|guarantee|garantie|garanzia|garantía|garantia|zəmanət|гарант|ضمان|保证|保証|보장/i, l);
    assert.match(x, /7/, `${l}: süre bilgisi korunur`);
  }
});

test("TR: kargo 'Canlı Takip/SMS', 'Taze Kalma Garantisi', 'Taptaze Garantisi' kalmadı; SSS iade ve WhatsApp ödemesi var", () => {
  const files = ["components/category/CargoCategoryExperience.tsx", "components/home/TrustBar.tsx", "components/home/UrgencyStrip.tsx",
    "app/teslimat-bolgeleri/page.tsx", "components/home/BrandStory.tsx", "app/urun/[slug]/page.tsx"].map(oku).join("\n");
  assert.doesNotMatch(files, /Canlı Takip|SMS ve WhatsApp ile anlık|Taze Kalma Garantisi|taze kalma garantisi|Taptaze [Gg]arantisi|"Taze Garantisi"|Taze Çiçek Garantisi/);
  const sss = oku("app/sik-sorulan-sorular/page.tsx");
  assert.match(sss, /Siparişim teslim edilemezse ne olur\?/);
  assert.match(sss, /iadenizi aynı gün başlatırız\. Kart iadesinin hesabınıza geçiş süresi bankanıza bağlıdır\./);
  assert.match(sss, /ödeme adımında Havale \/ EFT seçeneğini de seçebilirsiniz/);
  assert.match(sss, /Western Union ile ödemek isterseniz WhatsApp'tan yazmanız yeterli/);
  assert.doesNotMatch(sss, /havale\/EFT veya Western Union ile de ödeyebilirsiniz; bunun için WhatsApp/);
});
