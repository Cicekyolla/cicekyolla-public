// EK (İSTANBUL LİNK AĞI, 26 Eki 2026) — hub yüzeyleri için ilçe link listesi.
//
// Ölçüm (canlı, 26 Eki): /istanbul 39 ilçeye bağlıyor; ana sayfa 5, /site-haritasi 0
// (3'ü footer'dan), /teslimat-bolgeleri 4. Sebep: bu yüzeyler linki Delivery Motor'dan
// (gerçek teslimat kaydı, ~5 İstanbul ilçesi) üretiyordu.
//
// KURAL: link listesi SEO envanterinden gelir (fetchCityDistricts — /istanbul hub'ının
// kullandığı kaynak; ikinci bir ilçe listesi KURULMAZ). Teslimat süresi, cutoff ve
// "aynı gün" rozeti yalnız Delivery Motor / CMS'ten gelir; buradaki satır bir vaat değil,
// yalnız sayfa adresidir.
//
// Saf modül (ağ yok) → node --test ile sınanır.

export interface DistrictLinkSource {
  slug: string;
  name: string;
  /** Taşınmış ilçe sayfasının gerçek adresi (ör. /maltepe-cicek-siparisi). */
  href?: string;
}

export interface DistrictLink {
  slug: string;
  name: string;
  href: string;
}

/** Envanter satırlarını linke çevirir. `href` yoksa /{il}/{ilçe} adresi `resolve`
 * (finalPathOf) ile 301'in son hedefine çözülür → link 301 hop'u taşımaz. */
export function districtLinks(
  citySlug: string,
  districts: readonly DistrictLinkSource[],
  resolve: (path: string) => string = (p) => p,
): DistrictLink[] {
  const seen = new Set<string>();
  const out: DistrictLink[] = [];
  for (const d of districts) {
    if (!d.slug || seen.has(d.slug)) continue;
    seen.add(d.slug);
    out.push({ slug: d.slug, name: d.name, href: d.href ?? resolve(`/${citySlug}/${d.slug}`) });
  }
  return out;
}

/** CMS/Motor kaydı olan ilçeleri (ad üzerinden slug karşılaştırması) listeden düşer:
 * kartı zaten çizilen ilçe tekrar edilmez. */
export function districtsWithout(
  links: readonly DistrictLink[],
  existingNames: readonly string[],
  slugify: (value: string) => string,
): DistrictLink[] {
  const taken = new Set(existingNames.map(slugify));
  return links.filter((l) => !taken.has(l.slug));
}
