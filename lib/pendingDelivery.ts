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
  occasion?: string | null; // vesile (ileride CRM/AI/kampanya)

  /** Teslimat Adresi popup'ı bu oturumda kapatıldı (aynı kayıt; ikinci storage YOK). */
  popupDismissed?: boolean;

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

/** Adres alanları dolu ve koordinat geçerli mi? (popup/PDP ön-dolum için tek ölçüt) */
export function hasPendingAddress(p: PendingDelivery | null | undefined): p is PendingDelivery & { lat: number; lng: number } {
  return !!p && typeof p.lat === "number" && Number.isFinite(p.lat) && typeof p.lng === "number" && Number.isFinite(p.lng);
}

/** Popup'tan seçilen DOĞRULANMIŞ adresi ortak kayda yazar (yalnız adres; slot/mode/ürün YOK).
 *  PDP/sepet/checkout aynı kaydı okur — ikinci adres state'i yoktur. */
export function savePendingAddress(a: {
  formattedAddress: string; placeId?: string | null; placeName?: string | null;
  lat: number | null; lng: number | null; il?: string | null; ilce?: string | null; mahalle?: string | null;
}): void {
  const prev = readPendingDelivery();
  savePendingDelivery({
    occasion: prev?.occasion ?? null,
    address: a.formattedAddress,
    placeName: a.placeName ?? null,
    neighborhood: a.mahalle ?? null,
    district: a.ilce ?? undefined,
    city: a.il ?? undefined,
    placeId: a.placeId ?? null,
    lat: a.lat ?? null,
    lng: a.lng ?? null,
  });
}

/** Teslimat SEÇİMİNİ (slot/mode/tarih/ürün) geçersiz kılar, ADRESİ korur.
 *  Adres değişiminde eski slot/kargo state'i sızmasın; ama müşteri adresi yeniden yazmasın. */
export function clearPendingSelection(): void {
  const p = readPendingDelivery();
  if (!p) return;
  if (!hasPendingAddress(p)) { clearPendingDelivery(); return; }
  savePendingDelivery({
    occasion: p.occasion ?? null,
    popupDismissed: p.popupDismissed,
    address: p.address, placeName: p.placeName ?? null, neighborhood: p.neighborhood ?? null,
    district: p.district, city: p.city, placeId: p.placeId ?? null, lat: p.lat, lng: p.lng,
  });
}

export function markDeliveryPopupDismissed(): void {
  const p = readPendingDelivery();
  savePendingDelivery({ ...(p ?? {}), popupDismissed: true });
}

export function clearPendingDelivery(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* geç */
  }
}
