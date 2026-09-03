import { NextResponse } from "next/server";

// Kur proxy'si → backend GET /api/public/fx/rates.
// Vitrindeki TEK kur kaynağı; ürün başına istek YOK (§ N+1 yok).
//
// Yanıt kullanıcıya özel DEĞİLDİR (herkes için aynı TCMB bülteni), bu yüzden
// edge'de paylaşılabilir. Kullanıcının SEÇTİĞİ para birimi burada değil,
// tarayıcıdaki `cy_currency` cookie'sindedir — HTML önbelleğine hiç girmez.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

/** Kur servisi erişilemezse TRY-only sözleşme. Vitrin TRY ile çalışmaya devam eder. */
const TRY_ONLY = {
  data: {
    base: "TRY",
    rates: { TRY: 1 },
    available: ["TRY"],
    rate_id: null,
    bulletin_date: null,
    source: null,
    fetched_at: null,
    stale: true,
  },
};

export const revalidate = 300;

export async function GET() {
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/fx/rates`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json(TRY_ONLY, { status: 200 });
    const data = await res.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400",
      },
    });
  } catch {
    // Kur ucu çökse bile 200 + TRY döner: mağaza ASLA kur yüzünden durmaz.
    return NextResponse.json(TRY_ONLY, { status: 200 });
  }
}
