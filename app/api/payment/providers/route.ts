import { NextResponse } from "next/server";

// Kart ödeme sırası (PAYMENT_PRIMARY / PAYMENT_FALLBACK) → yalnız sağlayıcı ADLARI.
// Hata durumunda vitrin bugünkü davranışa (PayTR) düşer.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.skyversal.xyz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/payment/providers`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ data: { primary: "paytr", fallback: null, fallback_enabled: false } }, { headers: { "Cache-Control": "no-store" } });
  }
}
