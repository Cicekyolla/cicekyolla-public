// ============================================================================
// Eski URL yönlendirme hedeflerini canlı sitemap'ten tazeler.
//
//   npm run seo:refresh-targets
//
// NEDEN: middleware, eski sitenin URL'lerini (/{il}-{ilce}-{mahalle}-mahallesi-cicekci)
// yayındaki sayfalara bağlarken iki STATİK listeye bakar. Listeler kendiliğinden
// büyümez; panelden yeni mahalle/ilçe yayınlandığında bu script çalıştırılıp
// sonuç commit edilmezse, o eski URL'ler bir kademe geniş hedefte (ilçe) kalır.
//
//   lib/legacy-neighborhood-targets.json   yayındaki mahalleler  -> /{il}/{ilce}/{ad}-mah
//   lib/legacy-location-public-targets.json yayındaki il+ilçeler -> /{il}[/{ilce}]
//
// Middleware her istekte çalıştığı için buraya canlı API sorgusu KONMAZ; statik
// liste + kural, gecikmesiz çözümdür. Bedeli bu bakım adımıdır.
//
// Kırık hedef üretmez: yalnız sitemap'te olan (yani yayında + index) yollar yazılır.
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.env.SITE_URL ?? "https://www.cicekyolla.com.tr";

async function sitemapYollari(tip) {
  const url = `${SITE}/sitemaps/${tip}.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const xml = await res.text();
  const yollar = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(SITE, ""))
    .filter((p) => p.startsWith("/"));
  if (yollar.length === 0) throw new Error(`${url} boş döndü — yazma iptal`);
  return yollar;
}

function yaz(dosya, yollar) {
  const hedef = join(KOK, "lib", dosya);
  let onceki = [];
  try {
    onceki = JSON.parse(readFileSync(hedef, "utf8"));
  } catch {
    /* ilk üretim */
  }
  const yeni = [...new Set(yollar)].sort();
  const eklenen = yeni.filter((y) => !onceki.includes(y));
  const cikan = onceki.filter((y) => !yeni.includes(y));

  // Satır satır yazılır (mevcut dosya biçimi): yeni bir ilçe yayınlandığında
  // diff'te eklenen yollar tek tek görünür, tek dev satır değişmez.
  writeFileSync(hedef, JSON.stringify(yeni, null, 2) + "\n", "utf8");
  console.log(`\n${dosya}`);
  console.log(`  önce: ${onceki.length}  ->  sonra: ${yeni.length}`);
  console.log(`  eklenen: ${eklenen.length}   çıkan: ${cikan.length}`);
  if (eklenen.length) console.log(`  yeni örnek : ${eklenen.slice(0, 3).join("  ")}`);
  if (cikan.length) {
    console.log(`  ⚠ ÇIKAN    : ${cikan.slice(0, 3).join("  ")}`);
    console.log(`  ⚠ Bir sayfa yayından kaldırıldıysa normaldir. Beklemiyorsanız`);
    console.log(`    commit'lemeden önce sitemap'i kontrol edin.`);
  }
}

console.log(`kaynak: ${SITE}/sitemaps/`);

const mahalleler = (await sitemapYollari("neighborhoods")).filter(
  (p) => p.split("/").filter(Boolean).length === 3,
);
yaz("legacy-neighborhood-targets.json", mahalleler);

const konumlar = (await sitemapYollari("locations")).filter((p) => {
  const n = p.split("/").filter(Boolean).length;
  return n === 1 || n === 2;
});
yaz("legacy-location-public-targets.json", konumlar);

console.log(`\nBitti. Değişiklik varsa commit edip deploy edin:`);
console.log(`  git add lib/legacy-*.json && git commit -m "chore(seo): yonlendirme hedefleri tazelendi"`);
