// lib/legacySeasonHtmlRedirects.js — ESKİ YILBAŞI / KOKİNA ".html" ÜRÜN ADRESLERİ (ADDITIVE)
// ----------------------------------------------------------------------------
// Kök neden (Search Console, 1 Kas 2025 – 10 Oca 2026): adresinde kokina / yılbaşı / yeni yıl / noel
// geçen 91 eski adres 75 tık + 5.746 gösterim aldı; 80'i "/{id}-{Slug}.html" biçiminde eski ürün adresi.
// Bu adresler next.config.js'teki genel kurala ("/:id-:slug.html" → "/urun/:slug") takılıyor, eşdeğer
// ürün aynı slug'la olmadığı için 308 → 404 zinciri oluşuyordu (ör. /54517-Kokina-Cicegi.html:
// 36 tık / 2.716 gösterim / konum 7,6).
//
// Neden burada: middleware matcher noktalı yolları dışlar, ".html" adresleri middleware'e ve dolayısıyla
// yönetilen (panel) 301 haritasına HİÇ ulaşmaz. Tek adımlı 301 yalnız next.config redirect'iyle verilebilir.
//
// Kural: bu liste next.config.js'te GENEL ".html" kuralının ÖNÜNE konur (ilk eşleşen kazanır). Sıra
// önemlidir: önce kokina, sonra yılbaşı ailesinin özel alt sayfaları, en sonda Yılbaşı ana sayfası.
// Hiçbir adres ana sayfaya gitmez; bu kalıplara girmeyen ".html" adreslerinin davranışı değişmez.
// CommonJS: next.config.js `require` ile okur.

/** Yılbaşı ailesi: Yilbasi / Yeni-Yil / Noel (eski slug'lar büyük harfle başlar; küçük harf de kabul). */
const AILE = "(?:[Yy]ilbasi|[Yy]eni-[Yy]il|[Nn]oel)";

/** Aile sözcüğü + ikinci sözcük, iki sırada da ("Yilbasi-Gul-Buketi" ve "Kirmizi-Gul-Yeni-Yil-Buketi"). */
const aileIle = (sozcuk) => `(.*${AILE}.*${sozcuk}.*|.*${sozcuk}.*${AILE}.*)`;

const kural = (slugDeseni, hedef) => ({
  source: `/:id(\\d+)-:slug${slugDeseni}\\.html`,
  destination: hedef,
  permanent: true,
});

const LEGACY_SEASON_HTML_REDIRECTS = [
  // 1) Adında kokina geçen her eski ürün → Kokina kategorisi.
  kural("(.*[Kk]okina.*)", "/kategori/kokina"),
  // 2) Yılbaşı ailesi — özelden genele.
  kural(aileIle("[Mm]asa-[Cc]icegi"), "/kategori/yilbasi-sofra-cicegi"),
  kural(aileIle("[Gg]ul"), "/kategori/yilbasi-gul"),
  kural(aileIle("[Kk]utu"), "/kategori/yilbasi-kutuda-cicek"),
  kural(aileIle("[Bb]uket"), "/kategori/yilbasi-buket"),
  kural(aileIle("[Aa]ranjman"), "/kategori/yilbasi-aranjman"),
  // 3) Ailenin geri kalanı (ağaç, teraryum, askı, sukulent…) → Yılbaşı ana sayfası.
  kural(`(.*${AILE}.*)`, "/kategori/yilbasi"),
];

module.exports = { LEGACY_SEASON_HTML_REDIRECTS };
