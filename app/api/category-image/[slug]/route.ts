import { NextRequest, NextResponse } from "next/server";
import { fetchProducts } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryIdBySlug, findCategoryNodeBySlug } from "@/lib/catalog";
import { isLegacyPleskMedia } from "@/lib/media";

const CACHE_CONTROL = "public, s-maxage=1800, stale-while-revalidate=86400";

function placeholderSvg(label: string): string {
  const safe = label.replace(/[<>&"']/g, "").slice(0, 42) || "ÇiçekYolla";
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${safe}">
      <defs>
        <radialGradient id="bg" cx="30%" cy="20%" r="120%">
          <stop offset="0%" stop-color="#C084FC"/>
          <stop offset="55%" stop-color="#7C3AED"/>
          <stop offset="100%" stop-color="#4C1D95"/>
        </radialGradient>
      </defs>
      <rect width="800" height="800" rx="80" fill="url(#bg)"/>
      <circle cx="400" cy="330" r="118" fill="rgba(255,255,255,.12)"/>
      <path d="M400 235c50 0 90 40 90 90s-40 90-90 90-90-40-90-90 40-90 90-90Zm0 210c78 0 142 45 170 112H230c28-67 92-112 170-112Z" fill="rgba(255,255,255,.82)"/>
      <text x="400" y="650" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="44" font-weight="700">${safe}</text>
    </svg>`;
}

function redirectToImage(image: string, request: NextRequest): NextResponse {
  const target = new URL(image, request.nextUrl.origin);
  const response = NextResponse.redirect(target, 307);
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = decodeURIComponent(params.slug || "").trim();

  try {
    const tree = await getCategoryTree();
    const node = tree ? findCategoryNodeBySlug(tree, slug) : null;

    // 1) Admin/Category Center görseli her zaman önceliklidir.
    if (node) {
      const raw = node as { banner_image?: unknown; icon?: unknown; image?: unknown };
      const categoryImage =
        (typeof raw.banner_image === "string" && raw.banner_image) ||
        (typeof raw.icon === "string" && raw.icon) ||
        (typeof raw.image === "string" && raw.image) ||
        "";

      if (categoryImage && !isLegacyPleskMedia(categoryImage)) {
        return redirectToImage(categoryImage, request);
      }
    }

    // 2) Kategori görseli yoksa en yeni aktif ve görselli ürünü kullan.
    const categoryId = tree ? findCategoryIdBySlug(tree, slug) : null;
    if (categoryId) {
      const products = await fetchProducts({
        category_id: categoryId,
        page_size: 12,
        sort: "created_at_desc",
      });
      const image = products.find(
        (product) => product.status === "active" && Boolean(product.cover_image_url)
      )?.cover_image_url;

      if (image) return redirectToImage(image, request);
    }
  } catch {
    // Katalog geçici olarak erişilemezse kırık resim yerine placeholder döner.
  }

  return new NextResponse(placeholderSvg(slug), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
