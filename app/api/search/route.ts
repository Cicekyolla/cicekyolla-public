import { NextResponse } from "next/server";
import { fetchProducts } from "@/lib/api";

// Ürün arama endpoint'i (header/typeahead). Kaynak: backend /api/products?q=.
// TEK KAYNAK canlı katalog; mock yok. Response: { products: SearchProduct[] }.
export interface SearchProduct {
  slug: string;
  name: string;
  cover_image_url: string | null;
  price_minor: number | string;
}

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const rows = await fetchProducts({ q: query, page_size: 6, sort: "name_asc" });
  const products: SearchProduct[] = rows
    .filter((p) => p.cover_image_url)
    .slice(0, 6)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      cover_image_url: p.cover_image_url,
      price_minor: p.price_minor,
    }));

  return NextResponse.json({ products });
}
