import { NextResponse } from "next/server";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resp = await fetch(`${API_ORIGIN}/api/public/delivery/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await resp.json().catch(() => ({ error: "invalid_json" }));
    return NextResponse.json(json, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "delivery_check_failed" }, { status: 502 });
  }
}
