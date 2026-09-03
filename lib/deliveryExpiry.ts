// ---------------------------------------------------------------------------
// DELIVERY EXPIRY — "teslimat tarihi geçmiş" kararının TEK kaynağı.
//
// NEDEN VAR: sepet localStorage'da süresiz yaşar (cicekyolla.cart.v1). Satırın
// teslimat tarihi/slotu geçse bile satır sepette durur; müşteri geçmiş bir
// teslimatla checkout'a kadar gidebiliyor. Bu modül "geçmiş mi?" sorusunu
// SAF fonksiyonla yanıtlar — ağ yok, DOM yok, storage yok → test edilebilir.
//
// TASARIM KARARLARI
//   • Zaman dilimi DAİMA Europe/Istanbul. Tarayıcının yerel dilimi kullanılmaz
//     (yurt dışından bakan müşteri sepetini kaybetmesin — 13 dilli vitrin).
//   • Son geçerlilik anı = teslimat gününün sonu; slot bitişi biliniyorsa slot
//     bitişi. Yani "bugün 09:00–12:00" satırı 12:00'den sonra geçersizdir,
//     "bugün" (slotsuz/kargo) satırı gece yarısına kadar geçerlidir.
//   • Tarihi OLMAYAN satır ASLA silinmez (eski/legacy satır — yanlış silme riski).
//   • graceMinutes: sunucu saatine demirlenemediğimizde (bkz. serverClock.ts)
//     tarayıcı saatine körü körüne güvenmemek için emniyet payı.
// ---------------------------------------------------------------------------

import type { PendingDelivery } from "@/lib/pendingDelivery";

/** Europe/Istanbul'daki "şimdi": gün (YYYY-MM-DD) + gün içi dakika. */
export interface IstanbulNow {
  ymd: string;
  /** Gece yarısından itibaren geçen dakika (0–1439). */
  minutes: number;
}

const TZ = "Europe/Istanbul";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Verilen epoch değerini Europe/Istanbul takvimine çevirir. */
export function istanbulNow(epochMs: number): IstanbulNow {
  const parts = partsFormatter.formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? "00";
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  // hourCycle h23 bazı motorlarda gece yarısını "24" verebilir → 0'a indir.
  const hour = Number(get("hour")) % 24;
  const minutes = hour * 60 + Number(get("minute"));
  return { ymd, minutes };
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const HMS = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** "YYYY-MM-DD" → 1970'ten beri geçen gün sayısı. Geçersizse null. */
export function dayNumber(ymd: string | null | undefined): number | null {
  if (typeof ymd !== "string") return null;
  const m = YMD.exec(ymd.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  if (Number.isNaN(utc)) return null;
  // Ay taşmasını yakala (ör. 2026-02-31 → 3 Mart olur, geçersiz sayılmalı).
  const back = new Date(utc);
  if (back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day) return null;
  return Math.round(utc / 86_400_000);
}

/** "HH:MM" / "HH:MM:SS" → gün içi dakika. Geçersizse null. */
export function minuteOfDay(hms: string | null | undefined): number | null {
  if (typeof hms !== "string") return null;
  const m = HMS.exec(hms.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * Teslimat seçiminin son geçerlilik anı — 1970'ten beri geçen DAKİKA cinsinden.
 * Tarih yoksa null (= "hiç süresi dolmaz", satıra dokunulmaz).
 */
export function expiryStamp(delivery: PendingDelivery | null | undefined): number | null {
  const day = dayNumber(delivery?.date);
  if (day === null) return null;
  const end = minuteOfDay(delivery?.slotEnd);
  // Slot bitişi bilinmiyorsa gün sonuna kadar geçerli (1440. dakika).
  return day * 1440 + (end === null ? 1440 : end);
}

/** "Şimdi"nin aynı ölçekteki karşılığı. */
export function nowStamp(now: IstanbulNow): number {
  const day = dayNumber(now.ymd);
  return (day ?? 0) * 1440 + now.minutes;
}

/**
 * Bu teslimat seçimi GERÇEKTEN geçti mi?
 * @param graceMinutes sunucu saatine demirlenememişse verilen emniyet payı.
 */
export function isDeliveryExpired(
  delivery: PendingDelivery | null | undefined,
  now: IstanbulNow,
  graceMinutes = 0,
): boolean {
  const limit = expiryStamp(delivery);
  if (limit === null) return false;
  return nowStamp(now) > limit + Math.max(0, graceMinutes);
}

/** Listeyi "kalanlar / süresi geçenler" diye ayırır (mutasyon yok). */
export function partitionExpired<T>(
  rows: readonly T[],
  pick: (row: T) => PendingDelivery | null | undefined,
  now: IstanbulNow,
  graceMinutes = 0,
): { kept: T[]; expired: T[] } {
  const kept: T[] = [];
  const expired: T[] = [];
  for (const row of rows) {
    if (isDeliveryExpired(pick(row), now, graceMinutes)) expired.push(row);
    else kept.push(row);
  }
  return { kept, expired };
}
