/**
 * Consent / Web Push / Hoş Geldin — istemci yardımcıları.
 *
 * İLKELER
 *  • Sahte iş yok: push aboneliği gerçek PushSubscription'dır, backend'e yazılır.
 *  • Desteklemeyen tarayıcıda hiçbir şey patlamaz; sessizce devre dışı kalır.
 *  • İzin reddedilmişse kullanıcı bir daha rahatsız edilmez (permission 'denied').
 *  • KVKK/aydınlatma onayı UYDURULMAZ: kayıt gövdesine yalnız kullanıcının
 *    gerçekten işaretlediği değer yazılır (DECISIONS D6 · DESIGN §3.A.10).
 */

// Yalnız TİP alınır (derleme sırasında silinir) — bu modül `node --test` ile
// doğrudan koşulabilsin diye çalışma zamanı bağımlılığı EKLENMEZ.
import type { WelcomeCouponResponse } from "./memberAccountView";

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

/**
 * Gövde sözleşmesi TEK yerde tanımlıdır (`lib/memberAccountView.ts`); popup ve
 * Hesabım aynı alanları okur, ikinci bir tip türetilmez.
 */
export type WelcomeCoupon = WelcomeCouponResponse;

/**
 * Kupon KODU — yalnız giriş yapmış üyeye döner (401 = üye değil).
 * API gövdesi `{ data: {...} }` sarmalıdır (consentPushController.ts).
 */
export async function fetchWelcomeCoupon(): Promise<WelcomeCoupon> {
  try {
    const res = await fetch("/api/auth/welcome-coupon", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return { available: false, reason: res.status === 401 ? "not_member" : "lookup_failed" };
    const json = (await res.json()) as { data?: WelcomeCoupon };
    return json?.data ?? { available: false, reason: "lookup_failed" };
  } catch {
    return { available: false, reason: "lookup_failed" };
  }
}

/**
 * Kayıt sonucu. Hata TÜRKÇE CÜMLEYE ÇEVRİLMEDEN döner: çeviri tek yerde,
 * `lib/authErrors.ts`'te yapılır (teknik metin sızmasın, hesap sayımına yardım
 * eden ayrım oluşmasın). `status: 0` → fetch throw etti, `body` fırlatılan
 * hatadır; çağıran `viewForThrown` kullanır.
 */
export type RegisterResult =
  | { ok: true }
  | { ok: false; status: number; body: unknown };

export interface RegisterMemberInput {
  email: string;
  password: string;
  name?: string;
  /**
   * Aydınlatma/KVKK kutusu GERÇEKTEN işaretlendi mi?
   *
   * ZORUNLU ALAN (DECISIONS D6 · DESIGN §3.A.10). Eskiden bu dosya gövdeye
   * sabit `kvkk_onay: true` yazıyordu: kullanıcı hiçbir şey onaylamamış olsa
   * bile `auth_users.kvkk_onay_at` doluyordu ve admin ekranı "kayıt formunda
   * onayladı" diyordu. Onay artık YALNIZ kullanıcının işaretinden gelir.
   */
  kvkkOnay: boolean;
}

/**
 * `/api/auth/register` gövdesi — SAF fonksiyon (test edilebilir olsun diye
 * ayrıldı). `kvkk_onay` alanı çağıranın verdiği değerdir; burada true'ya
 * yükseltilmez. API `kvkk_onay !== true` ise 400 döner.
 */
export function registerRequestBody(input: RegisterMemberInput): Record<string, unknown> {
  return {
    email: input.email,
    password: input.password,
    name: input.name,
    kvkk_onay: input.kvkkOnay === true,
  };
}

/** Mevcut üyelik akışı (/api/auth/register). Başarıda oturum çerezi kurulur. */
export async function registerMember(input: RegisterMemberInput): Promise<RegisterResult> {
  let res: Response;
  try {
    res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(registerRequestBody(input)),
    });
  } catch (thrown) {
    return { ok: false, status: 0, body: thrown };
  }
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, body: await res.json().catch(() => null) };
}

/* ─────────────── Pazarlama e-posta izni (ticari elektronik ileti) ───────────────
 *
 * DESIGN §3.G.2: izin YALNIZ üç noktada ve YALNIZ kişinin kendi eylemiyle
 * alınır — /giris kayıt formu, yeni üye penceresi, Hesabım anahtarı.
 * KVKK/aydınlatma onayı ile KARIŞTIRILMAZ (ayrı kutu, ayrı kayıt).
 *
 * Kutucuk yalnız API "yakalama açık" derse çizilir (bayrak + hukukça onaylı
 * metin sürümü). Metin API'den gelir; burada ikinci bir metin YAZILMAZ —
 * aksi halde saklanan `text_version` ile ekranda okunan metin ayrışırdı.
 * Kutucuk her zaman İŞARETSİZ başlar.
 */

