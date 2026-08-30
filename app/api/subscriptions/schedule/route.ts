import { NextResponse, type NextRequest } from 'next/server';

// Public proxy: abonelik teslimat takvimi önizleme.
//
// NEDEN PROXY: Bu uç TARAYICIDAN çağrılır. Backend'e doğrudan istek CORS'a
// takılır (API public uçlarında Access-Control-Allow-Origin göndermiyor;
// 30 Ağustos'ta gerçek tarayıcıda doğrulandı). Sitenin mevcut deseni de
// budur — app/api/* altındaki tüm proxy'ler aynı işi yapar. Yeni bir CORS
// politikası açmak yerine kurulu desen kullanılır.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'https://cicekyolla-api.onrender.com';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get('planId') ?? '';
  const startDate = req.nextUrl.searchParams.get('startDate') ?? '';
  if (!planId || !startDate) {
    return NextResponse.json(
      { error: { message: 'Plan ve tarih gerekli.' } }, { status: 400 },
    );
  }
  try {
    const res = await fetch(
      `${API_ORIGIN}/api/public/subscriptions/schedule/preview`
      + `?planId=${encodeURIComponent(planId)}&startDate=${encodeURIComponent(startDate)}`,
      { cache: 'no-store' },
    );
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { error: { message: 'Takvim oluşturulamadı.' } }, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { message: 'Bağlantı kurulamadı. Lütfen tekrar deneyin.' } }, { status: 502 },
    );
  }
}
