import { NextResponse } from "next/server";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export const revalidate = 120;

export async function GET() {
  try {
    const resp = await fetch(`${API_ORIGIN}/api/public/recommendation-config`, { next: { revalidate: 120 } });
    const json = await resp.json().catch(() => null);
    return NextResponse.json(json ?? { data: null }, { status: resp.ok ? 200 : 200 });
  } catch {
    return NextResponse.json({ data: null });
  }
}
