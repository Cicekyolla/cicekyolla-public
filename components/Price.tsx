"use client";

/**
 * Price — vitrindeki TEK fiyat yazımı.
 *
 * Sunucu bileşenleri (kategori/lokasyon/PDP sayfaları) fiyatı doğrudan yazamaz:
 * para birimi istemci durumudur. Bu bileşen köprüdür.
 *
 * HYDRATION: sunucu ve İLK istemci render'ı DAİMA TRY üretir (sağlayıcının
 * başlangıç durumu TRY). Kur geldikten sonra istemci yeniden boyar → mismatch
 * yok, önbelleğe döviz girmez.
 *
 * `minor` DAİMA ürünün TRY kuruş fiyatıdır; çevrim burada yapılır, çağıranda değil.
 */

import { Num } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";

interface Props {
  /** TRY kuruş (taban fiyat). */
  minor: number | string | null | undefined;
  className?: string;
  /** Sepet/checkout toplamlarında "≈" gösterir. Kart/PDP'de KULLANILMAZ. */
  approx?: boolean;
  /** RTL sayı izolasyonu (<bdi>). Kendi <Num>'unu saran çağıran kapatır. */
  isolate?: boolean;
}

export function Price({ minor, className, approx = false, isolate = true }: Props) {
  const { money } = useCurrency();
  const text = money(minor, { approx });
  if (!isolate) return <>{text}</>;
  return <Num className={className}>{text}</Num>;
}
