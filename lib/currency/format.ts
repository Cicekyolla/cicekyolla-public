// ---------------------------------------------------------------------------
// PARA BİÇİMİ — tek gösterim noktası.
//
// TRY DAVRANIŞI BİLEREK DEĞİŞTİRİLMEDİ (§41 — mevcut TRY regresyonu sıfır):
//   Bugün canlıdaki `formatMinorTRY` çıktısı "₺1.999"dur (tr-TR, kuruş
//   gösterilmez). Aynı çıktı burada BİREBİR korunur; Türk müşteri hiçbir fark
//   görmez. `formatMinorTRY` de bu fonksiyona devredilir, iki biçim kalmaz.
//
// USD/EUR:
//   Kullanıcının dilinde doğal biçim (Intl) + 2 basamak. Cent gizlenmez:
//   $41 ile $41,45 arasındaki fark oransal olarak anlamlıdır ve gösterilen
//   tutar PayTR'ye giden tutarla birebir aynı olmak zorundadır (§12/§45).
//
// RTL: sayısal değerler zaten `<Num>` (bdi + unicode-bidi:isolate) ile sarılır;
// biçimlendirici oraya dokunmaz.
// ---------------------------------------------------------------------------
import { BASE_CURRENCY, currencyMeta, type Currency } from "./config.ts";

/**
 * minor birim → görüntülenecek metin.
 * @param minor kuruş/cent (tam sayı)
 * @param currency TRY | USD | EUR
 * @param intl BCP-47 etiketi (i18n `intl` alanı; TRY'de yok sayılır)
 */
export function formatMoney(
  minor: number | string | null | undefined,
  currency: Currency = BASE_CURRENCY,
  intl = "tr-TR",
): string {
  if (minor == null) return "";
  const n = Number(minor) / 100;
  if (!Number.isFinite(n)) return "";

  // ── TRY: canlıdaki biçimin AYNISI. Değiştirilmesi yasak. ──
  if (currency === BASE_CURRENCY) {
    return `₺${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
  }

  try {
    return new Intl.NumberFormat(intl, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Desteklenmeyen locale/ortam → sembol + sabit biçim (asla boş dönmez).
    return `${currencyMeta(currency).symbol}${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
