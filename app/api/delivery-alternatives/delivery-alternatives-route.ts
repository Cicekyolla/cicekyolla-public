import { NextResponse } from "next/server";
import { fetchProducts, type PublicProductListItem } from "@/lib/api";

// ---------------------------------------------------------------------------
// DELIVERY ALTERNATIVES — Conversion Recovery
// Ürün adrese gönderilemiyorsa: KARGOYA UYGUN alternatif ürünleri döndürür.
// Kargoya uygun tipler = plant | artificial | gift (033 backfill: same_day_and_cargo).
// Canlı çiçek (flower) / çelenk (wreath) = İstanbul içi (same_day_courier) -> GÖSTERİLMEZ.
// TEK KAYNAK canlı katalog (fetchProducts); mock YOK. Backend DEĞİŞMEZ.
// ---------------------------------------------------------------------------
const CARGO_TYPES = ["plant", "artificial", "gift"];

export const revalidate = 120;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exclude = Number(searchParams.get("exclude") || 0);
  const categoryId = Number(searchParams.get("category") || 0);
  const price = Number(searchParams.get("price") || 0);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 20);

  try {
    // Kargoya uygun tipleri paralel çek + (varsa) aynı kategori önceliği.
    const typeLists = await Promise.all(
      CARGO_TYPES.map((t) => fetchProducts({ product_type: t, page_size: 12, sort: "created_at_desc" })),
    );
    let sameCat: PublicProductListItem[] = [];
    if (categoryId) {
      const cat = await fetchProducts({ category_id: categoryId, page_size: 12 });
      sameCat = cat.filter((p) => CARGO_TYPES.includes(p.product_type));
    }

    const seen = new Set<number>();
    const merged: PublicProductListItem[] = [];
    for (const p of [...sameCat, ...typeLists.flat()]) {
      if (!p.cover_image_url) continue;                 // görselsiz gösterme
      if (exclude && p.id === exclude) continue;        // mevcut ürünü hariç tut
      if (!CARGO_TYPES.includes(p.product_type)) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }

    // Sıralama: 1) çok satan  2) fiyat yakınlığı (verildiyse)
    merged.sort((a, b) => {
      if (a.is_bestseller !== b.is_bestseller) return a.is_bestseller ? -1 : 1;
      if (price > 0) return Math.abs(Number(a.price_minor) - price) - Math.abs(Number(b.price_minor) - price);
      return 0;
    });

    const items = merged.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price_minor: p.price_minor,
      sale_price_minor: p.sale_price_minor,
      cover_image_url: p.cover_image_url,
      product_type: p.product_type,
      is_bestseller: p.is_bestseller,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
