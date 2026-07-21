import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";
  const upstream = await fetch(`${API_ORIGIN}/api/auth/account`, {
    headers: { cookie },
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
