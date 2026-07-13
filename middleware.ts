// Yalnız /onizleme için güvenlik header'ları — indexleme/önbellek/referrer sızıntısı yok.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
export const config = { matcher: ["/onizleme"] };
