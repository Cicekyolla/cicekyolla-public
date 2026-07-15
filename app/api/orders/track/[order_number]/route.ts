import { NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ order_number: string }> },
) {
  try {
    const { order_number } = await params;
    const res = await fetch(`${API_ORIGIN}/api/orders/track/${encodeURIComponent(order_number)}`);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
