// subscription.ts — Abonelik public API istemcisi.
//
// TEK VERİ KAYNAĞI backend'dir. Bu dosya plan/fiyat UYDURMAZ; API erişilemezse
// boş liste döner ve sayfa "planlar yakında" der. Hardcoded business data yok.

const API =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? 'https://cicekyolla-api.onrender.com';

export interface PublicPlan {
  id: string;
  key: string;
  name: string;
  freqLabel: string;
  description: string;
  intervalDays: number;
  occurrenceCount: number;
  priceMinor: number;
  listPriceMinor: number | null;
  currency: string;
  features: string[];
  imageUrl: string | null;
  badge: string | null;
  ctaLabel: string;
  purchasable: boolean;
}

export interface ScheduleStep {
  sequenceNo: number;
  scheduledDate: string;
  shiftedFrom: string | null;
  shiftReason: string | null;
}

export interface SchedulePreview {
  plan: PublicPlan;
  startDate: string;
  nextDeliveryDate: string | null;
  deliveries: ScheduleStep[];
}

/**
 * Planları oku. ISR ile 60 sn önbellek: Admin fiyat değiştirdiğinde public
 * en geç 1 dakikada güncellenir, deploy gerekmez.
 */
export async function planlariGetir(): Promise<PublicPlan[]> {
  try {
    const r = await fetch(`${API}/api/public/subscriptions/plans`, {
      next: { revalidate: 60 },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: { plans?: PublicPlan[] } };
    return j.data?.plans ?? [];
  } catch {
    return [];
  }
}

export async function planGetir(planId: string): Promise<PublicPlan | null> {
  const plans = await planlariGetir();
  return plans.find((p) => p.id === planId) ?? null;
}

/** Takvim önizleme — sunucuda hesaplanır, istemci tarih üretmez. */
export async function takvimOnizle(
  planId: string, startDate: string,
): Promise<{ ok: true; data: SchedulePreview } | { ok: false; message: string }> {
  try {
    // Next.js proxy üzerinden — tarayıcıdan doğrudan backend'e gidilmez (CORS).
    const r = await fetch(
      `/api/subscriptions/schedule?planId=${encodeURIComponent(planId)}`
      + `&startDate=${encodeURIComponent(startDate)}`,
      { cache: 'no-store' },
    );
    const j = (await r.json()) as { data?: SchedulePreview; error?: { message?: string } };
    if (!r.ok || !j.data) {
      return { ok: false, message: j.error?.message ?? 'Takvim oluşturulamadı.' };
    }
    return { ok: true, data: j.data };
  } catch {
    return { ok: false, message: 'Bağlantı kurulamadı. Lütfen tekrar deneyin.' };
  }
}

export interface AbonelikTalebi {
  planId: string;
  startDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  recipientName: string;
  recipientPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryDistrict?: string | null;
  deliveryNeighborhood?: string | null;
  note?: string | null;
  cardMessage?: string | null;
}

export interface TalepSonucu {
  code: string;
  publicId: string;
  status: string;
  planName: string;
  startDate: string;
  nextDeliveryDate: string | null;
  deliveries: Array<{ sequenceNo: number; scheduledDate: string }>;
}

export async function abonelikTalebiGonder(
  input: AbonelikTalebi,
): Promise<{ ok: true; data: TalepSonucu } | { ok: false; message: string }> {
  try {
    const r = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const j = (await r.json()) as { data?: TalepSonucu; error?: { message?: string } };
    if (!r.ok || !j.data) {
      return { ok: false, message: j.error?.message ?? 'Abonelik oluşturulamadı.' };
    }
    return { ok: true, data: j.data };
  } catch {
    return { ok: false, message: 'Bağlantı kurulamadı. Lütfen tekrar deneyin.' };
  }
}
