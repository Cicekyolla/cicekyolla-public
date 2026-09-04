// ---------------------------------------------------------------------------
// GÖSTERİM ÇEVRİMİ — vitrinin TEK hesap noktası.
//
// ⚠ Buradan çıkan hiçbir sayı ödemeye, siparişe veya analitiğe GİRMEZ.
//   Gerçek tutar daima TRY tabanıdır (`unit_price_minor`, kuruş).
//
// KURALLAR:
//  1) Çevrim DAİMA taban (TRY) → hedef yönündedir. USD → EUR gibi çift çevrim
//     YASAK: yuvarlama birikir ve TRY→USD→EUR ≠ TRY→EUR olur.
//  2) Çevrim BİRİM FİYAT seviyesinde yapılır, aritmetik hedef parada sürer.
//     Böylece gösterilen satırların toplamı gösterilen ara toplama eşittir;
//     müşteri sepette "satırlar toplamı tutmuyor" görmez.
//  3) Tek yuvarlama noktası convertMinor'dır. Kart, PDP, sepet, checkout
//     hepsi buradan geçer; hiçbir ekran kendi hesabını yapmaz.
// ---------------------------------------------------------------------------
// YALNIZ TİP İTHALİ — bilinçli. Bu dosya saf matematiktir ve çalışma zamanında
// hiçbir modüle bağlı değildir (yaprak modül). Böylece hem Next paketleyicisi
// hem de `node --test` onu doğrudan yükleyebilir; test ile vitrin AYNI kodu koşar.
import type { Currency } from "./config";

/** Taban para birimi. `config.BASE_CURRENCY` ile aynı değer; burada yaprak
 *  kalabilmek için sabit yazılır ve testte eşitliği doğrulanır. */
const BASE_CURRENCY = "TRY" as const;

/** 1 birim para birimi kaç TRY (TCMB MID). TRY daima 1. */
export type RateTable = Partial<Record<Currency, number>>;

/** TRY kuruşu hedef paranın minor birimine çevirir. Deterministik. */
export function convertMinor(baseMinor: number, rate: number): number {
  if (!Number.isFinite(baseMinor) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("currency: invalid conversion input");
  }
  return Math.round(baseMinor / rate);
}

/** Kur tablosundan güvenli çözüm. Kur yoksa null → çağıran TRY'ye düşer. */
export function rateFor(rates: RateTable | null | undefined, currency: Currency): number | null {
  if (currency === BASE_CURRENCY) return 1;
  const r = rates?.[currency];
  return Number.isFinite(r) && (r as number) > 0 ? (r as number) : null;
}

export interface PriceLine {
  /** Ürünün TRY birim fiyatı (kuruş) — DEĞİŞMEZ taban. */
  unit_price_minor: number;
  quantity: number;
}

export interface PricedTotals {
  unit_minor: number[];
  subtotal_minor: number;
  discount_minor: number;
  delivery_fee_minor: number;
  total_minor: number;
}

/** Sepet/checkout toplamının GÖSTERİM karşılığı. Gerçek toplam TRY kalır. */
export function priceInCurrency(
  lines: PriceLine[],
  discountBaseMinor: number,
  deliveryFeeBaseMinor: number,
  rate: number,
): PricedTotals {
  const unit_minor = lines.map((l) => convertMinor(l.unit_price_minor, rate));
  const subtotal_minor = lines.reduce((sum, l, i) => sum + unit_minor[i] * l.quantity, 0);
  const discount_minor = convertMinor(discountBaseMinor, rate);
  const delivery_fee_minor = convertMinor(deliveryFeeBaseMinor, rate);
  return {
    unit_minor,
    subtotal_minor,
    discount_minor,
    delivery_fee_minor,
    total_minor: Math.max(0, subtotal_minor - discount_minor + delivery_fee_minor),
  };
}
