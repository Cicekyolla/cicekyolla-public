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
  | {
      ok: false;
      /* Hangi adımda kırıldığı ayrı ayrı raporlanır; hepsi tek bir "failed"
         altında gizlenmez. Böylece kullanıcıya doğru mesaj, operatöre doğru
         teşhis verilir. */
      reason:
        | "unsupported"
        | "denied"
        | "no_key"
        | "sw_failed"
        | "subscribe_failed"
        | "save_failed";
      detail?: string;
    };

/**
 * GERÇEK abonelik akışı:
 *   service worker kaydı → tarayıcı izni → PushSubscription → backend kaydı.
 * Hiçbir adımı taklit etmez; başarısızsa dürüstçe sebebini döner.
 */
export async function subscribeToPush(vapidPublicKey: string | null): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (!vapidPublicKey) return { ok: false, reason: "no_key" };

  const permission = await Notification.requestPermission().catch(
    () => "denied" as NotificationPermission
  );
  if (permission !== "granted") return { ok: false, reason: "denied" };

  /* 1) Service worker kaydı.
     En sık kırılma nedeni: /sw.js isteğinin YÖNLENDİRİLMESİ (apex → www, ya da
     Vercel deployment protection). Tarayıcı, yönlendirilen bir SW script'ini
     reddeder. Gerçek istisna konsola yazılır ki teşhis tahmine kalmasın. */
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn("[push] service worker kaydı başarısız:", err);
    return { ok: false, reason: "sw_failed", detail: String((err as Error)?.message ?? err) };
  }

  /* 2) Abonelik. Zaten abone ise onu kullan (duplicate oluşturmayız). */
  let sub: PushSubscription | null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }
  } catch (err) {
    console.warn("[push] pushManager.subscribe başarısız:", err);
    return { ok: false, reason: "subscribe_failed", detail: String((err as Error)?.message ?? err) };
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    console.warn("[push] abonelik nesnesi eksik alan içeriyor");
    return { ok: false, reason: "subscribe_failed", detail: "eksik abonelik alanları" };
  }

  /* 3) Backend kaydı. */
  try {
    const res = await fetch("/api/consent/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    });
    if (!res.ok) {
      console.warn("[push] backend kaydı başarısız, HTTP", res.status);
      return { ok: false, reason: "save_failed", detail: `HTTP ${res.status}` };
    }
  } catch (err) {
    console.warn("[push] backend kaydı başarısız:", err);
    return { ok: false, reason: "save_failed", detail: String((err as Error)?.message ?? err) };
  }

  return { ok: true };
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
    /* API hata metnini "error" alanında gönderiyor (ör. 409 → "Bu e-posta veya
       telefon zaten kayıtlı."). Önce message, sonra error okunur; ikisi de yoksa
       genel metne düşülür. Eskiden yalnız message aranıyordu ve gerçek sebep
       kullanıcıdan gizleniyordu. */
    return {
      ok: false,
      message: json?.message ?? json?.error ?? "Kayıt tamamlanamadı. Lütfen tekrar deneyin.",
    };
  } catch {
    return { ok: false, message: "Kayıt tamamlanamadı. Lütfen tekrar deneyin." };
  }
}
