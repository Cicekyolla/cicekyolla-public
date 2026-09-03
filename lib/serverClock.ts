// ---------------------------------------------------------------------------
// SERVER CLOCK — sepet temizliği için sunucu saatine demirlenmiş "şimdi".
//
// Tarayıcı saati kullanıcı elindedir; yanlışsa geçerli bir teslimat satırını
// sildirebilir. Bu modül /api/now'dan bir kez okur ve aradaki farkı (skew)
// saklar. Ağ yoksa/uç cevap vermezse tarayıcı saatine düşülür — ama o durumda
// çağıran taraf EMNİYET PAYIYLA (grace) karar verir, bkz. deliveryExpiry.ts.
//
// Tek istek, tek modül state'i. İkinci bir zaman kaynağı/servis kurulmaz.
// ---------------------------------------------------------------------------

let skewMs = 0;
let anchored = false;
let inFlight: Promise<boolean> | null = null;

/** Sunucuya demirlenmiş epoch (demir yoksa tarayıcı saati). */
export function nowMs(): number {
  return Date.now() + skewMs;
}

/** Saat gerçekten sunucudan mı geldi? (false → grace uygulanmalı) */
export function isClockAnchored(): boolean {
  return anchored;
}

/** Emniyet payı: demirliyse 0, değilse 60 dk (yanlış silmeye karşı). */
export const UNANCHORED_GRACE_MINUTES = 60;

export function graceMinutes(): number {
  return anchored ? 0 : UNANCHORED_GRACE_MINUTES;
}

/**
 * Sunucu saatini bir kez çeker. Tekrar çağrılırsa aynı sözü döndürür; başarılı
 * demirlemeden sonra ağ trafiği üretmez. Hiçbir koşulda throw etmez.
 */
export function anchorServerClock(): Promise<boolean> {
  if (anchored) return Promise.resolve(true);
  if (inFlight) return inFlight;
  if (typeof window === "undefined") return Promise.resolve(false);

  inFlight = (async () => {
    try {
      const sentAt = Date.now();
      const response = await fetch("/api/now", { cache: "no-store" });
      if (!response.ok) return false;
      const body = (await response.json()) as { epoch_ms?: number; now?: string };
      const serverEpoch = typeof body.epoch_ms === "number"
        ? body.epoch_ms
        : body.now ? Date.parse(body.now) : Number.NaN;
      if (!Number.isFinite(serverEpoch)) return false;
      // Gidiş-dönüş süresinin yarısı kadar ileri al (basit NTP yaklaşımı).
      const receivedAt = Date.now();
      const oneWay = Math.max(0, (receivedAt - sentAt) / 2);
      skewMs = serverEpoch + oneWay - receivedAt;
      anchored = true;
      return true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Yalnız test içindir: modül durumunu sıfırlar. */
export function __resetServerClockForTests(): void {
  skewMs = 0;
  anchored = false;
  inFlight = null;
}
