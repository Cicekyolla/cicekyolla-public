export type EcommerceItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function pushEcommerceEvent(
  event: string,
  ecommerce: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce });
}
