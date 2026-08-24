import { notFound } from "next/navigation";
import { renderSitemap, SITEMAP_TYPES, type SitemapType } from "@/lib/sitemap";
import { localeOfSitemapType, renderLocaleSitemap } from "@/lib/global/sitemap";

export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: { type: string } }) {
  const type = params.type.replace(/\.xml$/, "");
  // GLOBAL Faz 1 (ADDITIVE): locale-de.xml / locale-en.xml — TR tipleri değişmedi.
  const globalLocale = localeOfSitemapType(type);
  if (globalLocale) {
    return new Response(await renderLocaleSitemap(globalLocale), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }
  if (!SITEMAP_TYPES.includes(type as SitemapType)) notFound();

  return new Response(await renderSitemap(type as SitemapType), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
