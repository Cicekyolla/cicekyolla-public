/**
 * Web AI satış danışmanı ölçümü (M1, 13 Kas 2026).
 *
 * Amaç: "asistanla konuşan ziyaret → sipariş" bağını kurmak. Olaylar iki yere gider:
 *  • Panelin kendi ziyaretçi ölçümü (lib/visitTracker.ts → /api/t). Aynı ziyaretteki
 *    order_created ile birleşince asistanın siparişe katkısı sayılabilir. Onay kuralları
 *    visitTracker'daki gibidir (kalıcı kimlik yalnız "Analiz Çerezleri" onayında).
 *  • GTM dataLayer (GA4 / Ads'e iletmek GTM'de ayrıca etiket kurulmasına bağlıdır).
 *
 * KVKK: mesaj METNİ, ad, telefon, adres hiçbir olaya girmez. Kartta yalnız ürün id ve adı.
 * Ölçüm asla fırlatmaz; sohbet akışı hiçbir koşulda beklemez veya bozulmaz.
 */

import { pushEvent } from "./analytics.ts";
import { trackVisit, type VisitEventInput, type VisitEventType } from "./visitTracker.ts";

export type ConciergeEventKind = "open" | "message" | "card_click" | "whatsapp";

export interface ConciergeEventCard {
  productId: number;
  name: string;
}

export interface ConciergeEventPlan {
  visit: { type: VisitEventType; data: VisitEventInput };
  gtm: { event: string; params: Record<string, unknown> };
}

/** Saf: olayın ziyaret ve GTM karşılığını üretir (test edilebilir, yan etkisiz). */
export function conciergeEventPlan(kind: ConciergeEventKind, card?: ConciergeEventCard | null): ConciergeEventPlan {
  const type = `concierge_${kind}` as VisitEventType;
  if (kind === "card_click" && card && Number.isInteger(card.productId) && card.productId > 0) {
    const name = typeof card.name === "string" ? card.name.slice(0, 160) : undefined;
    return {
      visit: { type, data: { i: card.productId, n: name } },
      gtm: { event: type, params: { item_id: String(card.productId), item_name: name } },
    };
  }
  return { visit: { type, data: {} }, gtm: { event: type, params: {} } };
}

/** Olayı gönderir. Asla fırlatmaz. */
export function trackConcierge(kind: ConciergeEventKind, card?: ConciergeEventCard | null): void {
  try {
    const plan = conciergeEventPlan(kind, card);
    trackVisit(plan.visit.type, plan.visit.data);
    pushEvent(plan.gtm.event, plan.gtm.params);
  } catch {
    /* ölçüm asla akışı bozmaz */
  }
}
