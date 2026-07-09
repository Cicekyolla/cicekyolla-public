import { NextResponse } from "next/server";
import { fetchProducts, type PublicProductListItem } from "@/lib/api";

// ---------------------------------------------------------------------------
// DELIVERY ALTERNATIVES — Conversion Recovery
// Ürün adrese gönderilemiyorsa: KARGOYA UYGUN alternatif ürünleri döndürür.
// Kargoya uygun tipler = plant | artificial | gift (033: same_day_and_cargo).
// Canlı çiçek (flower) / çelenk (wreath) = İstanbul içi -> GÖSTERİLMEZ.
// TEK KAYNAK canlı katalog (fetchProducts); mock YOK. Backend DEĞİŞMEZ.
// SAĞLAM: geniş çekip client-side tipe filtreler (bilinen-çalışan parametreler).
// ---------------------------------------------------------------------------
const CARGO_TYPES = ["plant", "artificial", "gift"];

export const revalidate = 120;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exclude = Number(searchParams.get("exclude") || 0);
  const categoryId = Number(searchParams.get("category") || 0);
  const price = Number(searchParams.get("price") || 0);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 12), 1), 20);

  try {
    // Bilinen-çalışan çağrılar (homepage ile aynı desen): geniş + çok satan + (varsa) kategori.
    const calls: Promise<PublicProductListItem[]>[] = [
      fetchProducts({ page_size: 48 }),
      fetchProducts({ is_bestseller: true, page_size: 24 }),
    ];
    if (categoryId) calls.push(fetchProducts({ category_id: categoryId, page_size: 24 }));
    const lists = await Promise.all(calls);

    const seen = new Set<number>();
    const merged: PublicProductListItem[] = [];
    // Kategori önceliği: kategori listesi (varsa) en başta merge edilsin.
    const ordered = categoryId ? [lists[2] ?? [], lists[1], lists[0]] : [lists[1], lists[0]];
    for (const p of ordered.flat()) {
      if (!p.cover_image_url) continue;                 // görselsiz gösterme
      if (exclude && p.id === exclude) continue;        // mevcut ürünü hariç tut
      if (!CARGO_TYPES.includes(p.product_type)) continue; // yalnız kargoya uygun tip
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
      id: p.id, name: p.name, slug: p.slug,
      price_minor: p.price_minor, sale_price_minor: p.sale_price_minor,
      cover_image_url: p.cover_image_url, product_type: p.product_type,
      is_bestseller: p.is_bestseller,
    }));

    return NextResponse.json({ items, _debug: { pooled: lists.flat().length, cargo: merged.length } });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
