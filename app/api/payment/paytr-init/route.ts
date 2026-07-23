import { NextRequest, NextResponse } from "next/server";

// PayTR kart ödemesi başlat → backend /api/public/payment/paytr/init.
// Sipariş 'ödeme bekliyor' oluşur (numara müşteriye dönmez), iframe token döner.
// Müşteri IP'si backend'e iletilir (x-forwarded-for) — PayTR user_ip için gerekir.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fwd = request.headers.get("x-forwarded-for") ?? "";
    const res = await fetch(`${API_ORIGIN}/api/public/payment/paytr/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
        "x-forwarded-for": fwd,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
