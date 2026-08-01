import { NextResponse } from "next/server";
import { fetchProductsPaged, type PublicProductListItem } from "@/lib/api";
import { SITE_URL } from "@/lib/site-config";

export const runtime = "nodejs";
export const revalidate = 3600;

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function abs(value: string): string {
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

function productTypeLabel(type: string): string {
  const map: Record<string, string> = {
    flower: "Çiçekler",
    plant: "Saksı Bitkileri",
    wreath: "Çelenkler",
    artificial: "Yapay Çiçekler",
    gift: "Hediyeler",
    service: "Çiçek Hizmetleri",
  };
  return map[type] ?? "Çiçek ve Hediyeler";
}

function googleCategory(type: string): string {
  if (type === "artificial") return "Home & Garden > Decor > Floral Decor > Artificial Flora";
  return "Home & Garden > Decor > Floral Decor";
}

function toItem(product: PublicProductListItem): string | null {
  if (!product.slug || !product.name || !product.cover_image_url) return null;

  const regularMinor = Number(product.price_minor);
  const saleMinor = Number(product.sale_price_minor);
  if (!Number.isFinite(regularMinor) || regularMinor <= 0) return null;

  const hasSale = Number.isFinite(saleMinor) && saleMinor > 0 && saleMinor < regularMinor;
  const currency = product.currency || "TRY";
  const availability = product.stock_quantity > 0 ? "in_stock" : "out_of_stock";
  const description = product.same_day_available
    ? `${product.name}, İstanbul'da uygun bölgelere aynı gün teslimat seçeneğiyle ÇiçekYolla tarafından hazırlanır.`
    : `${product.name}, Türkiye genelinde uygun teslimat seçenekleriyle ÇiçekYolla tarafından hazırlanır.`;

  return `
    <item>
      <g:id>${esc(product.id || product.slug)}</g:id>
      <g:title>${esc(product.name)}</g:title>
      <g:description>${esc(description)}</g:description>
      <g:link>${esc(abs(`/urun/${product.slug}`))}</g:link>
      <g:image_link>${esc(abs(product.cover_image_url))}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${(regularMinor / 100).toFixed(2)} ${esc(currency)}</g:price>${hasSale ? `
      <g:sale_price>${(saleMinor / 100).toFixed(2)} ${esc(currency)}</g:sale_price>` : ""}
      <g:brand>ÇiçekYolla</g:brand>
      <g:identifier_exists>false</g:identifier_exists>
      <g:product_type>${esc(productTypeLabel(product.product_type))}</g:product_type>
      <g:google_product_category>${esc(googleCategory(product.product_type))}</g:google_product_category>
      <g:custom_label_0>${esc(product.delivery_scope || "standard")}</g:custom_label_0>
      <g:custom_label_1>${product.same_day_available ? "same_day" : "standard_delivery"}</g:custom_label_1>
    </item>`;
}

async function fetchAllProducts(): Promise<PublicProductListItem[]> {
  const products: PublicProductListItem[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await fetchProductsPaged({ page, page_size: PAGE_SIZE, sort: "created_at_desc" });
    products.push(...result.items);
    if (page >= result.pagination.total_pages || result.items.length === 0) break;
  }

  return products;
}

export async function GET(request: Request) {
  try {
    const products = await fetchAllProducts();
    const items = products.map(toItem).filter((item): item is string => Boolean(item));
    const skipped = products.length - items.length;
    const url = new URL(request.url);

    if (url.searchParams.get("dry_run") === "1") {
      return NextResponse.json(
        {
          source: "new-cicekyolla-api",
          active_products_read: products.length,
          eligible_products: items.length,
          skipped_products: skipped,
          feed_url: abs("/api/merchant-feed.xml"),
          mutation: false,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ÇiçekYolla Ürün Feed'i</title>
    <link>${esc(SITE_URL)}</link>
    <description>ÇiçekYolla canlı ürün kataloğu</description>${items.join("")}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Merchant-Products": String(items.length),
        "X-Merchant-Skipped": String(skipped),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "merchant_feed_unavailable", mutation: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
