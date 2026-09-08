// GLOBAL VERSION 80 — yaprak filtre modülü (client bundle'a girer; yalnız type import).
import type { V80Product } from "./view";
import type { V80Destination } from "./schema";

/** Çip/sekme filtresi: ürün listesini GERÇEK üyelik/teslimat alanıyla süzer.
 *  Kargo şehirleri (İstanbul dışı) yalnız kargolanabilir ürünleri gösterir. */
export function applyFilters(products: V80Product[], filters: { category?: string | null; destination?: V80Destination | null }): V80Product[] {
  let out = products;
  if (filters.category) out = out.filter((p) => p.categorySlugs.includes(filters.category as string));
  if (filters.destination && filters.destination !== "istanbul") out = out.filter((p) => p.cargo);
  return out;
}
