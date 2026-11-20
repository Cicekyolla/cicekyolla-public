import { trackFromEcommerce } from "./visitTracker.ts";
import { readAnalyticsContext } from "./analyticsContext.ts";

export type EcommerceItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function pushEcommerceEvent(
  event: string,
  ecommerce: Record<string, unknown>,
  extra?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  // `extra` yalnız purchase'ta verilir (hash'li kullanıcı verisi); `ecommerce`
  // gövdesi birebir aynı kalır (currency = tahsilat birimi, "TRY").
  // 20 Kas 2026 (ADDITIVE): her olaya sayfa dili ve GÖSTERİM para birimi eklenir
  // (site_language, display_currency) — GA4'te dil / yurt dışı kırılımı için.
  const ctx = readAnalyticsContext();
  window.dataLayer.push(extra ? { event, ecommerce, ...ctx, ...extra } : { event, ecommerce, ...ctx });
  // Panelin kendi ziyaretçi ölçümü (migration 118) — GA4 gövdesi değişmez.
  trackFromEcommerce(event, ecommerce);
}

/**
 * Ecommerce olmayan tekil bir olayı dataLayer'a yazar.
 *
 * `onDone`: GTM bu olaya bağlı TÜM etiketleri çalıştırdığında tetiklenir
 * (`eventCallback`). Tıklama sonrası hemen başka bir adrese gidiyorsak
 * navigasyonu buraya bağlarız; yoksa tarayıcı sayfayı bırakırken dönüşüm
 * isteği yarıda kesilebilir. `eventTimeout` bir güvenlik ağıdır: GTM hiç
 * cevap vermezse (etiket yok, container engellenmiş, ağ yavaş) callback yine
 * de çalışır ve kullanıcı ASLA beklemede kalmaz. GTM callback'i birden fazla
 * kez çağırabildiği için tek seferlik sarmalıyoruz.
 */
export function pushEvent(
  event: string,
  params: Record<string, unknown> = {},
  onDone?: () => void,
  timeoutMs = 700,
): void {
  if (typeof window === "undefined") {
    onDone?.();
    return;
  }

  let cagrildi = false;
  const birKez = () => {
    if (cagrildi) return;
    cagrildi = true;
    onDone?.();
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    // 20 Kas 2026 (ADDITIVE): sayfa dili + gösterim para birimi; çağıranın
    // verdiği aynı adlı alan varsa o geçerlidir.
    ...readAnalyticsContext(),
    ...params,
    ...(onDone ? { eventCallback: birKez, eventTimeout: timeoutMs } : {}),
  });

  // dataLayer hiç işlenmezse (GTM yüklenmemiş/engellenmiş) eventTimeout da
  // çalışmaz; bu yüzden bağımsız bir yedek zamanlayıcı kuruyoruz.
  if (onDone) window.setTimeout(birKez, timeoutMs);
}
