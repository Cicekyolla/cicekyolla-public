// metaPixel.ts — Meta Pixel (browser). Mevcut GTM/GA4 (lib/analytics.ts) ile
// PARALEL çalışır, onu DEĞİŞTİRMEZ — ayrı, bağımsız bir fbq() çağrı katmanı.
//
// KVKK/consent: Pixel yalnız pazarlama çerezi ONAYLANDIYSA yüklenir
// (components/consent/ConsentManager.tsx → persist() çağırır). Onay yoksa
// window.fbq hiç var olmaz; metaTrack() bu durumda sessizce no-op'tur.
//
// content_ids: DAİMA gerçek products.id (integer, string'e çevrilmiş) —
// slug/SKU KULLANILMAZ. Meta Catalog retailer_id = products.id ile birebir
// eşleşir (bkz. backend metaService.ts syncMetaCatalog).
export const META_PIXEL_ID = "1572509877418746";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: unknown;
  }
}

let loaded = false;

/** Pazarlama onayı verildiğinde (veya sayfa açılışında onay zaten varsa) çağrılır. İdempotent. */
export function loadMetaPixel(): void {
  if (typeof window === "undefined" || loaded || window.fbq) { loaded = true; return; }
  loaded = true;

  /* Meta'nın resmi Pixel base kodu — davranış birebir korunur, yalnız TS için
     tipli hale getirildi (window.fbq global olarak yukarıda deklare edildi). */
  const w = window;
  if (!w.fbq) {
    const n = function (this: unknown, ...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue.push(args);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    w.fbq = n;
    if (!w._fbq) w._fbq = n;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(script, first);
  }

  w.fbq("init", META_PIXEL_ID);
  w.fbq("track", "PageView");
}

export interface MetaTrackCustomData {
  content_ids: string[];
  content_type: "product";
  value: number;
  currency: "TRY";
  num_items?: number;
}

/** window.fbq yoksa (onay yok / henüz yüklenmedi) sessizce no-op. eventId verilirse dedup için Meta'nın eventID alanına geçer. */
export function metaTrack(eventName: string, data: MetaTrackCustomData, eventId?: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventId) {
    window.fbq("track", eventName, data, { eventID: eventId });
  } else {
    window.fbq("track", eventName, data);
  }
}
