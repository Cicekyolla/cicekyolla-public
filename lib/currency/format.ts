// ---------------------------------------------------------------------------
// PARA BİÇİMİ — tek gösterim noktası.
//
// TRY KURALI (Madde 3 — kuruşlu fiyat görünümü):
//   Tam liralı tutar canlıdaki gibi kuruşsuz yazılır: "₺1.999" (tr-TR). Bu
//   çıktı BİREBİR korunur; kataloğun ~%98'i (1677/1708) tam liralıdır.
//   Kuruşu SIFIR OLMAYAN tutar artık gizlenmez, iki basamakla yazılır:
//   199902 → "₺1.999,02", 3899 → "₺38,99", 199950 → "₺1.999,50".
//   Gerekçe: tahsil edilen tutar kuruşlu (API VARIANT_UNIT_PRICE_SQL kuruşu
//   aynen faturalar; JSON-LD offers.price ve merchant feed "1999.02" basar);
//   vitrinin "₺1.999" göstermesi = görünen ≠ tahsil edilen. Yuvarlama YOK.
//   Kural TEK yerdir: `tryFractionDigits` — diğer TRY biçimlendiriciler
//   (memberAccountView, subscription/theme, admin formatMinor) buna hizalıdır.
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

/**
 * TRY için gösterilecek kesir basamağı: kuruş 0 → 0 basamak ("₺1.999"),
 * kuruş var → 2 basamak ("₺1.999,02"). Yarım basamak ("₺1.999,5") ÜRETİLMEZ.
 * @param minor kuruş (tam sayı; sayı olmayan/kesirli değer yuvarlanır)
 */
export function tryFractionDigits(minor: number): 0 | 2 {
  return Math.round(Math.abs(minor)) % 100 === 0 ? 0 : 2;
}

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
    // Kuruş 0 → bugünkü çıktı aynen ("₺1.999"); kuruş var → "₺1.999,02".
    const digits = tryFractionDigits(Number(minor));
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
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
