// Ödeme client — Next.js /api proxy'leri üzerinden backend'e gider.
// Kart verisi burada TUTULMAZ/işlenmez; kart PayTR iframe'inde alınır.

export interface BankAccountPublic {
  public_id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name: string | null;
  note: string | null;
}

export interface PaidOrderItem {
  product_id: number | string | null;
  product_name: string;
  unit_price_minor: number;
  quantity: number;
}

export interface PaytrStatus {
  paid: boolean;
  status: string;
  order_number: string | null;
  total_amount_minor?: number;
  currency?: string;
  items?: PaidOrderItem[];
  /* ADDITIVE (4 Kas 2026) — yedek sağlayıcı. Yalnız sunucu DOĞRULANMIŞ başarısızlık
     gördüğünde dolu gelir; belirsiz (pending) durumda daima false/null. */
  retry_available?: boolean;
  retry_provider?: "paytr" | "iyzico" | null;
  retry_needs_email?: boolean;
  order_id?: number | null;
  /** Ana ve yedek altyapı da başarısız → sipariş "ödeme başarısız". */
  payment_failed?: boolean;
}

export const SUPPORT_WHATSAPP = "https://wa.me/905458813450";

/* ─────────────────────────────────────────────────────────────────────────
 * SİPARİŞ/ÖDEME HATASI — HTTP DURUMU KAYBOLMAZ
 *
 * Eskiden yalnız `new Error(e.error)` fırlatılıyordu: çağıran taraf 409 (kupon
 * reddi) ile 500'ü ayırt edemiyor ve müşteriye hep aynı genel metni
 * gösteriyordu. `Error.message` sözleşmesi KORUNUR (mevcut karşılaştırmalar
 * çalışmaya devam eder), yanına `status` ve `apiError` eklenir.
 * ──────────────────────────────────────────────────────────────────────── */
export class CheckoutApiError extends Error {
  /** HTTP durumu (proxy hatasında 502). */
  readonly status: number;
  /** Sunucunun `{ error: ... }` gövdesi — Türkçe cümle ya da makine kodu. */
  readonly apiError: string | null;
  /** ADDITIVE (24 Eyl 2026): sunucunun `{ details }` alanı (sepet doğrulaması: hangi ürün, hangi yöntem). */
  readonly details: unknown;

  // NOT: "parameter property" (constructor(readonly x: number)) KULLANILMAZ.
  // Node'un tip-sıyırma modu (`node --test lib/*.test.ts`) bu sözdizimini
  // ayrıştıramıyor ve bu dosyayı import eden TÜM testler çöküyor
  // (ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX). Alanlar açıkça atanır.
  constructor(status: number, apiError: string | null, details: unknown = null) {
    super(apiError || String(status));
    this.name = "CheckoutApiError";
    this.status = status;
    this.apiError = apiError;
    this.details = details;
  }
}

async function readApiError(response: Response): Promise<CheckoutApiError> {
  const body = (await response.json().catch(() => null)) as { error?: unknown; details?: unknown } | null;
  const apiError = typeof body?.error === "string" && body.error.trim() ? body.error.trim() : null;
  return new CheckoutApiError(response.status, apiError, body?.details ?? null);
}

export async function fetchBankAccounts(): Promise<BankAccountPublic[]> {
  try {
    const r = await fetch("/api/bank-accounts", { cache: "no-store" });
    if (!r.ok) return [];
    return (await r.json()).data ?? [];
  } catch {
    return [];
  }
}

/** Havale yanıtı — `total_amount_minor` SUNUCUNUN yetkili toplamıdır. */
export interface HavaleOrderResult {
  order_number: string;
  public_id?: string;
  total_amount_minor?: number;
  payment_status?: string;
  payment_method?: string;
  member_linked?: boolean;
}

