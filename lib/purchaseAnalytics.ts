import { pushEcommerceEvent } from "@/lib/analytics";
import { metaTrack } from "@/lib/metaPixel";
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

  /* Meta Pixel Purchase — GERÇEK ödeme onayı (status.paid) sonrası, PayTR'da
     olduğu gibi. eventID = order_number: backend CAPI'nin AYNI order_number'ı
     event_id olarak gönderdiği Purchase ile Meta tarafında otomatik dedup
     olur (bkz. metaCapiService.ts sendCapiPurchase). content_ids yalnız
     gerçek products.id taşıyan kalemlerden — slug/isim asla kullanılmaz. */
  const contentIds = status.items
    .map((item) => validItemId(item.product_id))
    .filter((id): id is string => Boolean(id));
  if (contentIds.length > 0) {
    metaTrack(
      "Purchase",
      {
        content_ids: contentIds,
        content_type: "product",
        value: status.total_amount_minor / 100,
        currency: "TRY",
      },
      transactionId,
    );
  }

  markSent(transactionId);
  return true;
}

/**
 * Havale/EFT ile OLUŞTURULMUŞ sipariş için purchase.
 * ---------------------------------------------------------------------------
 * Kart akışı ödeme onayını PayTR webhook'undan bekler ve trackPaidPurchase ile
 * gönderir. Havalede ise böyle bir onay anı YOKTUR: para sonradan, elle gelir.
 * Bu yüzden event "para tahsil edildi" değil, "başarılı havale siparişi
 * oluşturuldu" anlamındadır — backend gerçek order_number döndürdükten sonra.
 *
 * Aynı altyapı: aynı `purchase` event adı, aynı pushEcommerceEvent, aynı
 * mükerrer koruması (memory Set + localStorage). Yeni analytics mimarisi yok.
 */
export function trackHavaleOrderPurchase(order: {
  order_number: string;
  total_amount_minor: number;
  items: Array<{ product_id?: number | null; product_name: string; unit_price_minor: number; quantity: number }>;
}): boolean {
  if (!order.order_number) return false;
  if (typeof order.total_amount_minor !== "number" || !Number.isFinite(order.total_amount_minor)) return false;
  if (!Array.isArray(order.items) || order.items.length === 0) return false;

  const transactionId = order.order_number;
  if (wasSent(transactionId)) return false;

  const items = order.items.map((item) => {
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
    value: order.total_amount_minor / 100,
    currency: "TRY",
    payment_type: "havale",
    items,
  });

  markSent(transactionId);
  return true;
}
