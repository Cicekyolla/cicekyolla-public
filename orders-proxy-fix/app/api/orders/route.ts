import { NextResponse } from "next/server";

// Public checkout proxy → backend POST /api/orders (guest, auth'suz).
// Origin: lib/api.ts ile BİREBİR aynı env → kategoriler hangi backend'e gidiyorsa sipariş de oraya.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_ORIGIN}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
