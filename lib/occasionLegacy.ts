/* ============================================================================
   CICEKYOLLA PUBLIC — Eski "{kategori}-cicek-siparisi" adresleri (ADDITIVE).

   Eski sitede özel gün sayfaları /kadinlar-gunu-cicek-siparisi gibi adreslerdeydi
   (GSC 365 gün: 7.159 gösterim, "kadınlar günü çiçek" ~4. sıra). Bu adresler konum
   kalıbına (lib/legacy-location-redirect.ts SUFFIXES) uyduğu için konum aranıyor,
   bulunamayınca ana sayfaya 301'leniyordu → sıralama ana sayfaya akıyordu.

   Kural: konum çözülemediyse ve sonek soyulmuş taban envanterdeki GERÇEK bir
   kategori slug'ıysa → /kategori/{taban}. Envanterde yoksa null (bugünkü davranış
   birebir). Bağımlılıksız saf modül (node --test ile test edilir).
   ============================================================================ */

/** Kategori sayfası anlamı taşıyan eski sonekler ("-cicek" ayrı kuralda: {taban}-cicek kategorisine bakar). */
export const OCCASION_LEGACY_SUFFIXES = ["cicek-siparisi", "cicek-siparsi", "cicek-gonderme", "cicek-yolla"] as const;

export function occasionCategoryTarget(
  normalizedBase: string | undefined,
  suffix: string | undefined,
  isCategorySlug: (slug: string) => boolean,
): string | null {
  if (!normalizedBase || !suffix) return null;
  if (!(OCCASION_LEGACY_SUFFIXES as readonly string[]).includes(suffix)) return null;
  return isCategorySlug(normalizedBase) ? `/kategori/${normalizedBase}` : null;
}
