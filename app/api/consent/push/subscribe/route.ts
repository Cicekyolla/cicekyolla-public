import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const upstream = await fetch(`${API_ORIGIN}/api/public/consent/push/subscribe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Üye oturumu varsa abonelik üyeye bağlanır (anonim de kabul edilir).
        cookie: request.headers.get("cookie") ?? "",
      },
      body: await request.text(),
      cache: "no-store",
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
