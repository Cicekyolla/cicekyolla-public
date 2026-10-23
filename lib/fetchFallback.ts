// =============================================================================
// fetchFallback.ts — "son çare" okumasının isteği (SAF, birim testli)
// -----------------------------------------------------------------------------
// CPU OLAYI (23 Eki 2026, Skyversal): ürün listesi / ürün / kategori ağacı okumaları
// önbellekli istek başarısız olunca son çare olarak `cache: "no-store"` ile tekrarlanıyordu.
// ISR çizimi sırasında (ana sayfa, lokasyon, ürün, blog) no-store bir fetch Next 14'te
// sayfayı "static → dynamic at runtime" hatasıyla düşürür: yeniden üretim her istekte
// baştan denenir (boşta ~1 çekirdek CPU) ve ilk kez üretilen sayfa 500 döner.
//
// Kural: statik/ISR çiziminde son çare de ÖNBELLEKLİ bir tekrardır. Next yalnız 200
// yanıtı önbelleğe yazdığı için (patch-fetch) başarısız ilk denemenin kaydı yoktur →
// tekrar gerçekten API'ye gider. `x-cy-retry` başlığı tekrarın istek içi tekilleştirmeye
// (aynı URL + başlık) takılmamasını sağlar. Dinamik çizimde davranış aynen: no-store.
// =============================================================================
export const RETRY_HEADER = "x-cy-retry";

export function lastResortInit(
  staticRender: boolean,
  headers: Record<string, string>,
  revalidate: number,
): RequestInit {
  return staticRender
    ? ({ headers: { ...headers, [RETRY_HEADER]: "1" }, next: { revalidate } } as RequestInit)
    : { headers, cache: "no-store" };
}
