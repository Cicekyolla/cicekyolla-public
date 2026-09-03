"use client";

/**
 * Price — vitrindeki TEK fiyat yazımı.
 *
 * Sunucu bileşenleri (kategori/lokasyon/PDP sayfaları) fiyatı doğrudan
 * yazamaz: para birimi istemci durumudur. Bu bileşen köprüdür.
 *
 * HYDRATION: sunucu ve İLK istemci render'ı DAİMA TRY üretir (sağlayıcının
 * başlangıç durumu TRY'dir). Kur geldikten sonra istemci yeniden boyar.
 * Bu yüzden mismatch YOKTUR ve önbelleğe (ISR/CDN) hiç döviz girmez.
 *
 * `minor` DAİMA ürünün TRY kuruş fiyatıdır — çevrim burada yapılır, çağıranda
 * değil. Böylece hiçbir ekran kendi hesabını yapmaz (§11).
 */

import { Num } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";

interface Props {
  /** TRY kuruş (taban fiyat). */
  minor: number | string | null | undefined;
  className?: string;
  /** RTL sayı izolasyonu (<bdi>) — varsayılan açık. Kendi <Num>'unu saran çağıran kapatır. */
  isolate?: boolean;
}

export function Price({ minor, className, isolate = true }: Props) {
  const { money } = useCurrency();
  const text = money(minor);
  if (!isolate) return <>{text}</>;
  return <Num className={className}>{text}</Num>;
}

/** Fiyatı düz metin olarak gerekiyorsa (sr-only, aria-label, başlık). */
export function usePriceText() {
  return useCurrency().money;
}
