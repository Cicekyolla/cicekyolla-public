// Organik SEO paketi nöbetçisi — 23 Eyl 2026.
// Ölçüm tabanı (GSC 28/90g + canlı HTML):
//   • /istanbul 90g 57 gösterim / 0 tıklama, hiçbir üst sayfadan iç link almıyor
//   • /istanbul canlıda 4 ürün; /ankara, /izmir, /antalya aynı şablonla 100 ürün
//   • lokasyon ağacında BreadcrumbList yok (yalnız /kategori/cicekler'de var)
//   • ana sayfa açıklamasında "çiçekçi" hiç geçmiyor; "çiçekçi" 606 gös → 6 tık
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kirintiBasamaklari, locationBreadcrumbJsonLd } from "./locationBreadcrumb.ts";

const oku = (p: string) => readFileSync(join(import.meta.dirname, "..", p), "utf8");
const SLUG = oku("app/[...slug]/page.tsx");
const FOOTER = oku("components/Footer.tsx");
const ILCE_BOLUMU = oku("components/home/DistrictDelivery.tsx");
const ANASAYFA = oku("app/page.tsx");

test("il vitrini artık 4 üründe kalmıyor — ilçe sayfasıyla aynı sayıda", () => {
  assert.match(SLUG, /page_size: cargoMode \? 100 : LOCATION_PAGE_SIZE,/);
  assert.match(SLUG, /\.slice\(0, cargoMode \? 100 : LOCATION_PAGE_SIZE\);/);
  assert.match(SLUG, /const LOCATION_PAGE_SIZE = 30;/);
  // Sabit 4 ve 8 geri gelirse test kırılır.
  assert.doesNotMatch(SLUG, /page_size: cargoMode \? 100 : 8/);
  assert.doesNotMatch(SLUG, /\.slice\(0, cargoMode \? 100 : 4\)/);
  // Ürün sorgusunun kendisi DEĞİŞMEDİ (aynı gün çiçek havuzu korunur).
  assert.match(SLUG, /\{ product_type: "flower", same_day_available: true \}/);
});

test("footer il hub'ına bağlanır ve locale yolunda da gösterir", () => {
  assert.match(FOOTER, /\{ label: "İstanbul", href: "\/istanbul" \}/);
  // Locale süzgeci "/istanbul/" ile başlıyordu; hub bu testten geçemiyordu.
  assert.match(FOOTER, /l\.href === "\/istanbul" \|\| l\.href\.startsWith\("\/istanbul\/"\)/);
  // Mevcut ilçe/il kısayolları korunur.
  for (const h of ["/istanbul/kadikoy", "/istanbul/besiktas", "/istanbul/sisli", "/ankara/cankaya", "/izmir/konak"]) {
    assert.ok(FOOTER.includes(`href: "${h}"`), `${h} footer'dan düşmüş`);
  }
});

