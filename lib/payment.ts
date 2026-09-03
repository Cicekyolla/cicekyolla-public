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
}

export const SUPPORT_WHATSAPP = "https://wa.me/905458813450";

export async function fetchBankAccounts(): Promise<BankAccountPublic[]> {
  try {
    const r = await fetch("/api/bank-accounts", { cache: "no-store" });
    if (!r.ok) return [];
    return (await r.json()).data ?? [];
  } catch {
    return [];
  }
}

export async function createHavaleOrder(body: unknown): Promise<{ order_number: string; total_amount_minor: number }> {
  const r = await fetch("/api/payment/havale", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) { const e = await r.json().catch(() => null); throw new Error((e && e.error) || String(r.status)); }
  return (await r.json()).data;
}

export async function initPaytr(body: unknown): Promise<{ merchant_oid: string; iframe_url: string }> {
  const r = await fetch("/api/payment/paytr-init", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) { const e = await r.json().catch(() => null); throw new Error((e && e.error) || String(r.status)); }
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
