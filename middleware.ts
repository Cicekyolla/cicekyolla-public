import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_INDEXABLE } from "@/lib/site-config";
import { resolveLegacyLocation } from "@/lib/legacy-location-redirect";
import {
  resolveMidCicek,
  locationFallback,
  guardedCategoryTarget,
} from "@/lib/legacy-recovery";
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

  // EK (kurtarma): Konum eşleşti ama whitelist'te yayınlanmış hedef yok.
  // Doğal 404'e düşmek yerine güvenli konum hedefine 301 (il sayfası ya da
  // /urunler). Backend il/ilçe sayfalarını yayınlayıp whitelist genişleyince
  // bu URL'ler otomatik olarak yukarıdaki /il/ilce dalından geçer.
  if (legacyLocation.matched && !legacyLocation.destination) {
    return NextResponse.redirect(
      new URL(locationFallback(legacyLocation.normalizedBase), req.nextUrl.origin),
      301,
    );
  }

  // EK (kurtarma): "{il}-cicek-{ilce}-{id}" ortada-cicek formatı. Ana resolver
  // soneki sonda aradığı için bunu kaçırır; burada güvenli konuma çözülür.
  const midCicek = resolveMidCicek(req.nextUrl.pathname);
  if (midCicek) {
    return NextResponse.redirect(new URL(midCicek, req.nextUrl.origin), 301);
  }

  // Konum kalıbına girmeyen eski "/kategori-slug-123" adreslerini korur.
  // GUARD: hedef kategori gerçekten yoksa var olmayan kategoriye 301 verilmez
  // (301→404 zinciri engellenir); güvenli hedefe (/urunler) düşülür.
  if (!legacyLocation.matched) {
    const legacyCategory = req.nextUrl.pathname.match(/^\/([a-z0-9-]+)-\d+\/?$/);
    if (legacyCategory) {
      return NextResponse.redirect(
        new URL(guardedCategoryTarget(legacyCategory[1]), req.nextUrl.origin),
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
