// lib/global/v80/navPriority.ts — 11 Kas 2026 (ADDITIVE): 13 dil başlık/alt bilgi kategori sırası.
//
// SORUN (kanıt): yönetici menü listesi boşken 13 dilin başlığı kataloğun ALFABETİK (ana sayfada canlı ürün
// sayısına göre) ilk 6 kategorisini basıyordu → /en menüsü "Birthday Flowers, Collections, Flowers,
// By Delivery Purpose, Flowers for Mom, Flower for My Love"; Güller/Orkideler/Buketler menüde yoktu.
// Kapsayıcı kökler (Çiçekler, Gönderim Amacına Göre, Koleksiyonlar) menüde yer kaplıyordu.
//
// ÇÖZÜM: TR başlık küratörlüğüyle (lib/megaMenuLayout.ts: Buketler, Güller, Orkideler, Saksı Bitkileri) ve
// yurt dışı siparişlerin ana niyetleriyle (doğum günü, sevgiliye, kutuda çiçek) aynı yönde SABİT öncelik.
// Eşleşme dil bağımsız: TR slug'ı veya kategori kimliği (13 dilde ortak). Yalnız o dilde CANLI kategori
// basılır (uydurma bağlantı yok); eksik kalırsa canlı ürün sayısına göre — kapsayıcı kökler hariç — tamamlanır.
// Yönetici menü listesi / kategori sırası kaydedilmişse çağıran onu kullanır (bu modül devreye girmez).

export interface NavCategoryLike {
  slug: string;
  name: string;
  /** O dilde canlı ürün sayısı. */
  live: number;
  id?: number | null;
  trSlug?: string | null;
}

/** Öncelik: TR slug ↔ kategori kimliği (canlı katalogla doğrulandı, 11 Kas 2026). */
export const NAV_PRIORITY: readonly { trSlug: string; id: number }[] = [
  { trSlug: "guller", id: 13 },
  { trSlug: "buketler", id: 24 },
  { trSlug: "orkideler", id: 14 },
  { trSlug: "dogum-gunu-cicekleri", id: 160 },
  { trSlug: "sevgiliye-cicek", id: 148 },
  { trSlug: "kutuda-cicekler", id: 25 },
  { trSlug: "saksi-bitkileri", id: 6 },
  { trSlug: "gecmis-olsun-cicekleri", id: 167 },
  { trSlug: "anneye-cicek", id: 150 },
];

/** Alt kategorileri kapsayan kökler: menüde tek başına bir ürün türü anlatmaz (tamamlamada atlanır). */
export const NAV_CONTAINER: readonly { trSlug: string; id: number }[] = [
  { trSlug: "cicekler", id: 3 },
  { trSlug: "gonderim-amacina-gore", id: 4 },
  { trSlug: "koleksiyonlar", id: 12 },
];

const matches = (c: NavCategoryLike, ref: { trSlug: string; id: number }) =>
  (c.trSlug != null && c.trSlug === ref.trSlug) || (c.id != null && Number(c.id) === ref.id);

/** En fazla `limit` canlı kategori: önce öncelik listesi (sırasıyla), sonra canlı ürün sayısı (kapsayıcılar hariç). */
export function prioritizedNavCategories<T extends NavCategoryLike>(cats: readonly T[], limit = 6): T[] {
  const live = cats.filter((c) => c.live > 0 && c.slug && c.name);
  const out: T[] = [];
  const used = new Set<string>();
  for (const ref of NAV_PRIORITY) {
    if (out.length >= limit) break;
    const c = live.find((x) => matches(x, ref));
    if (c && !used.has(c.slug)) { out.push(c); used.add(c.slug); }
  }
  if (out.length < limit) {
    const rest = live
      .filter((c) => !used.has(c.slug) && !NAV_CONTAINER.some((ref) => matches(c, ref)))
      .sort((a, b) => b.live - a.live || a.name.localeCompare(b.name));
    for (const c of rest) { if (out.length >= limit) break; out.push(c); used.add(c.slug); }
  }
  return out;
}
