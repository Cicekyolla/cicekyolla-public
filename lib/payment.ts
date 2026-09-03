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
  /** GERÇEK tahsil edilen tutar, `currency` para biriminin minor birimiyle. */
  total_amount_minor?: number;
  /** 086 — tahsilat para birimi. Eski (TRY) siparişlerde "TRY" döner. */
  currency?: "TRY" | "USD" | "EUR";
  /** Muhasebe/denetim için TRY karşılığı — analitiğe GİTMEZ. */
  base_amount_minor?: number;
  base_currency?: "TRY";
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

export function ibanPretty(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}
