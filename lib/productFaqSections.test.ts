// Ürün açıklamasından SSS: bölüm sınırı — sonraki bölümün başlığı / maddeleri cevaba karışmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { descriptionSection, withoutApproxPrefix } from "./productFaqSections.ts";

const h3 = (items: string[]) => items.map((t) => `<h3>${t}</h3>`).join("\n<p>metin</p>\n");
const headings = (html: string) => [...html.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
/** Düzeltmeden önceki kural (app/urun/[slug]/page.tsx htmlSection): sabit bitiş kalıbı. */
function oldSection(description: string, start: RegExp, end?: RegExp): string {
  const m = start.exec(description); if (!m) return "";
  const rest = description.slice((m.index ?? 0) + m[0].length); const e = end?.exec(rest);
  return rest.slice(0, e?.index ?? rest.length);
}

// Canlıdaki gerçek açıklamaların başlık dizileri (bölüm başlığı da madde de h3'tür).
const BEYAZ_ORKIDE = h3(["Ürün İçeriği", "Beyaz orkide (Phalaenopsis)", "Canlı yeşil yapraklar", "Doğal yosun dokunuşları", "Ürün Boyutu", "Kimlere Gönderilir", "Sevgiliye", "Eşe", "Anneye", "Bakım Talimatı", "Orkideler uygun bakım ile tekrar çiçek açabilir"]);
const ZEYTIN = h3(["Ürün İçeriği", "Sukulent bitkiler", "Sarı kuru çiçek detayları", "Desenli dekoratif saksı", "Ürün Ölçüleri", "Kullanım Alanları", "Ev dekorasyonu", "Ürün Özellikleri", "Minimal bakım gereksinimi"]);
const KRALIYET = h3(["🌿 Ürün İçeriği", "Mor Phalaenopsis Orkide", "Kırmızı Gül", "Premium Cam Fanus", "📏 Ürün Ölçüleri", "🌿 Bakım Bilgisi"]);
const TURUNCU = h3(["Ürün Açıklaması", "Ürün İçeriği ve Kullanılan Malzemeler", "Boyut Bilgisi", "Bakım Talimatı"]);
const ROYAL = h3(["Ürün İçeriği", "Yaklaşık 7 Adet Kırmızı Gül", "3 Dal Pembe Phalaenopsis Orkide", "Mevsim yeşillikleri", "Yaklaşık Ölçüler", "Bakım Talimatı"]);

test("içerik bölümü ilk SONRAKİ bölüm etiketinde biter — hangi etiket olursa olsun", () => {
  assert.deepEqual(headings(descriptionSection(BEYAZ_ORKIDE, /Ürün İçeriği/i)), ["Beyaz orkide (Phalaenopsis)", "Canlı yeşil yapraklar", "Doğal yosun dokunuşları"]);
  assert.deepEqual(headings(descriptionSection(ZEYTIN, /Ürün İçeriği/i)), ["Sukulent bitkiler", "Sarı kuru çiçek detayları", "Desenli dekoratif saksı"]);
  assert.deepEqual(headings(descriptionSection(KRALIYET, /Ürün İçeriği/i)), ["Mor Phalaenopsis Orkide", "Kırmızı Gül", "Premium Cam Fanus"], "emoji önekli etiket de sınırdır");
  // Madde başlığı olmayan bölüm: sonraki bölüm başlıkları madde SAYILMAZ.
  assert.deepEqual(headings(descriptionSection(TURUNCU, /Ürün İçeriği/i)), []);
  // Zaten doğru çalışan açıklama aynen kalır.
  assert.deepEqual(headings(descriptionSection(ROYAL, /Ürün İçeriği/i)), ["Yaklaşık 7 Adet Kırmızı Gül", "3 Dal Pembe Phalaenopsis Orkide", "Mevsim yeşillikleri"]);
});

test("düzeltmeden önceki kural aynı açıklamalarda sonraki bölümleri cevaba karıştırıyordu (testin kırılabildiğinin kanıtı)", () => {
  const eski = headings(oldSection(BEYAZ_ORKIDE, /Ürün İçeriği/i, /Yaklaşık Ölçüler/i));
  assert.ok(eski.includes("Ürün Boyutu") && eski.includes("Kimlere Gönderilir") && eski.includes("Sevgiliye"), "eski kural kirli");
  assert.deepEqual(headings(oldSection(TURUNCU, /Ürün İçeriği/i, /Yaklaşık Ölçüler/i)), ["Boyut Bilgisi", "Bakım Talimatı"]);
});

test("kimlere / bakım bölümleri: paragraf içindeki etiketle başlayabilir, sonraki etikette biter", () => {
  const d = `<h3>Teknik Bilgiler</h3><p>Kimlere Gönderilebilir? Sevdiklerinize.</p><h3>Bakım Talimatı</h3><p>Gün aşırı az su verin.</p>`;
  assert.deepEqual(headings(descriptionSection(d, /Kimlere Gönderilebilir\?/i)), [], "\"Bakım Talimatı\" başlığı alıcı maddesi sayılmaz");
  assert.equal(descriptionSection(d, /Bakım Talimatı/i).replace(/<[^>]+>/g, "").trim(), "Gün aşırı az su verin.");
  // Bakım başlığından hemen sonra başka bir bölüm etiketi geliyorsa bakım metni o bölümün metnini YUTMAZ.
  const karisik = `<h3>Bakım Talimatı</h3><p>Kimlere Gönderilebilir? Canlılığını koruma: sünger nemli kalmalı.</p>`;
  assert.equal(descriptionSection(karisik, /Bakım Talimatı/i).replace(/<[^>]+>/g, "").trim(), "");
});

test("cümle İÇİNDE geçen etiket sözcükleri bölümü bitirmez; başlangıç yoksa boş döner", () => {
  const d = `<h3>Ürün İçeriği</h3><h3>Kırmızı gül</h3><p>Bu aranjmanın bakım talimatı kutunun içindedir; ürün ölçüleri değişebilir.</p><h3>Beyaz lilyum</h3><h3>Ürün Ölçüleri</h3>`;
  assert.deepEqual(headings(descriptionSection(d, /Ürün İçeriği/i)), ["Kırmızı gül", "Beyaz lilyum"]);
  assert.equal(descriptionSection("<p>Yalnız metin.</p>", /Ürün İçeriği/i), "");
});

test("ölçü değeri: baştaki 'Yaklaşık' atılır (kalıp zaten 'Yaklaşık yükseklik' der)", () => {
  assert.equal(withoutApproxPrefix("Yaklaşık 55 - 65 cm"), "55 - 65 cm");
  assert.equal(withoutApproxPrefix("yaklaşık  60 cm"), "60 cm");
  assert.equal(withoutApproxPrefix("45-55 cm"), "45-55 cm");
});

test("bağlantı: ürün sayfası bölümleri bu kuralla keser (sabit bitiş kalıbı kalmadı)", () => {
  const page = readFileSync(join(import.meta.dirname, "..", "app/urun/[slug]/page.tsx"), "utf8");
  assert.equal((page.match(/descriptionSection\(description, /g) ?? []).length, 4, "içerik + kimlere + hangi günler + bakım");
  assert.equal(/htmlSection\(/.test(page), false, "eski sabit-bitişli kesici kullanılmıyor");
  assert.match(page, /withoutApproxPrefix\(/);
});
