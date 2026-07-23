import { NextResponse } from "next/server";

// Public: aktif Havale/EFT IBAN'ları (backend /api/public/bank-accounts — auth yok).
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/bank-accounts`, { cache: "no-store" });
    const data = await res.json().catch(() => ({ data: [] }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
