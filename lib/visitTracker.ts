/**
 * Ziyaretçi hareketleri — panelin "Checkout Analytics / Revenue Optimizer"
 * ekranlarının KENDİ veri kaynağı (Google'dan bağımsız). API: migration 118.
 *
 * KVKK tasarımı (ZIYARETCI-PANELI-PLAN-2026-10-24.md):
 *  • Ziyaret numarası YALNIZ sekme belleğindedir (modül değişkeni) — çerez,
 *    localStorage, sessionStorage KULLANILMAZ. Sayfa yenilenince yeni ziyaret.
 *  • Kalıcı ziyaretçi numarası (`cy_vid`) YALNIZ "Analiz Çerezleri" onayında
 *    yazılır; onay yoksa/geri alınmışsa silinir ve gönderilmez.
 *  • Onaysız ziyaretin sunucuda sayılıp sayılmayacağına API karar verir
 *    (VISIT_ANON_ENABLED). Form içeriği, ad, telefon, adres GÖNDERİLMEZ;
 *    yönlendiren adresin yalnız alan adı, tıklama kimliklerinin yalnız VARLIĞI
 *    gönderilir (değeri değil).
 *  • Gönderim arka planda (sendBeacon/keepalive); hata sessizce düşer, sayfa
 *    ve ödeme akışı hiçbir koşulda beklemez veya bozulmaz.
 */

export type VisitEventType =
  | "page_view" | "view_item" | "add_to_cart" | "remove_from_cart" | "view_cart" | "begin_checkout"
  | "checkout_step" | "add_payment_info" | "order_created" | "ping";

export interface VisitEventInput {
  /** Ürün id (products.id). */
  i?: number;
  /** Ürün adı (gösterim). */
  n?: string;
  /** Tutar (kuruş): satır toplamı. */
  m?: number;
  /** Adet. */
  q?: number;
  /** Ödeme adımı anahtarı. */
  s?: string;
  /** Sipariş numarası (yalnız order_created). */
  o?: string;
}

const ENDPOINT = "/api/t";
const VID_KEY = "cy_vid";
const MAX_QUEUE = 25;
const FLUSH_MS = 4000;
const MAX_PINGS = 30;

let visitId: string | null = null;
let queue: Array<Record<string, unknown>> = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let context: Record<string, unknown> | null = null;
let pings = 0;
let started = false;
let lastSig = "";
let lastAt = 0;