export type MarketingConsentText = {
  version: string;
  /** Kutucuğun üstündeki başlık (Yönetmelik m.7/5: "Ticari Elektronik İleti İzni"). Eski sürümde yok → null. */
  heading: string | null;
  label: string;
  body: string;
};

export type MarketingConfig = {
  capture_enabled: boolean;
  unsubscribe_ready: boolean;
  text: MarketingConsentText | null;
};

/** API `memberConsentState` görünümü (Hesabım okur, admin aynı satırı okur). */
export type MarketingConsentState = {
  status: "granted" | "withdrawn" | "none";
  status_label: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  text_version: string | null;
  capture_enabled: boolean;
  suppressed_reason: string | null;
  suppressed_label: string | null;
};

/** Kaynak adları API'nin kabul ettiği kümeyle AYNI (`.strict()` şema). */
export type MarketingConsentSource = "account_settings" | "welcome_popup";

export const MARKETING_CONFIG_PATH = "/api/marketing/config";
export const MARKETING_CONSENT_PATH = "/api/auth/marketing/consent";

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/**
 * `{ok, marketing_email:{…}}` → güvenli yapı. Biçim bozuksa null (kutucuk
 * çizilmez: şüphede izin İSTENMEZ). Metin yoksa ya da boşsa yakalama kapalı
 * sayılır — okunmamış bir metne onay verdirilemez.
 */
export function parseMarketingConfig(json: unknown): MarketingConfig | null {
  const block = (json as { marketing_email?: unknown } | null)?.marketing_email as
    | { capture_enabled?: unknown; unsubscribe_ready?: unknown; text?: unknown }
    | undefined;
  if (!block || typeof block !== "object") return null;
  const rawText = block.text as { version?: unknown; heading?: unknown; label?: unknown; body?: unknown } | null | undefined;
  const text =
    rawText && nonEmpty(rawText.version) && nonEmpty(rawText.label) && typeof rawText.body === "string"
      ? { version: rawText.version, heading: nonEmpty(rawText.heading) ? rawText.heading : null, label: rawText.label, body: rawText.body }
      : null;
  return {
    capture_enabled: block.capture_enabled === true && text !== null,
    unsubscribe_ready: block.unsubscribe_ready === true,
    text,
  };
}

/** Kayıt formlarında pazarlama kutucuğu çizilsin mi? */
export function marketingCheckboxVisible(
  config: MarketingConfig | null,
): config is MarketingConfig & { text: MarketingConsentText } {
  return config?.capture_enabled === true && config.text !== null;
}

/**
 * /giris kayıt gövdesine eklenecek alan. Kutucuk ÇİZİLMEDİYSE hiçbir alan
 * eklenmez (bayrak kapalıyken gövde bugünküyle birebir aynı kalır); çizildiyse
 * kutunun GERÇEK durumu gider — true'ya yükseltilmez.
 */
export function registerMarketingField(shown: boolean, ticked: unknown): Record<string, boolean> {
  return shown ? { marketing_email: ticked === true } : {};
}

/**
 * Kayıt yanıtı izni KAYDETTİ mi? API kayıt transaction'ı içinde SAVEPOINT'le
 * yazar ve sonucu `marketing_email` alanında döner (`"granted"` ya da
 * `{status|outcome: "granted"}`). Alan yoksa (eski API) ya da başka bir sonuç
 * varsa (`not_recorded`, `disabled`) → kaydedilmedi.
 */
export function registerConsentRecorded(body: unknown): boolean {
  const value = (body as { marketing_email?: unknown } | null)?.marketing_email;
  if (value === "granted") return true;
  if (value && typeof value === "object") {
    const v = value as { status?: unknown; outcome?: unknown };
    return v.status === "granted" || v.outcome === "granted";
  }
  return false;
}

/** Kutu işaretlendi ama izin kaydedilmediyse kullanıcıya DÜRÜST not. */
export const MARKETING_NOT_RECORDED_NOTICE =
  "Üyeliğiniz oluşturuldu, ancak kampanya e-postası izniniz şu anda kaydedilemedi. Dilerseniz Hesabım sayfasından yeniden verebilirsiniz.";

export function registerConsentNotice(shown: boolean, ticked: boolean, body: unknown): string | null {
  if (!shown || !ticked) return null;
  return registerConsentRecorded(body) ? null : MARKETING_NOT_RECORDED_NOTICE;
}

/** Üye ucu gövdesi — `granted` yalnız gerçek boolean true ise true. */
export function marketingConsentRequestBody(
  granted: unknown,
  source: MarketingConsentSource,
): { granted: boolean; source: MarketingConsentSource } {
  return { granted: granted === true, source };
}

