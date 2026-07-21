import { NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function GET(
  request: Request,
  { params }: { params: { order_number: string } },
) {
  try {
    const input = new URL(request.url);\n    const phone = input.searchParams.get('phone') ?? '';\n    const email = input.searchParams.get('email') ?? '';\n    const target = new URL(`${API_ORIGIN}/api/orders/track/${encodeURIComponent(params.order_number)}`);\n    target.searchParams.set('phone', phone);\n    target.searchParams.set('email', email);\n    const res = await fetch(target.toString());
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
