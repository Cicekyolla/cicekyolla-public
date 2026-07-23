import { NextRequest, NextResponse } from "next/server";

// Sonuç sayfası için ödeme durumu → backend /api/public/payment/paytr/status/:oid.
// Sipariş numarası yalnız ödeme onaylıysa döner.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function GET(_request: NextRequest, { params }: { params: { oid: string } }) {
  try {
    const oid = encodeURIComponent(params.oid);
    const res = await fetch(`${API_ORIGIN}/api/public/payment/paytr/status/${oid}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
