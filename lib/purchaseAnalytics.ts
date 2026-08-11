import { pushEcommerceEvent } from "@/lib/analytics";
import type { PaytrStatus } from "@/lib/payment";

const memorySent = new Set<string>();
const STORAGE_PREFIX = "cicekyolla:ga4-purchase:";

function validItemId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return String(value);
}

function wasSent(transactionId: string): boolean {
  if (memorySent.has(transactionId)) return true;
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${transactionId}`) === "1";
  } catch {
    return false;
  }
}

function markSent(transactionId: string): void {
  memorySent.add(transactionId);
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${transactionId}`, "1");
  } catch {
    // Storage engellense bile sonuç sayfasını bozma; memory guard bu mount'u korur.
  }
}

export function trackPaidPurchase(status: PaytrStatus): boolean {
  if (!status.paid || !status.order_number) return false;
  if (typeof status.total_amount_minor !== "number" || !Number.isFinite(status.total_amount_minor)) return false;
  if (!Array.isArray(status.items)) return false;

  const transactionId = status.order_number;
  if (wasSent(transactionId)) return false;

  const items = status.items.map((item) => {
    const itemId = validItemId(item.product_id);
    return {
      ...(itemId ? { item_id: itemId } : {}),
      item_name: item.product_name,
      price: item.unit_price_minor / 100,
      quantity: item.quantity,
    };
  });

  pushEcommerceEvent("purchase", {
    transaction_id: transactionId,
    value: status.total_amount_minor / 100,
    currency: status.currency || "TRY",
    items,
  });

  markSent(transactionId);
  return true;
}
