import { NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: Request) {
  try {
    const upstream = await fetch(`${API_ORIGIN}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await upstream.text();
    const response = upstream.status === 204
      ? new NextResponse(null, { status: 204 })
      : new NextResponse(data, {
          status: upstream.status,
          headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
        });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
