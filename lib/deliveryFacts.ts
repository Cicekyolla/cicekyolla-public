// lib/deliveryFacts.ts — TESLİMAT BİLGİ NOTU (14 Kas 2026, ADDITIVE).
// ChatGPT/AI görünürlüğü: 6 sayfada (TR ana sayfa, TR Kadıköy + Beşiktaş, EN Kadıköy, DE ana sayfa + DE İstanbul)
// son sipariş saati ve teslimat ücreti SSR HTML'de okunur olsun.
//
// Rakam UYDURULMAZ: saat ve ücret yalnız ödemede kullanılan motordan (POST /api/public/delivery/check) gelir.
// Neden adres örnekleri: motorun ilçe ucu (/reach) mahalle koordinatı olmadığı için ilçe merkezini kullanıyor;
// ödeme ise adresin gerçek uzaklığına göre bant seçiyor (14 Kas: Kadıköy Moda 18:00 ↔ Göztepe 19:00,
// Beşiktaş Ortaköy 18:00 ↔ Etiler 17:00). Bu yüzden ilçe içi aralık, sayfada adı geçen mahallelerin
// konumlarıyla motordan okunur. Konumlar yalnız sorgu içindir; saat/ücret sabiti YOKTUR.
// Motor okunamazsa null → not basılmaz (sayfa bugünkü hâlinde kalır).

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.skyversal.xyz";

export interface RefPoint { lat: number; lng: number }

/** Sayfada adı geçen mahallelerin yaklaşık merkezleri (yalnız motor sorgusu için). */
export const DELIVERY_REF_POINTS = {
  kadikoy: [
    { lat: 40.99, lng: 29.025 },   // Caferağa (Moda)
    { lat: 41.001, lng: 29.045 },  // Acıbadem
    { lat: 40.993, lng: 29.046 },  // Fikirtepe
    { lat: 40.97, lng: 29.043 },   // Fenerbahçe
    { lat: 40.979, lng: 29.061 },  // Göztepe
    { lat: 40.972, lng: 29.096 },  // Kozyatağı
    { lat: 40.958, lng: 29.09 },   // Bostancı
  ],
  besiktas: [
    { lat: 41.043, lng: 29.007 },  // Beşiktaş merkez
    { lat: 41.048, lng: 29.027 },  // Ortaköy
    { lat: 41.077, lng: 29.043 },  // Bebek
    { lat: 41.081, lng: 29.033 },  // Etiler
    { lat: 41.082, lng: 29.011 },  // Levent
  ],
  maltepe: [
    { lat: 40.935, lng: 29.13 },   // Maltepe merkez
    { lat: 40.95, lng: 29.11 },    // Küçükyalı
  ],
} as const satisfies Record<string, readonly RefPoint[]>;

export type DeliveryArea = keyof typeof DELIVERY_REF_POINTS;

/** Motor yanıtından bu not için gereken alanlar. */
export interface CheckSample { cutoff_time: string | null; fee_minor: number | null; slot_extra_fee_minor: number[] }

export interface DeliveryRange {
  /** "18:00" — en erken son sipariş saati. */
  earliest: string;
  /** "19:00" — en geç son sipariş saati (earliest ile aynıysa tek saat). */
  latest: string;
  /** Tüm örneklerde aynı ücret (kuruş) ve saat dilimi ek ücreti yok → o ücret; aksi null ("adrese göre"). */
  feeMinor: number | null;
}

const hhmm = (t: string | null | undefined): string | null => (t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);

/** Saf özet: geçersiz örnek varsa ya da hiç saat yoksa null (uydurma yok). */
export function summarizeSamples(samples: readonly (CheckSample | null)[]): DeliveryRange | null {
  if (!samples.length || samples.some((s) => !s)) return null;
  const times = samples.map((s) => hhmm(s!.cutoff_time));
  if (times.some((t) => !t)) return null;
  const sorted = (times as string[]).slice().sort();
  const fees = samples.map((s) => s!.fee_minor);
  const sameFee = fees.every((f) => f != null && f === fees[0]);
  const noSlotExtra = samples.every((s) => s!.slot_extra_fee_minor.every((x) => x === 0));
  return { earliest: sorted[0], latest: sorted[sorted.length - 1], feeMinor: sameFee && noSlotExtra ? (fees[0] as number) : null };
}

/** İstanbul'da yarının tarihi (saat dilimi slotları dolu gelsin; bugünün kesimi geçmiş olsa da saat aynı). */
function istanbulTomorrow(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

async function checkPoint(p: RefPoint, date: string): Promise<CheckSample | null> {
  try {
    const resp = await fetch(`${API_ORIGIN}/api/public/delivery/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: p.lat, lng: p.lng, date }),
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { data?: { method?: string; same_day?: { cutoff_time?: string | null; fee_minor?: number | null; slots?: { extra_fee_minor?: number | null }[] } } };
    const sd = json.data?.same_day;
    if (json.data?.method !== "courier" || !sd) return null;
    return {
      cutoff_time: sd.cutoff_time ?? null,
      fee_minor: sd.fee_minor == null ? null : Number(sd.fee_minor),
      slot_extra_fee_minor: (sd.slots ?? []).map((s) => Number(s.extra_fee_minor ?? 0)),
    };
  } catch {
    return null;
  }
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<DeliveryArea, { at: number; v: DeliveryRange | null }>();

/** Bölgenin son sipariş saati aralığı + ücreti (motor). Okunamazsa null. Süreç içi 10 dk önbellek. */
export async function fetchDeliveryRange(area: DeliveryArea): Promise<DeliveryRange | null> {
  const hit = cache.get(area);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.v;
  const date = istanbulTomorrow();
  const samples = await Promise.all(DELIVERY_REF_POINTS[area].map((p) => checkPoint(p, date)));
  const v = summarizeSamples(samples);
  // Hata (null) kısa süre tutulmaz → bir sonraki istek yeniden dener.
  if (v) cache.set(area, { at: Date.now(), v });
  return v;
}
