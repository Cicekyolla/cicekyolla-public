import { NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function GET(request: Request) {
  try {
    // Yalnız `token` iletilir; gelen sorgu dizesi olduğu gibi geçirilmez.
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const upstream = await fetch(
      `${API_ORIGIN}/api/auth/sifre-sifirla/gecerli?token=${encodeURIComponent(token)}`,
      { method: "GET", cache: "no-store" }
    );
    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