test("ana sayfa teslimat bölümü il hub'ını listenin başına koyar, vaat vermez", () => {
  assert.match(ILCE_BOLUMU, /rows\.push\(\{ key: "istanbul-hub", name: "İstanbul", href: "\/istanbul", badge: "39 İlçe" \}\)/);
  // Hub rozeti teslimat SÖZÜ taşımamalı: İstanbul'un tamamı için tek söz verilemez.
  assert.doesNotMatch(ILCE_BOLUMU, /key: "istanbul-hub"[^}]*badge: "Aynı Gün/);
  // Yalnız zones içinde İstanbul varsa eklenir (uydurma satır yok).
  assert.match(ILCE_BOLUMU, /if \(ist\) rows\.push\(\{ key: "istanbul-hub"/);
});

test("ana sayfa teslimat metni satış dilini bozmadan yenilendi", () => {
  const d = ILCE_BOLUMU.replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
  assert.ok(d.includes("i̇stanbul içinde aynı gün kuryeyle") || d.includes("istanbul içinde aynı gün kuryeyle"),
    "aynı gün vaadi İstanbul'a bağlı kalmalı");
  assert.ok(d.includes("1–3 iş günü kargoyla"), "Türkiye geneli için kargo denmeli");
  assert.ok(!/türkiye.{0,20}aynı gün/.test(d), "UYDURMA VAAT: Türkiye geneli aynı gün yazılamaz");
  // Statik saat vaadi yok (lib/noStaticCutoff.test.ts kuralıyla aynı çizgi).
  assert.doesNotMatch(ILCE_BOLUMU, /\d{1,2}:00(?:'|&apos;|’)[ae]/);
});

test("ana sayfa açıklaması müşteriye ayırt edici bir şey söylüyor", () => {
  const m = ANASAYFA.match(/^\s*description:\s*\n?\s*"([^"]+)",/m);
  assert.ok(m, "ana sayfa description bulunamadı");
  const d = m![1];
  assert.ok(d.length >= 120 && d.length <= 160, `açıklama ${d.length} karakter — 120-160 bandında olmalı`);
  const ilk100 = d.slice(0, 100).toLocaleLowerCase("tr-TR");
  assert.ok(ilk100.includes("çiçekçi"), "'çiçekçi' ilk 100 karakterde geçmeli (mobil snippet)");
  assert.ok(ilk100.includes("aynı gün"), "'aynı gün' ilk 100 karakterde geçmeli");
  assert.ok(!/türkiye genelinde aynı gün/i.test(d), "UYDURMA VAAT");
  // Title OPERATÖR ONAYLI — dokunulmadı.
  assert.match(ANASAYFA, /title: \{ absolute: "Çiçek Yolla - Online Çiçek Siparişi - Çiçek Gönder - Çiçekçi" \}/);
  // og ve twitter kopyaları da güncel (üç yerde ayrı ayrı duruyor).
  assert.equal((ANASAYFA.match(/İstanbul'da aynı gün teslim eden çiçekçi/g) ?? []).length, 3);
});

test("kırıntı yolu YALNIZ lokasyon dalında basılır", () => {
  assert.match(SLUG, /const breadcrumbLd = locationBreadcrumbJsonLd\(/);
  // Paylaşılan jsonLd fragment'ine EKLENMEDİ (CMS sayfalarına sızmasın).
  const fragment = SLUG.match(/const jsonLd = <>[\s\S]*?<\/>;/);
  assert.ok(fragment, "jsonLd fragment bulunamadı");
  assert.doesNotMatch(fragment![0], /breadcrumb/i);
});

test("kırıntı üreticisi: eksik ad varsa o basamak ve altı yazılmaz", () => {
  assert.deepEqual(kirintiBasamaklari(["istanbul"], ["İstanbul"]), [{ ad: "İstanbul", yol: "/istanbul" }]);
  assert.deepEqual(
    kirintiBasamaklari(["istanbul", "kadikoy"], ["İstanbul", "Kadıköy"]),
    [{ ad: "İstanbul", yol: "/istanbul" }, { ad: "Kadıköy", yol: "/istanbul/kadikoy" }],
  );
  // İlçe adı boşsa mahalle basamağı da yazılmaz — uydurma zincir yok.
  assert.deepEqual(kirintiBasamaklari(["istanbul", "x", "y"], ["İstanbul", "", "Moda"]), [{ ad: "İstanbul", yol: "/istanbul" }]);
  assert.deepEqual(kirintiBasamaklari([], []), []);
});

test("kırıntı JSON-LD: Ana Sayfa ilk basamak, URL'ler mutlak, boşsa null", () => {
  const mutlak = (y: string) => "https://www.cicekyolla.com.tr" + (y === "/" ? "" : y);
  const ld = locationBreadcrumbJsonLd(["istanbul", "kadikoy"], ["İstanbul", "Kadıköy"], mutlak);
  assert.ok(ld);
  const o = JSON.parse(ld!);
  assert.equal(o["@type"], "BreadcrumbList");
  assert.equal(o.itemListElement.length, 3);
  assert.equal(o.itemListElement[0].name, "Ana Sayfa");
  assert.equal(o.itemListElement[1].item, "https://www.cicekyolla.com.tr/istanbul");
  assert.equal(o.itemListElement[2].position, 3);
  assert.equal(locationBreadcrumbJsonLd(["istanbul"], [""], mutlak), null);
});
