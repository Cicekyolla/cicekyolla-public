// C3 (6 Kas 2026) — Garanti mührü metni sayfa dilinde (components/FlowerGuaranteeBadge.tsx).
// Geometri KİLİTLİ (Figma V23): yalnız yay metinleri ve alt yayın harf aralığı dile göre değişir.
// TR değerleri mührün 30 Ağu kaynağıyla BİREBİR aynıdır (kilit testi: lib/guaranteeSeal.test.ts).
// Marka adı (ÇİÇEKYOLLA) hiçbir dilde çevrilmez. İade/para iade ifadesi YOK (Garanti Mührü kuralı).
import type { Locale } from "./i18n/config.ts";

export interface SealText {
  /** Üst yay, küçük kısım ("%100 " / "100% "). Sondaki boşluk tasarımın parçasıdır. */
  top: string;
  /** Alt yay tek kelime. */
  bottom: string;
  /** Alt yay harf aralığı (TR 3.0); yay doluluğu TR'ye yakın kalsın diye dile göre. */
  bottomSpacing: number;
  /** Alt yay yazı boyutu (TR 14). */
  bottomSize: number;
  /** SVG metin yönü (yalnız Arapça rtl). */
  dir?: "rtl";
}

export const SEAL_TEXT: Readonly<Record<Locale, SealText>> = Object.freeze({
  tr: { top: "%100 ", bottom: "GARANTİSİ", bottomSpacing: 3.0, bottomSize: 14 },
  en: { top: "100% ", bottom: "GUARANTEE", bottomSpacing: 1.9, bottomSize: 14 },
  de: { top: "100% ", bottom: "GARANTIE", bottomSpacing: 3.6, bottomSize: 14 },
  fr: { top: "100% ", bottom: "GARANTIE", bottomSpacing: 3.6, bottomSize: 14 },
  nl: { top: "100% ", bottom: "GARANTIE", bottomSpacing: 3.6, bottomSize: 14 },
  it: { top: "100% ", bottom: "GARANZIA", bottomSpacing: 3.6, bottomSize: 14 },
  es: { top: "100% ", bottom: "GARANTÍA", bottomSpacing: 3.6, bottomSize: 14 },
  pt: { top: "100% ", bottom: "GARANTIA", bottomSpacing: 3.6, bottomSize: 14 },
  az: { top: "100% ", bottom: "ZƏMANƏT", bottomSpacing: 4.2, bottomSize: 14 },
  ru: { top: "100% ", bottom: "ГАРАНТИЯ", bottomSpacing: 3.4, bottomSize: 14 },
  ar: { top: "100% ", bottom: "ضمان", bottomSpacing: 0, bottomSize: 20, dir: "rtl" },
  zh: { top: "100% ", bottom: "品质保证", bottomSpacing: 10.2, bottomSize: 15 },
  ja: { top: "100% ", bottom: "品質保証", bottomSpacing: 10.2, bottomSize: 15 },
  ko: { top: "100% ", bottom: "품질 보증", bottomSpacing: 7.4, bottomSize: 15 },
});

/** Bilinmeyen / boş dil → TR mühür (bugünkü çıktı). */
export function sealTextFor(locale: string | null | undefined): SealText {
  const k = typeof locale === "string" ? locale.trim().toLowerCase() : "";
  return (SEAL_TEXT as Record<string, SealText>)[k] ?? SEAL_TEXT.tr;
}
