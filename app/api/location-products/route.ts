// ---------------------------------------------------------------------------
// LOKASYON ÜRÜNLERİ PROXY (ADDITIVE — Faz 1). Tarayıcıdaki "Daha Fazla Göster"
// ve filtre çipleri CORS'a takılmadan aynı origin üzerinden API'nin public
// coverage ucunu tüketir. Auth yok; yalnız GET; parametreler birebir geçirilir.
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const PASS_PARAMS = ["neighborhood", "page", "page_size", "is_bestseller", "is_new", "is_featured", "category_id"] as const;

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const city = sp.get("city") ?? "";
  const district = sp.get("district") ?? "";
  if (!SLUG_RE.test(city) || !SLUG_RE.test(district)) {
    return NextResponse.json({ error: "invalid_location" }, { status: 400 });
  }
  const out = new URLSearchParams();
  for (const key of PASS_PARAMS) {
    const value = sp.get(key);
    if (value != null && value !== "") out.set(key, value);
  }
  const qs = out.toString();
  const url = `${API_ORIGIN}/api/public/delivery/zones/${city}/${district}/products${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return NextResponse.json({ error: "upstream_error" }, { status: res.status || 502 });
    }
    return NextResponse.json(json, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
