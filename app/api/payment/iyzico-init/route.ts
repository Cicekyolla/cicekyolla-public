import { NextRequest, NextResponse } from "next/server";

// iyzico kart ödemesi (yedek altyapı) → backend /api/public/payment/iyzico/init.
// { order_id, retry_key } ile AYNI siparişe yeni deneme (yeni sipariş OLUŞTURULMAZ);
// sunucu yalnız doğrulanmış başarısız denemeden sonra izin verir.
// Müşteri IP'si backend'e iletilir (iyzico buyer.ip için gerekir). Kart verisi YOK.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.skyversal.xyz";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fwd = request.headers.get("x-forwarded-for") ?? "";
    const res = await fetch(`${API_ORIGIN}/api/public/payment/iyzico/init`, {
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
