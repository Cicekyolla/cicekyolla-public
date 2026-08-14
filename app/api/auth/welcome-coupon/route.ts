import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

/** Hoş geldin kupon KODU — yalnız giriş yapmış üyeye. Oturum yoksa 401. */
export async function GET(request: NextRequest) {
  try {
    const upstream = await fetch(`${API_ORIGIN}/api/auth/welcome-coupon`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
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
