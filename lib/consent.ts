/**
 * Consent / Web Push / Hoş Geldin — istemci yardımcıları.
 *
 * İLKELER
 *  • Sahte iş yok: push aboneliği gerçek PushSubscription'dır, backend'e yazılır.
 *  • Desteklemeyen tarayıcıda hiçbir şey patlamaz; sessizce devre dışı kalır.
 *  • İzin reddedilmişse kullanıcı bir daha rahatsız edilmez (permission 'denied').
 */

export type ConsentConfig = {
  cookie: {
    active: boolean;
    title: string;
    description: string;
    accept_text: string;
    manage_text: string;
  };
  push: {
    active: boolean;
    title: string;
    description: string;
    cta_text: string;
    dismiss_text: string;
    image_url: string | null;
    delay_ms: number;
    vapid_public_key: string | null;
  };
  welcome: {
    active: boolean;
    title: string;
    description: string;
    cta_text: string;
    dismiss_text: string;
    image_url: string | null;
    delay_ms: number;
    scroll_ratio: number;
    amount_minor: number | null;
    min_cart_total_minor: number | null;
    first_order_only: boolean;
    ends_at: string | null;
  };
};

/** Admin'den yönetilen içerik + gerçek kampanya durumu. Hata olursa null. */
export async function fetchConsentConfig(): Promise<ConsentConfig | null> {
  try {
    const res = await fetch("/api/consent/config", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: ConsentConfig };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/** Minor (kuruş) → "150 TL" gibi okunur metin. */
export function formatMinor(minor: number | null | undefined): string {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return "";
  const lira = minor / 100;
  const s = Number.isInteger(lira) ? String(lira) : lira.toFixed(2).replace(".", ",");
  return `${s} TL`;
}

/* ────────────────────────── Web Push ────────────────────────── */

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "no_key" | "failed" };

/**
 * GERÇEK abonelik akışı:
 *   service worker kaydı → tarayıcı izni → PushSubscription → backend kaydı.
 * Hiçbir adımı taklit etmez; başarısızsa dürüstçe sebebini döner.
 */
export async function subscribeToPush(vapidPublicKey: string | null): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (!vapidPublicKey) return { ok: false, reason: "no_key" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // Zaten abone ise onu kullan (duplicate abonelik oluşturmayız).
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, reason: "failed" };

    const res = await fetch("/api/consent/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    });
    if (!res.ok) return { ok: false, reason: "failed" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/* ────────────────────── Hoş geldin kuponu ────────────────────── */

export type WelcomeCoupon = {
  available: boolean;
  code?: string;
  amount_minor?: number;
  min_cart_total_minor?: number | null;
  first_order_only?: boolean;
  reason?: string;
};

/** Kupon KODU — yalnız giriş yapmış üyeye döner (401 = üye değil). */
export async function fetchWelcomeCoupon(): Promise<WelcomeCoupon> {
  try {
    const res = await fetch("/api/auth/welcome-coupon", { cache: "no-store" });
    if (!res.ok) return { available: false, reason: res.status === 401 ? "not_member" : "error" };
    const json = (await res.json()) as { data?: WelcomeCoupon };
    return json?.data ?? { available: false, reason: "error" };
  } catch {
    return { available: false, reason: "error" };
  }
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; message: string };

/** Mevcut üyelik akışı (/api/auth/register). Başarıda oturum çerezi kurulur. */
export async function registerMember(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<RegisterResult> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        name: input.name,
        kvkk_onay: true,
      }),
    });
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
    return { ok: false, message: json?.message ?? "Kayıt tamamlanamadı. Lütfen tekrar deneyin." };
  } catch {
    return { ok: false, message: "Kayıt tamamlanamadı. Lütfen tekrar deneyin." };
  }
}
