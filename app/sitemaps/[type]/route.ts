import { notFound } from "next/navigation";
import {
  parseNeighborhoodShard,
  renderNeighborhoodShardOrNull,
  renderSitemapOrNull,
  SITEMAP_TYPES,
  type SitemapType,
} from "@/lib/sitemap";
import { localeOfSitemapType, renderLocaleSitemapOrNull } from "@/lib/global/sitemap";
import { sitemapResponse } from "@/lib/sitemapSources";

export const revalidate = 300;

// EK (SEO YAYIN ZİNCİRİ): yanıtlar tek üreticiden geçer (lib/sitemapSources.ts →
// sitemapResponse). Kaynak okunabildiyse 200 ve bugünkü başlıklar BİREBİR
// (s-maxage=300, SWR 600); kaynak OKUNAMADIYSA (render null döner) boş/eksik bir
// 200 urlset yerine 503 + Retry-After: 300 + Cache-Control: no-store — CDN boş
// sitemap'i artık saklamaz. Önizleme ortamındaki meşru boş çıktı 200 kalır.
export async function GET(_request: Request, { params }: { params: { type: string } }) {
  const type = params.type.replace(/\.xml$/, "");
  // GLOBAL Faz 1 (ADDITIVE): locale-de.xml / locale-en.xml — TR tipleri değişmedi.
  const globalLocale = localeOfSitemapType(type);
  if (globalLocale) {
    return sitemapResponse(await renderLocaleSitemapOrNull(globalLocale));
  }
  // EK (MAHALLE SHARD) — ADDITIVE: neighborhoods-1.xml, neighborhoods-2.xml ...
  // Çıplak "neighborhoods" shard 1'e denk gelir; bugün tek shard olduğu için
  // çıktı bugünküyle birebir aynıdır (geriye dönük uyumlu).
  const shard = parseNeighborhoodShard(type);
  if (shard !== null) {
    return sitemapResponse(await renderNeighborhoodShardOrNull(shard));
  }
  if (!SITEMAP_TYPES.includes(type as SitemapType)) notFound();

  return sitemapResponse(await renderSitemapOrNull(type as SitemapType));
}
