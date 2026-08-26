import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    /* 077 — Bu route bir PROXY: iletilmezse API, Vercel'in IP'sini ve kendi
       user-agent'ını görür; Meta CAPI eşleşmesi (event match quality) bozulur. */
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "";
    const ua = request.headers.get("user-agent") ?? "";
    const res = await fetch(`${API_ORIGIN}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
        ...(ip ? { "x-forwarded-for": ip } : {}),
        ...(ua ? { "user-agent": ua } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
