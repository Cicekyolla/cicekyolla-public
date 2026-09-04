// ---------------------------------------------------------------------------
// PARA BİÇİMİ — tek gösterim noktası.
//
// TRY DAVRANIŞI BİLEREK DEĞİŞTİRİLMEDİ (TRY regresyonu sıfır):
//   Canlıdaki `formatMinorTRY` çıktısı "₺1.999"dur (tr-TR, kuruş gösterilmez).
//   Aynı çıktı burada BİREBİR korunur; Türk müşteri hiçbir fark görmez.
//
// USD/EUR:
//   Kullanıcının dilinde doğal biçim (Intl) + 2 basamak. Cent gizlenmez.
//   `approx` verilirse başına "≈" konur — sepet/checkout toplamlarında kullanılır;
//   ürün kartı ve PDP'de KULLANILMAZ (operatör kararı: gezinme yüzeyleri temiz).
//
// RTL: sayısal değerler `<Num>` (bdi + unicode-bidi:isolate) ile sarılır.
// ---------------------------------------------------------------------------
// YALNIZ TİP İTHALİ — bilinçli (bkz. price.ts). Yaprak modül: Next paketleyicisi
// ve `node --test` aynı dosyayı doğrudan yükler.
import type { Currency } from "./config";

/** `config.BASE_CURRENCY` ile aynı; yaprak kalabilmek için sabit. Testte eşitlenir. */
const BASE_CURRENCY = "TRY" as const;
/** `config.CURRENCIES` sembolleriyle aynı; yalnız geri düşüş biçimi için. */
const SYMBOL: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

export interface FormatOpts {
  /** Başına "≈" koyar. Yalnız sepet/checkout toplamı için. TRY'de yok sayılır. */
  approx?: boolean;
}

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
  opts: FormatOpts = {},
): string {
  if (minor == null) return "";
  const n = Number(minor) / 100;
  if (!Number.isFinite(n)) return "";

  // ── TRY: canlıdaki biçimin AYNISI. Değiştirilmesi yasak. ──
  // TRY gerçek tutardır, yaklaşık değildir → "≈" ASLA eklenmez.
  if (currency === BASE_CURRENCY) {
    return `₺${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
  }

  let out: string;
  try {
    out = new Intl.NumberFormat(intl, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Desteklenmeyen locale/ortam → sembol + sabit biçim (asla boş dönmez).
    out = `${SYMBOL[currency] ?? ""}${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return opts.approx ? `≈ ${out}` : out;
}