export async function createHavaleOrder(body: unknown): Promise<HavaleOrderResult> {
  const r = await fetch("/api/payment/havale", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw await readApiError(r);
  return (await r.json()).data;
}

/** PayTR init yanıtı — tutar yine SUNUCUDAN (istemci hesabı gösterilmez). */
export interface PaytrInitResult {
  merchant_oid: string;
  iframe_url: string;
  iframe_token?: string;
  total_amount_minor?: number;
  member_linked?: boolean;
  /** ADDITIVE: aynı sipariş için yedek altyapıyla tekrar deneme yetkisi (yalnız bu sekme). */
  retry_key?: string | null;
  order_id?: number;
}

/** Yedek / ana sağlayıcı başlatma yanıtı (aynı sipariş). Kart verisi YOK. */
export interface ProviderInitResult {
  merchant_oid: string;
  order_id: number;
  provider: "paytr" | "iyzico";
  total_amount_minor?: number;
  retry_key?: string | null;
  /** iyzico: ödeme sayfası adresi (tam sayfa yönlendirme). */
  payment_page_url?: string;
  /** PayTR: güvenli ödeme adresi. */
  iframe_url?: string;
}

/**
 * AYNI sipariş için yeni deneme (yeni sipariş OLUŞTURULMAZ). Tutar istemciden
 * gönderilmez; sunucu sipariş satırlarından hesaplar.
 */
export async function initProviderRetry(
  provider: "paytr" | "iyzico",
  body: { order_id: number; retry_key: string; email?: string; payment_locale?: string },
): Promise<ProviderInitResult> {
  const r = await fetch(`/api/payment/${provider}-init`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw await readApiError(r);
  return (await r.json()).data;
}

/** PAYMENT_PRIMARY = iyzico iken checkout'un ilk denemesi (sipariş + iyzico oturumu). */
export async function initIyzicoPrimary(body: unknown): Promise<ProviderInitResult> {
  const r = await fetch("/api/payment/iyzico-init", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw await readApiError(r);
  return (await r.json()).data;
}

/** Ödeme sırası (yalnız sağlayıcı adları). Hata → bugünkü davranış: PayTR. */
export async function fetchPrimaryProvider(): Promise<"paytr" | "iyzico"> {
  try {
    const r = await fetch("/api/payment/providers", { cache: "no-store" });
    if (!r.ok) return "paytr";
    const d = (await r.json())?.data as { primary?: string } | undefined;
    return d?.primary === "iyzico" ? "iyzico" : "paytr";
  } catch {
    return "paytr";
  }
}

export async function initPaytr(body: unknown): Promise<PaytrInitResult> {
  const r = await fetch("/api/payment/paytr-init", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw await readApiError(r);
  return (await r.json()).data;
}

export async function paytrStatus(oid: string): Promise<PaytrStatus> {
  const r = await fetch(`/api/payment/paytr-status/${encodeURIComponent(oid)}`, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()).data;
}

/* ─────────────────────────────────────────────────────────────────────────
 * IBAN — GÖSTERİM KATMANI (banka kaydı DEĞİŞTİRİLMEZ)
 *
 * Canlı kayıtta ülke ön eki düşmüş olabiliyor: Havale/EFT ekranında müşteriye
 * "8300 0620 0020 5000 0629 1174" gösteriliyordu; hiçbir banka uygulaması bunu
 * kabul etmez (TR IBAN 26 karakterdir ve "TR" ile başlar).
 *
 * KURAL — TAHMİN YOK: ön ek YALNIZCA değer tam 24 rakamsa VE "TR" eklenmiş hâli
 * ISO 13616 mod-97 sağlamasını GEÇİYORSA eklenir. Sağlama geçmezse değer olduğu
 * gibi kalır. Böylece yanlış bir hesaba para gitmesi matematiksel olarak imkânsız.
 * (Veritabanındaki kaydın da düzeltilmesi gerekir; bu katman yalnız kurtarmadır.)
 * ──────────────────────────────────────────────────────────────────────── */

function mod97(digits: string): number {
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem;
}

/** ISO 13616 sağlaması. Harfler A=10 … Z=35'e çevrilir. */
export function isValidIban(value: string): boolean {
  const s = String(value ?? "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return mod97(numeric) === 1;
}

/** Boşluksuz, büyük harfli ve (sağlama geçiyorsa) TR ön ekli IBAN. */
export function normalizeIban(iban: string): string {
  const s = String(iban ?? "").replace(/\s+/g, "").toUpperCase();
  if (/^\d{24}$/.test(s) && isValidIban(`TR${s}`)) return `TR${s}`;
  return s;
}

export function ibanPretty(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})/g, "$1 ").trim();
}

/* ─────────────────────────────────────────────────────────────────────────
 * PAYTR SİTE-İÇİ ÇERÇEVE BAYRAĞI
 *
 * Backend zaten PayTR iFrame API'sini kullanıyor; vitrin ise dönen adrese TAM
 * SAYFA YÖNLENDİRME yapıyordu. Bu bayrak açıkken aynı adres ÇiçekYolla
 * checkout'unun İÇİNDE bir <iframe> olarak gösterilir.
 *
 * VARSAYILAN KAPALI. Ödeme gerçek paradır: davranış ancak operatör Vercel'de
 * NEXT_PUBLIC_PAYTR_EMBED=true yapıp sandbox'ta uçtan uca doğruladıktan sonra
 * değişir. Bayrak kapalıyken bugünkü yönlendirme akışı BİREBİR aynı çalışır.
 * ──────────────────────────────────────────────────────────────────────── */
export const PAYTR_EMBED_ENABLED = process.env.NEXT_PUBLIC_PAYTR_EMBED === "true";