function randomId(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** ConsentManager'ın yazdığı tercih (cy_cookie_prefs) — aynı okuma kuralı (analytics === true). */
function analyticsConsent(): boolean {
  try {
    const raw = window.localStorage.getItem("cy_cookie_prefs");
    return raw ? (JSON.parse(raw) as { analytics?: unknown }).analytics === true : false;
  } catch {
    return false;
  }
}

/** Kalıcı numara: yalnız onayda; onay yoksa var olanı siler. */
function visitorId(): string | null {
  try {
    if (!analyticsConsent()) {
      window.localStorage.removeItem(VID_KEY);
      return null;
    }
    let v = window.localStorage.getItem(VID_KEY);
    if (!v || !/^[A-Za-z0-9_-]{16,48}$/.test(v)) {
      v = randomId();
      window.localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

function deviceKind(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const h = new URL(document.referrer).hostname.toLowerCase();
    return h === window.location.hostname ? null : h;
  } catch {
    return null;
  }
}

/** Ziyaretin ilk sayfasındaki bağlam (kaynak sınıflandırması API'de yapılır). */
function buildContext(): Record<string, unknown> {
  const p = new URLSearchParams(window.location.search);
  const cut = (v: string | null, n: number) => (v ? v.slice(0, n) : undefined);
  return {
    l: (document.documentElement.lang || "tr").slice(0, 2),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    d: deviceKind(),
    r: referrerHost() ?? undefined,
    us: cut(p.get("utm_source"), 80),
    um: cut(p.get("utm_medium"), 40),
    uc: cut(p.get("utm_campaign"), 120),
    g: p.has("gclid") || p.has("gbraid") || p.has("wbraid") ? 1 : undefined,
    f: p.has("fbclid") ? 1 : undefined,
  };
}

function payload(): string | null {
  if (!queue.length || !visitId) return null;
  const body: Record<string, unknown> = {
    v: visitId,
    c: analyticsConsent() ? 2 : 1,
    x: { ...(context ?? {}), l: (document.documentElement.lang || "tr").slice(0, 2) },
    e: queue.splice(0, MAX_QUEUE),
  };
  const u = visitorId();
  if (u) body.u = u;
  return JSON.stringify(body);
}

/** Kuyruğu gönderir. `leaving` = sayfa kapanıyor/arka plana geçiyor. */
export function flushVisit(leaving = false): void {
  if (timer) { clearTimeout(timer); timer = null; }
  try {
    while (queue.length) {
      const json = payload();
      if (!json) return;
      const blob = new Blob([json], { type: "application/json" });
      if (leaving && navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) continue;
      void fetch(ENDPOINT, { method: "POST", body: json, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    queue = [];
  }
}

function ensureStarted(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  visitId = randomId();
  context = buildContext();
  const leave = () => flushVisit(true);
  window.addEventListener("pagehide", leave);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") leave(); });
  // Canlı ekran için hafif "hâlâ burada" sinyali (yalnız sekme görünürken, en çok 30 kez).
  const ping = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (++pings > MAX_PINGS) { window.clearInterval(ping); return; }
    trackVisit("ping");
  }, 60_000);
}

/** Tek olay ekler. Asla fırlatmaz. */
export function trackVisit(type: VisitEventType, data: VisitEventInput = {}): void {
  if (typeof window === "undefined") return;
  try {
    ensureStarted();
    const path = window.location.pathname;
    // Kart ödemesi sonuç sayfası ayrı ziyaret olur; ödendi bilgisi siparişten okunur.
    if (path.startsWith("/checkout/sonuc")) return;
    // Aynı olay 1,5 sn içinde tekrar gelirse (React çift efekt, çift tıklama) bir kez sayılır.
    // Sepete ekleme/çıkarma hariç: art arda iki gerçek ekleme mümkündür.
    const now = Date.now();
    const sig = `${type}|${path}|${data.s ?? ""}|${data.i ?? ""}`;
    if (type !== "add_to_cart" && type !== "remove_from_cart" && sig === lastSig && now - lastAt < 1500) return;
    lastSig = sig;
    lastAt = now;
    queue.push({ t: type, a: now, p: path, ...data });
    if (queue.length >= 10) flushVisit();
    else if (!timer) timer = setTimeout(() => flushVisit(), FLUSH_MS);
  } catch {
    /* ölçüm asla akışı bozmaz */
  }
}

/** GA4 dataLayer olayını ziyaretçi olayına çevirir (lib/analytics.ts tek kapı). */
export function trackFromEcommerce(event: string, ecommerce: Record<string, unknown>): void {
  const map: Record<string, VisitEventType> = {
    view_item: "view_item", add_to_cart: "add_to_cart", remove_from_cart: "remove_from_cart",
    view_cart: "view_cart", begin_checkout: "begin_checkout", add_payment_info: "add_payment_info",
  };
  const type = map[event];
  if (!type) return;
  const items = Array.isArray(ecommerce.items) ? (ecommerce.items as Array<Record<string, unknown>>) : [];
  if (!items.length || (type !== "view_item" && type !== "add_to_cart" && type !== "remove_from_cart")) {
    trackVisit(type);
    return;
  }
  for (const it of items.slice(0, 5)) {
    const id = Number(it.item_id);
    const qty = Number(it.quantity) || 1;
    const price = Number(it.price);
    trackVisit(type, {
      i: Number.isInteger(id) && id > 0 ? id : undefined,
      n: typeof it.item_name === "string" ? it.item_name.slice(0, 160) : undefined,
      m: Number.isFinite(price) ? Math.round(price * 100 * qty) : undefined,
      q: qty,
    });
  }
}

/** PayTR merchant_oid (CY20261022174946) → sipariş numarası (CY-20261022-174946). */
export function orderNumberFromOid(oid: string | null | undefined): string | null {
  if (!oid) return null;
  if (/^CY-\d{8}-\d{6}$/.test(oid)) return oid;
  const m = /^CY(\d{8})(\d{6})$/.exec(oid);
  return m ? `CY-${m[1]}-${m[2]}` : null;
}
