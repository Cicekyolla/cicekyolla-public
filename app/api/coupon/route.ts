import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_ORIGIN}/api/public/coupon`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Üye oturumu iletilir: API customer_id'yi oturumdan türetir; böylece
        // first_order_only / usage_per_customer kuponları sepette DOĞRU değerlendirilir.
        // İstek gövdesi DEĞİŞMEDİ (mevcut sözleşme korunur).
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
