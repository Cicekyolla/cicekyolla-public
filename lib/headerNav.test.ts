// lib/headerNav.test.ts — header nav config + mega menü dengeleme testleri.
// Çalıştırma: node --test lib/headerNav.test.ts  (npm run test:unit)
// buildHeaderMenu'nün CANLI ağaçla çözümü (Yapay Dekorasyon → /kategori/yapay-dekorasyon)
// preview/production doğrulamasında kanıtlanır; burada saf parçalar test edilir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADER_NAV_CONFIG, balanceMegaColumns, type MegaColumn } from "./megaMenuLayout.ts";

const fam = (title: string, n: number): MegaColumn => ({
  title, href: `/kategori/${title.toLowerCase()}`,
  links: Array.from({ length: n }, (_, i) => ({ name: `${title} ${i + 1}`, href: `/kategori/${title.toLowerCase()}-${i + 1}` })),
});
// Production "Çiçekler" ağacının gerçek şekline yakın kesit: uzun Güller + karışık aileler.
const CICEKLER: MegaColumn[] = [
  fam("Guller", 16), fam("Buketler", 6), fam("Orkideler", 8), fam("Lilyumlar", 0),
  fam("Laleler", 2), fam("Papatyalar", 3), fam("Kutuda", 5), fam("Vazoda", 4),
  fam("Aranjman", 7), fam("Sepet", 2), fam("Kasimpati", 0), fam("Gerbera", 1),
];
const flat = (cols: MegaColumn[][]) => cols.flat().flatMap((c) => c.links.map((l) => l.href));

test("config: Yapay Dekorasyon ana navigasyonda (Koleksiyonlar'ın yanında), ölü girişler yok, 9 öğe", () => {
  const labels = HEADER_NAV_CONFIG.map((c) => c.label);
  assert.deepEqual(labels.slice(-2), ["Koleksiyonlar", "Yapay Dekorasyon"]);
  assert.ok(!labels.includes("Premium Çiçekler"));
  assert.ok(!labels.includes("Doğum Günü"));
  assert.equal(labels.length, 9);
  // Mevcut 8 öğe aynı sırayla korundu
  assert.deepEqual(labels.slice(0, 8), ["Çiçekler", "Gönderim Amacına Göre", "Buketler", "Güller", "Orkideler", "Saksı Bitkileri", "Kampanyalar", "Koleksiyonlar"]);
});

test("dengeleme: hiçbir link kaybolmaz, sıra korunur, en fazla K sütun", () => {
  const out = balanceMegaColumns(CICEKLER, 4);
  assert.deepEqual(flat(out), CICEKLER.flatMap((c) => c.links.map((l) => l.href)));
  assert.ok(out.length <= 4 && out.length >= 3);
});

test("dengeleme: Güller 16 tek başına bir sütuna sığıyorsa BÖLÜNMEZ (gereksiz parçalama yok)", () => {
  const out = balanceMegaColumns(CICEKLER, 4);
  const parts = out.flat().filter((c) => c.title === "Guller");
  assert.equal(parts.length, 1);
  assert.equal(parts[0].links.length, 16);
});

test("dengeleme: sütunu aşan çok uzun aile bölünür, devamı 'continued' ile aynı başlık/href'le sürer", () => {
  const src: MegaColumn[] = [fam("Guller", 40), fam("Buketler", 4), fam("Orkideler", 4), fam("Laleler", 2)];
  const out = balanceMegaColumns(src, 4);
  const parts = out.flat().filter((c) => c.title === "Guller");
  assert.ok(parts.length >= 2, `parça sayısı ${parts.length}`);
  assert.equal(parts[0].continued ?? false, false);
  assert.ok(parts.slice(1).every((p) => p.continued === true && p.href === parts[0].href));
  assert.equal(parts.reduce((s, p) => s + p.links.length, 0), 40);
  assert.deepEqual(flat(out), src.flatMap((c) => c.links.map((l) => l.href)));
});

test("dengeleme: sütun yükseklikleri hedef + tolerans içinde (yan sütunlar boş kalmaz)", () => {
  const total = CICEKLER.reduce((s, c) => s + 1 + c.links.length, 0);
  const out = balanceMegaColumns(CICEKLER, 4);
  const heights = out.map((col) => col.reduce((s, c) => s + 1 + c.links.length, 0));
  const target = Math.ceil(total / 4);
  assert.ok(Math.max(...heights) <= target + 3, `en yüksek ${Math.max(...heights)} > ${target}+3`);
  assert.ok(Math.min(...heights) >= Math.floor(target * 0.5), `en alçak ${Math.min(...heights)} çok boş`);
});

test("dengeleme: az aile → boş sütun üretmez; boş girdi → []", () => {
  const out = balanceMegaColumns([fam("Bonsai", 0), fam("Teraryumlar", 0)], 4);
  assert.ok(out.every((c) => c.length > 0));
  assert.ok(out.length <= 2);
  assert.deepEqual(balanceMegaColumns([], 4), []);
});
