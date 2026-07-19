import { NextResponse } from "next/server";
import { fetchProductBySlug } from "@/lib/api";
import galleryMapJson from "@/lib/gallery-map.json";

const LIFESTYLE_GALLERY = galleryMapJson as Record<string, string[]>;

function isImage(url: string): boolean {
  return !/\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const data = await fetchProductBySlug(params.slug);
  if (!data) return NextResponse.json({ image: null }, { status: 404 });

  const lifestyle = (LIFESTYLE_GALLERY[params.slug] ?? []).find(isImage);
  const sorted = [...data.images].sort((a, b) => a.sort_order - b.sort_order);
  const alternate = sorted.find((image) => image.role !== "cover" && isImage(image.url))
    ?? sorted.filter((image) => isImage(image.url))[1];

  return NextResponse.json(
    { image: lifestyle ?? alternate?.url ?? null },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