export function parseMarketingConsentState(json: unknown): MarketingConsentState | null {
  const s = (json as { marketing_email?: unknown } | null)?.marketing_email as
    | Partial<MarketingConsentState>
    | undefined;
  if (!s || typeof s !== "object") return null;
  if (s.status !== "granted" && s.status !== "withdrawn" && s.status !== "none") return null;
  return {
    status: s.status,
    status_label: nonEmpty(s.status_label) ? s.status_label : "",
    granted_at: typeof s.granted_at === "string" ? s.granted_at : null,
    withdrawn_at: typeof s.withdrawn_at === "string" ? s.withdrawn_at : null,
    text_version: typeof s.text_version === "string" ? s.text_version : null,
    capture_enabled: s.capture_enabled === true,
    suppressed_reason: typeof s.suppressed_reason === "string" ? s.suppressed_reason : null,
    suppressed_label: nonEmpty(s.suppressed_label) ? s.suppressed_label : null,
  };
}

export type MarketingToggleView = {
  /** Bölüm çizilsin mi? İzin varsa, izin geri çekilmişse ya da yakalama açıksa. */
  visible: boolean;
  checked: boolean;
  /** Anahtar değiştirilebilir mi? İzin varken geri çekme her zaman; vermek yalnız yakalama açıkken. */
  canToggle: boolean;
  statusLabel: string;
  /** Aktif gönderim engeli (Türkçe, sunucudan). */
  suppressedLabel: string | null;
  /** Anahtarın yanında okunacak onay metni (API'den; yoksa null). */
  text: MarketingConsentText | null;
};

/**
 * Hesabım anahtarı. Karar SUNUCUNUN alanlarından: durum, etiket, engel.
 *   • izin VAR     → her koşulda gösterilir, geri çekilebilir (bayraktan bağımsız).
 *   • geri çekilmiş → durum gösterilir; yeniden vermek yalnız yakalama açıkken.
 *   • hiç yok       → yalnız yakalama açıkken (verilemeyecek bir izin için
 *                     kutucuk çizilmez).
 */
export function marketingToggleView(
  state: MarketingConsentState | null,
  config: MarketingConfig | null,
): MarketingToggleView {
  const hidden: MarketingToggleView = {
    visible: false,
    checked: false,
    canToggle: false,
    statusLabel: "",
    suppressedLabel: null,
    text: null,
  };
  if (!state) return hidden;
  const granted = state.status === "granted";
  const canGrant = !granted && state.capture_enabled && marketingCheckboxVisible(config);
  if (!granted && !canGrant && state.status !== "withdrawn") return hidden;
  return {
    visible: true,
    checked: granted,
    canToggle: granted || canGrant,
    statusLabel: state.status_label,
    suppressedLabel: state.suppressed_label,
    text: marketingCheckboxVisible(config) ? config.text : null,
  };
}

/** Üye ucunun hata yanıtı → Türkçe cümle (teknik kod ekrana basılmaz). */
export function marketingErrorMessage(status: number, body: unknown): string {
  const raw = (body as { error?: unknown } | null)?.error;
  const human = typeof raw === "string" && /\s/.test(raw.trim()) ? raw.trim() : null;
  if (status === 401) return "Oturumunuzun süresi dolmuş. Lütfen yeniden giriş yapın.";
  if (status === 429) return human ?? "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";
  if (status === 503 && human) return human;
  if (status >= 500 || status === 0) return "İşlem şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin.";
  return human ?? "İşlem tamamlanamadı. Lütfen sayfayı yenileyip tekrar deneyin.";
}

/** Yakalama kutucuğunun durumu. Hata olursa null → kutucuk çizilmez. */
export async function fetchMarketingConfig(): Promise<MarketingConfig | null> {
  try {
    const res = await fetch(MARKETING_CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) return null;
    return parseMarketingConfig(await res.json());
  } catch {
    return null;
  }
}

export type MarketingConsentResult =
  | { ok: true; state: MarketingConsentState }
  | { ok: false; status: number; message: string };

async function consentCall(init: RequestInit): Promise<MarketingConsentResult> {
  let res: Response;
  try {
    res = await fetch(MARKETING_CONSENT_PATH, { cache: "no-store", credentials: "include", ...init });
  } catch {
    return { ok: false, status: 0, message: marketingErrorMessage(0, null) };
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, status: res.status, message: marketingErrorMessage(res.status, body) };
  const state = parseMarketingConsentState(body);
  return state ? { ok: true, state } : { ok: false, status: res.status, message: marketingErrorMessage(500, null) };
}

/** Üyenin güncel izni (Hesabım). */
export function fetchMarketingConsent(): Promise<MarketingConsentResult> {
  return consentCall({ method: "GET" });
}

/** İzin ver / geri çek — yanıt taze read-back'tir (ekran kendi tahminini göstermez). */
export function setMarketingConsent(
  granted: boolean,
  source: MarketingConsentSource,
): Promise<MarketingConsentResult> {
  return consentCall({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(marketingConsentRequestBody(granted, source)),
  });
}
