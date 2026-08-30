import { NextResponse, type NextRequest } from 'next/server';

// Public proxy: abonelik TALEBİ oluşturma.
//
// NEDEN PROXY: tarayıcıdan çağrılır → CORS. Sitenin kurulu deseni (app/api/*).
// Gövde OLDUĞU GİBİ iletilir; doğrulama, takvim hesabı ve fiyat kontrolü
// backend'in işidir — burada iş kuralı UYGULANMAZ, ikinci bir doğrulama
// katmanı kurulmaz.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'https://cicekyolla-api.onrender.com';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: 'Geçersiz istek.' } }, { status: 400 });
  }
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(
      data ?? { error: { message: 'Abonelik oluşturulamadı.' } }, { status: res.status },
    );
  } catch {
    return NextResponse.json(
      { error: { message: 'Bağlantı kurulamadı. Lütfen tekrar deneyin.' } }, { status: 502 },
    );
  }
}
