import { notFound } from "next/navigation";
import { renderSitemap, SITEMAP_TYPES, type SitemapType } from "@/lib/sitemap";

export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: { type: string } }) {
  const type = params.type.replace(/\.xml$/, "");
  if (!SITEMAP_TYPES.includes(type as SitemapType)) notFound();

  return new Response(await renderSitemap(type as SitemapType), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
