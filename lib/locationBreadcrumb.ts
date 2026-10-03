// Lokasyon kırıntı yolu (BreadcrumbList JSON-LD) — 23 Eyl 2026.
//
// NEDEN: canlı ölçümde lokasyon ağacının TAMAMINDA BreadcrumbList yoktu
// (yalnız /kategori/cicekler'de var). Yani Google'a "/istanbul bu 39 ilçenin
// ebeveynidir" ilişkisi hiç beyan edilmiyordu. /istanbul 90 günde 57 gösterim
// alıyor ve hiçbir üst sayfadan iç link almıyor; kırıntı, bu ilişkiyi kuran
// tek maliyetsiz sinyal.
//
// KURAL: zincir YALNIZ URL'den ve sayfanın kendi çözdüğü adlardan üretilir.
// Uydurma ad, uydurma seviye YOK. Ad yoksa o basamak hiç yazılmaz.
// Kanonik https://www SABİT — absoluteUrl() ile üretilir, burada elle kurulmaz.

export type KirintiBasamak = { ad: string; yol: string };

/**
 * parts = ["istanbul"] | ["istanbul","kadikoy"] | ["istanbul","kadikoy","moda-mah"]
 * adlar = o basamağın GÖRÜNEN adı (sayfanın kendi çözdüğü değer).
 * Boş/whitespace ad gelen basamak zincire GİRMEZ.
 */
export function kirintiBasamaklari(parts: string[], adlar: (string | null | undefined)[]): KirintiBasamak[] {
  const out: KirintiBasamak[] = [];
  for (let i = 0; i < parts.length && i < 3; i++) {
    const segment = (parts[i] ?? "").trim();
    const ad = (adlar[i] ?? "").trim();
    if (!segment || !ad) break; // bir basamak eksikse alt basamaklar da yazılmaz
    out.push({ ad, yol: "/" + parts.slice(0, i + 1).join("/") });
  }
  return out;
}

/**
 * schema.org BreadcrumbList. "Ana Sayfa" her zaman ilk basamak.
 * mutlak: yol → tam URL çeviren fonksiyon (lib/site-config absoluteUrl).
 * Basamak yoksa null döner (boş şema basılmaz).
 */
export function locationBreadcrumbJsonLd(
  parts: string[],
  adlar: (string | null | undefined)[],
  mutlak: (yol: string) => string,
  /** ADDITIVE (Maltepe pilotu): ilçe basamağını (indeks 1) başka bir sayfayla değiştirir —
      pillar sayfada kendi yolu, mahalle sayfasında üst (pillar) sayfa. Verilmezse bugünkü çıktı. */
  districtStep?: KirintiBasamak | null,
  /** ADDITIVE (Maltepe ailesi): sayfanın KENDİ (hiyerarşik olmayan) yolu — son basamağın yolunu değiştirir. */
  selfPath?: string | null,
): string | null {
  const basamaklar = kirintiBasamaklari(parts, adlar);
  if (districtStep && basamaklar.length >= 2 && districtStep.ad.trim() && districtStep.yol) {
    basamaklar[1] = { ad: districtStep.ad.trim(), yol: districtStep.yol };
  }
  if (selfPath && basamaklar.length === parts.length && basamaklar.length >= 2) {
    basamaklar[basamaklar.length - 1] = { ad: basamaklar[basamaklar.length - 1].ad, yol: selfPath };
  }
  if (basamaklar.length === 0) return null;
  const items = [{ ad: "Ana Sayfa", yol: "/" }, ...basamaklar].map((b, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: b.ad,
    item: mutlak(b.yol),
  }));
  return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items });
}
