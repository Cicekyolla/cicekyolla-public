import { NextResponse } from "next/server";

// Public sipariş takip proxy → backend GET /api/orders/track/:order_number.
// Next 14: params düz nesne. Origin: lib/api.ts ile aynı env.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function GET(
  _request: Request,
  { params }: { params: { order_number: string } },
) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/orders/track/${encodeURIComponent(params.order_number)}`);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
