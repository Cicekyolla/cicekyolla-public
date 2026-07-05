import { NextResponse } from "next/server";
import { fetchProducts, formatMinorTRY } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchProduct = {
  id: number;
  name: string;
  href: string;
  image: string;
  price: string;
  badge?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);

  if (query.length < 2) {
    return NextResponse.json({ products: [] satisfies SearchProduct[] });
  }

  const rows = await fetchProducts({ q: query, page_size: 6, sort: "name_asc" });
  const products: SearchProduct[] = rows
    .filter((p) => p.cover_image_url)
    .slice(0, 6)
    .map((p) => {
      const hasSale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
      return {
        id: p.id,
        name: p.name,
        href: `/urun/${p.slug}`,
        image: p.cover_image_url ?? "",
        price: formatMinorTRY(hasSale ? p.sale_price_minor : p.price_minor),
        badge: hasSale ? "İndirim" : p.is_new ? "Yeni" : p.is_bestseller ? "Çok Satan" : undefined,
      };
    });

  return NextResponse.json({ products });
}
