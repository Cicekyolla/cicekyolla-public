// ---------------------------------------------------------------------------
// FİYAT ÇEVRİMİ — vitrinin TEK hesap noktası.
//
// ⚠ Bu dosya backend'deki `backend/src/fxService.ts` içindeki convertMinor /
//   priceInCurrency ile BİREBİR AYNI ALGORİTMAYI uygular. İkisi ayrışırsa
//   müşteriye gösterilen tutar ile PayTR'ye giden tutar ayrışır — bu yüzden
//   iki tarafta da aynı testler koşar (`price.test.ts`).
//
// KURALLAR:
//   1) Çevrim DAİMA taban (TRY) → hedef yönündedir. USD → EUR gibi çift çevrim
//      YASAK: yuvarlama hatası birikir ve TRY→USD→EUR ≠ TRY→EUR olur (§44).
//   2) Çevrim BİRİM FİYAT seviyesinde yapılır, aritmetik hedef parada sürer.
//      Böylece satırların toplamı ara toplama, ara toplam da ödenen tutara
//      KURUŞU KURUŞUNA eşittir (§45).
//   3) Tek yuvarlama noktası convertMinor'dır. Kart, PDP, sepet, checkout
//      hepsi buradan geçer; hiçbiri kendi hesabını yapmaz (§11).
// ---------------------------------------------------------------------------
import { BASE_CURRENCY, type Currency } from "./config.ts";

/** 1 birim para birimi kaç TRY (TCMB döviz alış). TRY daima 1. */
export type RateTable = Partial<Record<Currency, number>>;

/**
 * TRY kuruşu hedef para biriminin minor birimine çevirir.
 * Aynı (baseMinor, rate) daima aynı sonucu verir (deterministik).
 */
export function convertMinor(baseMinor: number, rate: number): number {
  if (!Number.isFinite(baseMinor) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("currency: invalid conversion input");
  }
  return Math.round(baseMinor / rate);
}

/** Kur tablosundan güvenli kur çözümü. Kur yoksa null → çağıran TRY'ye düşer. */
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

/** Sipariş toplamını hedef para biriminde hesaplar (backend ile aynı algoritma). */
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
