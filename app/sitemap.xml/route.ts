import { renderSitemapIndexOrNull } from "@/lib/sitemap";
import { sitemapResponse } from "@/lib/sitemapSources";

export const revalidate = 300;

// EK (SEO YAYIN ZİNCİRİ): mahalle shard sayısı okunamadıysa (null) eksik index
// 200 ile verilmez → 503 + Retry-After: 300 + no-store (lib/sitemapSources.ts).
// Başarılı yanıtın başlıkları bugünküyle birebir aynıdır.
export async function GET() {
  return sitemapResponse(await renderSitemapIndexOrNull());
}
