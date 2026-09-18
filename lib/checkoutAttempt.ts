// ---------------------------------------------------------------------------
// CHECKOUT ATTEMPT — sipariş oluşturmanın DENEME ANAHTARI.
//
// NE İŞE YARAR: aynı müşteri kart ekranından dönüp tekrar denediğinde backend
// önceki kupon rezervasyonunu bu anahtarla "superseded" işaretler (yaşam
// döngüsü T6). Anahtar olmadan müşteri 45 dakika boyunca KENDİ kuponunu
// "kullanılmış" görebilir.
//
// BİÇİM (DESIGN §3.D.6 / A5-6): UUID DEĞİL, opak token → ^[A-Za-z0-9_-]{8,64}$
// (backend paymentController.readAttemptKey ile birebir aynı kalıp).
// crypto.randomUUID her tarayıcıda/bağlamda yok; yoksa zaman+rastgele yedeği
// kullanılır. Anahtar üretilemezse alan HİÇ GÖNDERİLMEZ ve sipariş normal
// geçer — ödeme akışı bu ayrıntı için ASLA durmaz.
// ---------------------------------------------------------------------------

export const ATTEMPT_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function isAttemptKey(value: unknown): boolean {
  return typeof value === "string" && ATTEMPT_KEY_RE.test(value);
}

/** SAF üretici: kaynakları enjekte edilebildiği için test edilebilir. */
export function makeAttemptKey(
  randomUuid?: (() => string) | undefined,
  nowMs: number = Date.now(),
  random: () => number = Math.random,
): string {
  if (typeof randomUuid === "function") {
    try {
      const uuid = randomUuid();
      if (isAttemptKey(uuid)) return uuid;
    } catch {
      /* yedeğe düş */
    }
  }
  const tail = `${random().toString(36).slice(2)}${random().toString(36).slice(2)}`;
  const candidate = `${Math.abs(Math.trunc(nowMs)).toString(36)}-${tail}`.replace(/[^A-Za-z0-9_-]/g, "");
  return candidate.length >= 8 ? candidate.slice(0, 64) : `${candidate}00000000`.slice(0, 64);
}

/** Tarayıcıda yeni anahtar. */
export function newAttemptKey(): string {
  const webCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  const uuid = typeof webCrypto?.randomUUID === "function" ? () => webCrypto.randomUUID!() : undefined;
  return makeAttemptKey(uuid);
}

/** Sipariş gövdesine eklenecek alan — geçersiz anahtar HİÇ gönderilmez. */
export function attemptField(key: string | null | undefined): { checkout_attempt_id?: string } {
  return isAttemptKey(key) ? { checkout_attempt_id: key as string } : {};
}
