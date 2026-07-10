// ---------------------------------------------------------------------------
// PENDING DELIVERY — Ürün sayfasında (DeliveryPlanner) seçilen teslimat bilgisini
// checkout'a TAŞIYAN köprü. sessionStorage kullanır (sekme kapanınca silinir).
// ADDITIVE: sipariş/ödeme mantığına DOKUNMAZ; yalnız checkout formunu ön-doldurmak
// için okunur. Kullanıcı yine düzenleyebilir. Başarılı siparişte temizlenir.
// ---------------------------------------------------------------------------

export interface PendingDelivery {
  version?: number; // şema sürümü (eski kayıtlar backward-compatible)
  productSlug?: string;
  productName?: string;
  productImage?: string | null;
  categoryId?: number | null;
  quantity?: number;

  date?: string; // YYYY-MM-DD
  mode?: "sameday" | "cargo";

  // Slot (tam kimlik)
  slotId?: number | null;
  slotLabel?: string;
  slotStart?: string; // HH:MM:SS
  slotEnd?: string; // HH:MM:SS
  slotFeeMinor?: number | null;

  // Adres (tam)
  address?: string; // formattedAddress (açık adres)
  placeName?: string | null; // kurum/AVM/okul/site adı
  neighborhood?: string | null; // mahalle
  district?: string; // ilce
  city?: string; // il
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;

  // Teslimat meta
  band?: string | null;
  deliveryFeeMinor?: number | null;
  cargoEstimate?: string | null;

  ts?: number;
}

const KEY = "cy_pending_delivery";
const VERSION = 2;

export function savePendingDelivery(p: PendingDelivery): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...p, version: VERSION, ts: Date.now() }));
  } catch {
    /* sessionStorage kapalı/dolu → sessizce geç */
  }
}

export function readPendingDelivery(): PendingDelivery | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingDelivery;
    // 2 saatten eski seçimi bayat say (yanlış ürün/oturum sızmasın).
    if (p.ts && Date.now() - p.ts > 2 * 60 * 60 * 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearPendingDelivery(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* geç */
  }
}
