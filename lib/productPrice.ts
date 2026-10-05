// =============================================================================
// TEK FİYAT KURALI — gösterilen fiyat = JSON-LD fiyatı = TAHSİL EDİLEN fiyat.
//
// KÖK NEDEN: efektif fiyat storefront'ta birden çok yerde, birbirinden farklı
// koşullarla hesaplanıyordu. Ürün sayfası "indirim yalnız 0 < indirim < taban iken
// geçerli" derken JSON-LD "indirim > 0 ise indirim" diyordu (indirim ≥ taban olan
// üründe şema indirimli fiyatı, sayfa taban fiyatı basıyordu); varyantlı üründe
// sayfa ilk varyantın fiyatını, şema ana ürünün fiyatını yazıyordu; bazı vitrin
// kartları geçersiz indirimi de indirim sayıyordu.
//
// KURAL: API'nin sipariş birim fiyatıyla BİREBİR aynıdır
// (cicekyolla-api backend/src/pricing/unitPriceSql.ts VARIANT_UNIT_PRICE_SQL —
// siparişin faturalandığı ifade). Sıra:
//   1) varyantın indirimi geçerliyse (0 < indirim < varyant tabanı; varyant tabanı
//      = varyant fiyatı, yoksa ürün fiyatı)                    → varyant indirimi
//   2) varyantın kendi fiyatı varsa                             → varyant fiyatı
//   3) ürünün indirimi geçerliyse (0 < indirim < ürün fiyatı)   → ürün indirimi
//   4) aksi hâlde                                               → ürün fiyatı
// Varyant verilmezse (ya da alanları boşsa) 1–2 düşer; kural ürün kuralına iner.
// Bağımlılığı yoktur (sunucu + istemci bileşenleri ve testler aynı dosyayı yükler).
// =============================================================================

type Minor = number | string | null | undefined;
export interface PriceSource { price_minor?: Minor; sale_price_minor?: Minor }

export interface ResolvedPrice {
  /** Tahsil edilen birim fiyat (kuruş). */
  unitMinor: number;
  /** İndirim varken üstü çizili gösterilen taban fiyat (kuruş); indirim yoksa unitMinor ile aynı. */
  baseMinor: number;
  /** Geçerli bir indirim uygulanıyor mu? */
  hasSale: boolean;
}

function num(v: Minor): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Ürünün (ve seçili varyantın) efektif birim fiyatı — API sipariş kuralıyla aynı. */
export function resolveUnitPrice(product: PriceSource, variant?: PriceSource | null): ResolvedPrice {
  const pPrice = num(product.price_minor) ?? 0;
  const pSale = num(product.sale_price_minor);
  const vPrice = variant ? num(variant.price_minor) : null;
  const vSale = variant ? num(variant.sale_price_minor) : null;
  const vBase = vPrice ?? pPrice;
  if (vSale !== null && vSale > 0 && vSale < vBase) return { unitMinor: vSale, baseMinor: vBase, hasSale: true };
  if (vPrice !== null) return { unitMinor: vPrice, baseMinor: vPrice, hasSale: false };
  if (pSale !== null && pSale > 0 && pSale < pPrice) return { unitMinor: pSale, baseMinor: pPrice, hasSale: true };
  return { unitMinor: pPrice, baseMinor: pPrice, hasSale: false };
}
