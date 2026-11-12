// ============================================================================
// Web AI Satış Danışmanı (sohbet paneli) — SAF MANTIK. React / DOM / fetch YOK;
// bileşenler (components/concierge/*) ve rotalar (app/api/concierge/*) bunu kullanır,
// birim testleri (lib/concierge.test.ts) doğrudan sınar.
//
// SINIRLAR (bilinçli):
//   • Sepete EKLEMEZ, sipariş / ödeme OLUŞTURMAZ: kart müşteriyi kendi dilindeki ürün sayfasına
//     götürür; teslimat seçimi ve sepete ekleme oradaki mevcut akıştadır.
//   • Ürün, fiyat, fotoğraf ve bağlantı YALNIZ API yanıtından gelir; burada hiçbiri üretilmez.
//   • Yanıt düz METİN olarak çizilir (HTML yok); kart bağlantısı yalnız site içi yoldur.
// ============================================================================

import { GLOBAL_WHATSAPP_URL, isProductPagePath, telegramLocale } from "./telegramContact.ts";

/** Sohbet arayüzünün sözlük anahtarları (14 dilin hepsinde dolu olmalı — lib/concierge.test.ts). */
export const CONCIERGE_DICT_KEYS = [
  "concierge.launcher", "concierge.title", "concierge.greeting",
  "concierge.quick1", "concierge.quick2", "concierge.quick3",
  "concierge.placeholder", "concierge.send", "concierge.close", "concierge.typing",
  "concierge.tierEconomy", "concierge.tierRecommended", "concierge.tierPremium",
  "concierge.cardCta", "concierge.whatsapp", "concierge.tryNote",
  "concierge.errorNetwork", "concierge.errorRate", "concierge.errorBusy", "concierge.retry",
  "concierge.privacy",
] as const;
export type ConciergeDictKey = (typeof CONCIERGE_DICT_KEYS)[number];

// ---------------------------------------------------------------------------
// Görünürlük ve yerleşim
// ---------------------------------------------------------------------------

/**
 * Başlatıcının HİÇ çizilmediği yollar: kritik alışveriş / ödeme akışı (ConsentManager →
 * MARKETING_BLOCKED_PATHS ile AYNI liste; eşitlik testle kilitli) + üyelik / şifre formları.
 */
export const CONCIERGE_HIDDEN_PREFIXES = [
  "/checkout", "/sepet", "/odeme", "/siparis", "/hizli-siparis", "/e-posta-tercihleri",
  "/giris", "/hesabim", "/sifre-belirle", "/sifremi-unuttum",
] as const;

export function conciergeVisibleOnPath(pathname: string | null | undefined): boolean {
  const p = String(pathname || "/");
  return !CONCIERGE_HIDDEN_PREFIXES.some((b) => p === b || p.startsWith(`${b}/`) || p.startsWith(`${b}?`));
}

/**
 * Sol alt köşedeki dikey yuva. Sağ sütun doludur (WhatsApp, Telegram, yukarı çık); sol altta ise
 *   • TR'de hoş geldin teklifi (NewMemberPopup): mobil 16–68 px, masaüstü 24–76 px,
 *   • ürün sayfasında mobil "Sipariş Ver" çubuğu: 0–~72 px (TR'de teklif onun üstünde 92–144 px)
 * bulunur. Başlatıcı bu alanların ÜSTÜNDE, sabit bir yuvada durur (teklif o an görünmese de yuva
 * değişmez → zıplama / CLS yok). Sınıf adları bileşende sabit yazılıdır (Tailwind taraması için);
 * burada yalnız hangi yuvanın seçileceğine karar verilir.
 *
 *   tr         : mobil 80 px  · masaüstü 88 px   (teklifin üstü)
 *   tr-product : mobil 156 px · masaüstü 88 px   (çubuk + teklifin üstü)
 *   global         : mobil 16 px · masaüstü 24 px  (sol alt boş)
 *   global-product : mobil 92 px · masaüstü 24 px  (çubuğun üstü)
 */
