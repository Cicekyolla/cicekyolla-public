import { NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

/** Popup içerikleri + hoş geldin TEKLİFİ + VAPID public key. Kupon kodu BURADA GELMEZ. */
export async function GET() {
  try {
    const upstream = await fetch(`${API_ORIGIN}/api/public/consent/config`, {
      // İçerik admin'den anlık değişebilmeli; ama her istekte upstream'e gitmesin.
      next: { revalidate: 60 },
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
