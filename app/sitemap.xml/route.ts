import { renderSitemapIndex, renderSitemapIndexOrNull } from "@/lib/sitemap";
import { sitemapIndexFailureAction, sitemapResponse } from "@/lib/sitemapSources";

export const revalidate = 300;

// EK (SEO YAYIN ZİNCİRİ): mahalle shard sayısı okunamadıysa (null) eksik index
// 200 ile verilmez. Bu rota bir ISR ön-üretimidir (revalidate 300): Next yanıtı
// durum koduyla birlikte ISR kaydı yapar ve `no-store` başlığına bakmaz → burada
// 503 DÖNÜLMEZ (son iyi index'in yerine 503 saklanırdı). Çalışma zamanında hata
// FIRLATILIR: yenileme başarısız sayılır, ISR son iyi kopyayı sunmayı sürdürür
// ve kısa süre sonra yeniden dener. Derlemede (fırlatmak derlemeyi düşürür)
// bugünkü render kullanılır. Karar: lib/sitemapSources.ts → sitemapIndexFailureAction.
// Başarılı yanıtın başlıkları bugünküyle birebir aynıdır.
export async function GET() {
  const xml = await renderSitemapIndexOrNull();
  if (xml !== null) return sitemapResponse(xml);
  if (sitemapIndexFailureAction(process.env.NEXT_PHASE) === "legacy") {
    return sitemapResponse(await renderSitemapIndex());
  }
  throw new Error("sitemap index: mahalle shard sayısı okunamadı — son iyi kopya korunur");
}