export type LauncherSlot = "tr" | "tr-product" | "global" | "global-product";

export function launcherSlot(pathname: string | null | undefined): LauncherSlot {
  const global = telegramLocale(pathname) !== "tr";
  const product = isProductPagePath(pathname);
  if (global) return product ? "global-product" : "global";
  return product ? "tr-product" : "tr";
}

/** Yuvaların alt ofseti (px, güvenli alan hariç) — test ve dokümantasyon için tek kaynak. */
export const LAUNCHER_SLOT_PX: Record<LauncherSlot, { mobile: number; desktop: number }> = {
  tr: { mobile: 80, desktop: 88 },
  "tr-product": { mobile: 156, desktop: 88 },
  global: { mobile: 16, desktop: 24 },
  "global-product": { mobile: 92, desktop: 24 },
};

// ---------------------------------------------------------------------------
// WhatsApp devri — mevcut bağlantılar (yeni numara / yeni akış YOK)
// ---------------------------------------------------------------------------

/** TR: yüzen WhatsApp düğmesiyle AYNI bağlantı (components/WhatsAppButton.tsx; eşitlik testle kilitli). */
export const TR_WHATSAPP_URL = "https://wa.me/905458813450?text=Merhaba%2C%20sipari%C5%9F%20vermek%20istiyorum";

export function conciergeWhatsappUrl(locale: string | null | undefined): string {
  return locale && locale !== "tr" ? GLOBAL_WHATSAPP_URL : TR_WHATSAPP_URL;
}

// ---------------------------------------------------------------------------
// Oturum belirteci (yalnız sekme oturumunda saklanır)
// ---------------------------------------------------------------------------

export const SESSION_STORAGE_KEY = "cy_concierge_session";
export const STATUS_STORAGE_KEY = "cy_concierge_on";
/** Açık/kapalı durumu bu süre boyunca yeniden sorulmaz. */
export const STATUS_TTL_MS = 10 * 60_000;

/** API'nin ürettiği biçim: 43 karakter base64url. Başka her değer yok sayılır. */
export function isSessionToken(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
}

/** Saklanan durum değeri: "1:<zaman>" açık · "0:<zaman>" kapalı. Süresi dolmuş / bozuk → null (yeniden sor). */
export function readStatusCache(raw: string | null | undefined, now: number): boolean | null {
  const m = /^([01]):(\d{10,16})$/.exec(String(raw ?? ""));
  if (!m) return null;
  const at = Number(m[2]);
  if (!Number.isFinite(at) || now - at > STATUS_TTL_MS || at > now + 60_000) return null;
  return m[1] === "1";
}
export function writeStatusCache(on: boolean, now: number): string {
  return `${on ? 1 : 0}:${now}`;
}

// ---------------------------------------------------------------------------
// İstek
// ---------------------------------------------------------------------------

/** API'nin mesaj karakter tavanı (webConcierge/config.ts → maxMessageChars varsayılanı). */
export const MAX_MESSAGE_CHARS = 600;

export interface ConciergeRequestBody { text: string; lang: string; path: string; session_token?: string }

