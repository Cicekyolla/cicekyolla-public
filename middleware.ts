import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_INDEXABLE } from "@/lib/site-config";

export function middleware(req: NextRequest) {
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
