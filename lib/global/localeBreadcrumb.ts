// ============================================================================
// GLOBAL — lokasyon kırıntısı BreadcrumbList JSON-LD (ADDITIVE, saf modül).
//
// NEDEN (24 Eyl 2026 canlı okuma): 13 dildeki lokasyon sayfalarında görsel
// kırıntı vardı ama HİÇ yapılandırılmış veri yoktu (TR lokasyon dalı 23 Eyl'de
// lib/locationBreadcrumb.ts ile aldı). Google'a "/en/istanbul → /en/istanbul/
// kadikoy → …" ebeveynliği beyan edilmiyordu.
//
// KURAL (TR modülüyle aynı): zincir YALNIZ URL'den ve sayfanın kendi çözdüğü
// adlardan üretilir; ad yoksa o basamak ve altı yazılmaz. Ana sayfa basamağı
// o dilin locale kökü (/en, /de …) ve o dilin "Ana sayfa" etiketidir.
// Kanonik host absoluteUrl() ile gelir — burada elle kurulmaz.
// ============================================================================

export type LocaleKirintiBasamak = { ad: string; yol: string };

export function localeKirintiBasamaklari(
  locale: string,
  parts: string[],
  adlar: (string | null | undefined)[],
): LocaleKirintiBasamak[] {
  const out: LocaleKirintiBasamak[] = [];
  for (let i = 0; i < parts.length && i < 3; i++) {
    const segment = (parts[i] ?? "").trim();
    const ad = (adlar[i] ?? "").trim();
    if (!segment || !ad) break; // bir basamak eksikse alt basamaklar da yazılmaz
    out.push({ ad, yol: `/${locale}/` + parts.slice(0, i + 1).join("/") });
  }
  return out;
}

/**
 * schema.org BreadcrumbList — ilk basamak o dilin ana sayfası (/<locale>).
 * anaEtiket: o dildeki "Ana sayfa" adı. Basamak yoksa null (boş şema basılmaz).
 */
export function localeBreadcrumbJsonLd(
  locale: string,
  parts: string[],
  adlar: (string | null | undefined)[],
  mutlak: (yol: string) => string,
  anaEtiket: string,
): string | null {
  const basamaklar = localeKirintiBasamaklari(locale, parts, adlar);
  if (basamaklar.length === 0) return null;
  const items = [{ ad: anaEtiket, yol: `/${locale}` }, ...basamaklar].map((b, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: b.ad,
    item: mutlak(b.yol),
  }));
  // `<` kaçırılır (TR PDP serializeJsonLd ile aynı koruma): adlar DB'den gelir,
  // içlerindeki bir `</script>` dizisi etiketi erken kapatmasın.
  return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items }).replace(/</g, "\\u003c");
}