/** Gönderilecek gövde. Yol yalnız pathname'dir (sorgu dizesi / parça gitmez → utm, gclid, kişisel veri sızmaz). */
export function buildRequestBody(text: string, locale: string, pathname: string | null | undefined, token: unknown): ConciergeRequestBody {
  const path = String(pathname || "/").split(/[?#]/)[0].slice(0, 200) || "/";
  const body: ConciergeRequestBody = { text: text.trim().slice(0, MAX_MESSAGE_CHARS), lang: locale, path };
  if (isSessionToken(token)) body.session_token = token;
  return body;
}

export function canSend(text: string, pending: boolean, closed: boolean): boolean {
  const t = text.trim();
  return !pending && !closed && t.length > 0 && t.length <= MAX_MESSAGE_CHARS;
}

// ---------------------------------------------------------------------------
// Yanıt doğrulama — API'ye bile körlemesine güvenilmez
// ---------------------------------------------------------------------------

export type CardTier = "economy" | "recommended" | "premium";
export interface ConciergeCard {
  productId: number;
  tier: CardTier | null;
  name: string;
  priceMinor: number;
  /** Site içi yol (kök yok). Tıklama aynı sitede kalır; önizleme alan adlarında da çalışır. */
  path: string;
  imageUrl: string;
}

const SITE_HOSTS = new Set(["www.cicekyolla.com.tr", "cicekyolla.com.tr"]);
const TIERS = new Set<string>(["economy", "recommended", "premium"]);

/**
 * Kart bağlantısı → site içi yol. Kabul: https://(www.)cicekyolla.com.tr/… ya da "/…".
 * Ret: başka alan adı, http, protokol-göreli (//…), javascript:/data:, ters eğik çizgi, kontrol karakteri.
 */
export function cardPath(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0 || url.length > 500) return null;
  if (/[\u0000-\u001f\\]/.test(url)) return null;
  let path: string;
  if (url.startsWith("/")) {
    if (url.startsWith("//")) return null;
    path = url;
  } else {
    let u: URL;
    try { u = new URL(url); } catch { return null; }
    if (u.protocol !== "https:" || !SITE_HOSTS.has(u.hostname) || u.username || u.password || u.port) return null;
    path = u.pathname;
  }
  path = path.split(/[?#]/)[0];
  return /^\/[A-Za-z0-9\-._~%/]*$/.test(path) && path.length > 1 ? path : null;
}

/** Fotoğraf yalnız https ya da site içi yol üzerinden (karışık içerik / javascript: / data: / protokol-göreli yok). */
export function safeImageUrl(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0 || url.length > 800 || /[\u0000-\u001f\\]/.test(url)) return null;
  if (url.startsWith("/")) return url.startsWith("//") ? null : url;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch { return null; }
}

export function parseCards(raw: unknown): ConciergeCard[] {
  if (!Array.isArray(raw)) return [];
  const out: ConciergeCard[] = [];
  const seen = new Set<number>();
  for (const c of raw.slice(0, 10)) {
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    const productId = Number(r.product_id);
    const priceMinor = Number(r.price_minor);
    const path = cardPath(r.url);
    const imageUrl = safeImageUrl(r.image_url);
    const name = typeof r.name === "string" ? r.name.trim().slice(0, 160) : "";
    // Eksik / geçersiz alanlı kart HİÇ gösterilmez (yarım kart, fiyatsız ürün yok). Para birimi daima TRY.
    if (!Number.isInteger(productId) || productId <= 0 || seen.has(productId)) continue;
    if (!Number.isInteger(priceMinor) || priceMinor <= 0 || !path || !imageUrl || !name) continue;
    if (r.currency != null && r.currency !== "TRY") continue;
    seen.add(productId);
    out.push({ productId, tier: typeof r.tier === "string" && TIERS.has(r.tier) ? (r.tier as CardTier) : null, name, priceMinor, path, imageUrl });
  }
  return out;
}

export type TurnOutcome =
  | { kind: "reply"; reply: string; lang: string; cards: ConciergeCard[]; handoff: boolean; closed: boolean; sessionToken: string | null }
  /** Asistan meşgul (aynı oturumda süren tur) → kısa süre sonra yeniden dene. */
  | { kind: "busy"; sessionToken: string | null }
  /** Hız sınırı (429). */
  | { kind: "rate"; retryAfterSeconds: number }
  /** Asistan kapalı (bayrak) → panel kapanır, başlatıcı gizlenir. */
  | { kind: "off" }
  /** Ağ / sunucu hatası ya da tanınmayan yanıt. */
  | { kind: "error" };

const LANGS = new Set(["tr", "en", "de", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"]);

/** HTTP durumu + gövde → arayüzün işleyeceği sonuç. Tanınmayan her şey "error" olur (uydurma metin gösterilmez). */
export function parseTurn(httpStatus: number, json: unknown, retryAfterHeader?: string | null): TurnOutcome {
  if (httpStatus === 404) return { kind: "off" };
  if (httpStatus === 429) {
    const s = Number(retryAfterHeader);
    return { kind: "rate", retryAfterSeconds: Number.isFinite(s) && s > 0 ? Math.min(Math.ceil(s), 3600) : 60 };
  }
  const data = (json && typeof json === "object" ? (json as Record<string, unknown>).data : null) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return { kind: "error" };
  const token = isSessionToken(data.session_token) ? data.session_token : null;
  if (httpStatus === 409 || data.status === "busy") return { kind: "busy", sessionToken: token };
  if (httpStatus !== 200) return { kind: "error" };
  const status = data.status;
  if (status !== "ok" && status !== "limit" && status !== "unavailable") return { kind: "error" };
  const reply = typeof data.reply === "string" ? data.reply.trim().slice(0, 2000) : "";
  if (!reply) return { kind: "error" };
  const lang = typeof data.lang === "string" && LANGS.has(data.lang) ? data.lang : "tr";
  const remaining = Number(data.remaining_messages);
  return {
    kind: "reply", reply, lang,
    cards: status === "ok" ? parseCards(data.cards) : [],
    handoff: data.handoff != null && typeof data.handoff === "object",
    // Oturum sınırı doldu ya da asistan bugün için kapalı → yeni mesaj yazılamaz, WhatsApp'a yönlendirilir.
    closed: status !== "ok" || (Number.isFinite(remaining) && remaining <= 0),
    sessionToken: token,
  };
}

// ---------------------------------------------------------------------------
// Panel durumu (reducer)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  lang?: string;
  cards?: ConciergeCard[];
  handoff?: boolean;
}

export type ChatError = "network" | "rate" | "busy";

export interface ChatState {
  messages: ChatMessage[];
  pending: boolean;
  /** Son gönderilen ama yanıtı alınamayan metin (yeniden gönder düğmesi için). */
  failedText: string | null;
  error: ChatError | null;
  /** true → yeni mesaj yazılamaz (oturum sınırı / günlük tavan). */
  closed: boolean;
  /** Bayrak kapandı → panel kapatılmalı. */
  off: boolean;
  seq: number;
}

export const INITIAL_CHAT: ChatState = { messages: [], pending: false, failedText: null, error: null, closed: false, off: false, seq: 0 };

export type ChatAction =
  | { type: "send"; text: string }
  | { type: "outcome"; outcome: TurnOutcome }
  | { type: "dismissError" };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  if (action.type === "send") {
    const text = action.text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!canSend(text, state.pending, state.closed)) return state;
    const seq = state.seq + 1;
    // Başarısız mesaj yeniden gönderiliyorsa ikinci kez listeye eklenmez.
    const last = state.messages[state.messages.length - 1];
    const resend = state.failedText === text && last?.role === "user" && last.text === text;
    return { ...state, seq, pending: true, error: null, failedText: null, messages: resend ? state.messages : [...state.messages, { id: seq, role: "user", text }] };
  }
  if (action.type === "dismissError") return { ...state, error: null };
  if (!state.pending) return state; // beklenmeyen / geç gelen yanıt yok sayılır
  const o = action.outcome;
  const lastUser = [...state.messages].reverse().find((m) => m.role === "user")?.text ?? null;
  if (o.kind === "reply") {
    const seq = state.seq + 1;
    return {
      ...state, seq, pending: false, error: null, failedText: null, closed: o.closed,
      messages: [...state.messages, { id: seq, role: "assistant", text: o.reply, lang: o.lang, cards: o.cards, handoff: o.handoff || o.closed }],
    };
  }
  if (o.kind === "off") return { ...state, pending: false, off: true };
  const error: ChatError = o.kind === "rate" ? "rate" : o.kind === "busy" ? "busy" : "network";
  return { ...state, pending: false, error, failedText: lastUser };
}
