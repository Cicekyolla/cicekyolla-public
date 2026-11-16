// ============================================================================
// Checkout GÖNDEREN telefonu — doğrulama + API'ye gidecek değer (saf, test edilebilir).
//
// P0-1 (canlı satış denetimi): eski kontrol yalnız TR cep biçimlerini kabul
// ediyordu; yurt dışındaki müşteri (+49, +44, +1 …) siparişi tamamlayamıyordu.
//
// Kural sırası BİLEREK böyle:
//   1) Eski TR kuralı AYNEN önce denenir (5xx / 05xx / 905xx, ayraçlar serbest).
//      Geçerse değer müşterinin yazdığı gibi gider → bugünkü TR siparişleri,
//      CRM eşleşmesi ve WhatsApp kimliği DEĞİŞMEZ.
//   2) TR değilse uluslararası: "+" veya "00" ile başlamak ZORUNLU, ülke kodu
//      90 olmayacak, toplam 8–15 hane (E.164), yalnız rakam ve ayraç
//      (boşluk . - ( ) /). API'ye "+<hane>" (E.164) olarak gider; "+" API'nin
//      yurt dışı numarayı TR sanmaması (WhatsApp kimliği) için şarttır.
// Alıcı telefonu bu dosyanın KAPSAMI DIŞINDADIR (kurye kuralları değişmez).
// ============================================================================

import { analyzePhone } from "./phoneRules.ts";

export const phoneDigits = (v: string) => v.replace(/\D/g, "");

/** Eski checkout kuralı — birebir korunur. */
export const isValidTRPhone = (v: string) => {
  const d = phoneDigits(v);
  // 5xxxxxxxxx (10) | 05xxxxxxxxx (11) | 905xxxxxxxxx (12)
  if (d.length === 10) return d.startsWith("5");
  if (d.length === 11) return d.startsWith("05");
  if (d.length === 12) return d.startsWith("905");
  return false;
};

const INTL_SHAPE = /^(\+|00)[0-9\s().\-/]+$/;

/** Yurt dışı numara → "+<ülke kodu><numara>" (E.164); geçersizse null. */
export function normalizeInternationalPhone(v: string): string | null {
  const s = (v ?? "").trim();
  if (!INTL_SHAPE.test(s)) return null;
  const d = s.startsWith("00") ? phoneDigits(s).slice(2) : phoneDigits(s);
  if (d.length < 8 || d.length > 15) return null;
  if (d.startsWith("0")) return null; // ülke kodu 0 ile başlamaz
  if (d.startsWith("90")) return null; // TR numarası TR kuralından geçmeli
  // 17 Kas 2026: uzunluk ÜLKEYE GÖRE denetlenir ("+971555123456789" 15 hane
  // olduğu için geçiyordu; BAE ulusal numarası 8–9 hanedir). Tablo: lib/phoneRules.
  const c = analyzePhone(`+${d}`);
  return c.valid && !c.isTR ? c.e164 : null;
}

/** Gönderen telefonu geçerli mi (TR veya uluslararası)? */
export const isValidSenderPhone = (v: string) => isValidTRPhone(v) || normalizeInternationalPhone(v) !== null;

/**
 * Siparişe (customer_phone) gidecek değer. TR → yazıldığı gibi (bugünkü davranış);
 * uluslararası → E.164. Geçersizse ham değer döner (zaten gönderim öncesi engellenir).
 */
export function senderPhoneForApi(v: string): string {
  if (isValidTRPhone(v)) return v;
  return normalizeInternationalPhone(v) ?? v;
}

/**
 * ALICI telefonu (17 Kas 2026 — CY-20261117-218913'te alıcı "+90532123456789"
 * hiç denetlenmeden kaydedildi). Alan İSTEĞE BAĞLIDIR: boşsa geçerli. Doluysa
 * ülkesinin uzunluk kuralına uymalı: Türk yazımları (05xx / 5xx / 0212… / +90…)
 * ya da "+ülke kodu" ile yurt dışı. Yalnız rakam ve ayraç kabul edilir.
 */
const RECIPIENT_SHAPE = /^\+?[0-9\s().\-/]+$/;
export function isValidRecipientPhone(v: string): boolean {
  const s = (v ?? "").trim();
  if (!s) return true;
  if (!RECIPIENT_SHAPE.test(s)) return false;
  return analyzePhone(s).valid;
}
