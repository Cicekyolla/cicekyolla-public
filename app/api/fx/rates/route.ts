import { NextResponse } from "next/server";
import { BASE_CURRENCY, CURRENCIES, type Currency } from "@/lib/currency/config";
import { getRates } from "@/lib/currency/rates";

// Vitrinin TEK kur kaynağı. Kategori sayfasında 60 ürün olsa da tek istek atılır.
//
// ⚠ cicekyolla-api'ye HİÇ DOKUNMAZ. Kur doğrudan TCMB'den, bu route handler'da
//   çekilir. Ödeme backend'i para birimi diye bir şey bilmez ve bilmemelidir.
//
// Yanıt kullanıcıya özel DEĞİLDİR (herkes için aynı TCMB bülteni) → edge'de
// paylaşılabilir. Kullanıcının SEÇTİĞİ para birimi burada değil, tarayıcıdaki
// `cy_currency` cookie'sindedir; HTML önbelleğine hiç girmez.

/** Kur alınamazsa TRY-only sözleşme. Vitrin TRY ile çalışmaya devam eder. */
const TRY_ONLY = {
  data: {
    base: BASE_CURRENCY,
    rates: { TRY: 1 },
    available: [BASE_CURRENCY],
    bulletin_date: null,
    source: null,
    stale: true,
  },
};

export const revalidate = 300;

export async function GET() {
  try {
    const fx = await getRates();
    // Kur yokluğu bir HATA değil, bir DURUMDUR: 200 döner, vitrin kendini daraltır.
    if (!fx) return NextResponse.json(TRY_ONLY, { status: 200 });

    const available = CURRENCIES.map((c) => c.code).filter(
      (c): c is Currency => c === BASE_CURRENCY || (Number.isFinite(fx.rates[c]) && fx.rates[c] > 0),
    );

    return NextResponse.json(
      {
        data: {
          base: fx.base,
          rates: fx.rates,
          available,
          bulletin_date: fx.bulletin_date,
          source: fx.source,
          stale: fx.stale,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400" },
      },
    );
  } catch {
    // Kur ucu çökse bile mağaza ASLA durmaz.
    return NextResponse.json(TRY_ONLY, { status: 200 });
  }
}
