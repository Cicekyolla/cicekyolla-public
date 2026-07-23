import { NextRequest, NextResponse } from "next/server";

// Havale/EFT ile sipariş oluştur → backend /api/public/payment/havale.
// Sipariş 'ödeme bekliyor' oluşur; dönen order_number havale referansıdır.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_ORIGIN}/api/public/payment/havale`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") ?? "" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
