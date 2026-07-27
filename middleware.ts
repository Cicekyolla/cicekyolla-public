import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_INDEXABLE } from "@/lib/site-config";
import { resolveLegacyLocation } from "@/lib/legacy-location-redirect";
import legacyCategorySlugs from "@/lib/legacy-category-slugs.json";

const categorySlugs = new Set(legacyCategorySlugs);

export function middleware(req: NextRequest) {
  const legacyLocation = resolveLegacyLocation(req.nextUrl.pathname);
  if (legacyLocation.matched && legacyLocation.destination) {
    return NextResponse.redirect(
      new URL(legacyLocation.destination, req.nextUrl.origin),
      301,
    );
  }

  // "-cicek-ID" hem eski konum hem kategori biçiminde kullanılmış. Gerçek bir
  // konum hedefi bulunamadığında yalnız mevcut kategori envanterinde birebir
  // karşılığı varsa kategoriye yönlendir.
  if (
    legacyLocation.matched &&
    !legacyLocation.destination &&
    legacyLocation.suffix === "cicek"
  ) {
    const categorySlug = `${legacyLocation.normalizedBase}-cicek`;
    if (categorySlugs.has(categorySlug)) {
      return NextResponse.redirect(
        new URL(`/kategori/${categorySlug}`, req.nextUrl.origin),
        301,
      );
    }
  }

  // Konum kalıbına girmeyen eski "/kategori-slug-123" adreslerini korur.
  // Konum gibi görünen ama gerçek hedefi bulunmayan yollar burada özellikle
  // kategoriye çevrilmez; doğal 404 olarak kalır.
  if (!legacyLocation.matched) {
    const legacyCategory = req.nextUrl.pathname.match(/^\/([a-z0-9-]+)-\d+\/?$/);
    if (legacyCategory) {
      return NextResponse.redirect(
        new URL(`/kategori/${legacyCategory[1]}`, req.nextUrl.origin),
        301,
      );
    }
  }

  const res = NextResponse.next();
  const isPreview = req.nextUrl.pathname === "/onizleme";
  if (!SITE_INDEXABLE || isPreview) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  if (isPreview) {
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("Cache-Control", "private, no-store");
  }
  return res;
}

export const config = {
  matcher: [
    "/onizleme",
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sitemaps|checkout|sepet|hesabim|giris|siparis-takibi|siparis-takip|.*\\..*).*)",
  ],
};
