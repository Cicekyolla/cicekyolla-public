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
/** Popup adres yazdığında yayınlanır; PDP planlayıcı dinler (tek kayıt, ikinci state yok). */
export const PENDING_ADDRESS_EVENT = "cy:pending-address";
const VERSION = 2;

// ── KALICI ADRES HAFIZASI (ADDITIVE) ────────────────────────────────────────
// Sorun: seçim sessionStorage'da ve 2 saatte bayatlıyor → müşteri "Çiçeğinizi
// nereye gönderelim?" sorusunu tekrar tekrar görüyordu.
// Karar: İKİNCİ BİR ADRES SİSTEMİ KURULMAZ. Aynı kaydın YALNIZ ADRES alanları
// localStorage'a aynalanır; slot/tarih/ürün ASLA aynalanmaz — böylece hatırlanan
// şey sadece "nereye" olur, "ne zaman" her seferinde Delivery Engine'den gelir.
const REMEMBER_KEY = "cy_delivery_address_v1";
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

/** Yalnız adres alanları — hatırlanan kayıt bundan ibarettir. */
type RememberedAddress = Pick<
  PendingDelivery,
  "address" | "placeName" | "neighborhood" | "district" | "city" | "placeId" | "lat" | "lng"
> & { ts: number; version: number };

function pickAddress(p: PendingDelivery): Omit<RememberedAddress, "ts" | "version"> {
  return {
    address: p.address,
    placeName: p.placeName ?? null,
    neighborhood: p.neighborhood ?? null,
    district: p.district,
    city: p.city,
    placeId: p.placeId ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
  };
}

function rememberAddress(p: PendingDelivery): void {
  if (typeof window === "undefined") return;
  if (!hasPendingAddress(p) || !p.address) return;
  try {
    const row: RememberedAddress = { ...pickAddress(p), ts: Date.now(), version: VERSION };
    window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(row));
  } catch {
    /* localStorage kapalı/dolu → hatırlama sessizce devre dışı kalır */
  }
}

/**
 * Hatırlanan adres (varsa). Bayat (30 gün+) veya koordinatı geçersiz kayıt
 * GÜVENLİ FALLBACK olarak temizlenir ve null döner — teslimat uygunluğu her
 * hâlükârda Delivery Engine tarafından yeniden karara bağlanır.
 */
export function readRememberedAddress(): PendingDelivery | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const row = JSON.parse(raw) as RememberedAddress;
    const fresh = typeof row?.ts === "number" && Date.now() - row.ts <= REMEMBER_TTL_MS;
    const candidate: PendingDelivery = {
      address: row?.address, placeName: row?.placeName ?? null, neighborhood: row?.neighborhood ?? null,
      district: row?.district, city: row?.city, placeId: row?.placeId ?? null,
      lat: row?.lat ?? null, lng: row?.lng ?? null, ts: row?.ts,
    };
    if (!fresh || !hasPendingAddress(candidate) || !candidate.address) {
      window.localStorage.removeItem(REMEMBER_KEY);
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

/** Hatırlanan adresi unut (yalnız kullanıcı açıkça isterse çağrılır). */
export function forgetRememberedAddress(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(REMEMBER_KEY); } catch { /* geç */ }
  try { window.dispatchEvent(new CustomEvent(PENDING_ADDRESS_EVENT)); } catch { /* geç */ }
}

export function savePendingDelivery(p: PendingDelivery): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...p, version: VERSION, ts: Date.now() }));
  } catch {
    /* sessionStorage kapalı/dolu → sessizce geç */
  }
  // Adres tarafı kalıcı aynaya da yazılır (slot/tarih/ürün ASLA).
  rememberAddress(p);
}

export function readPendingDelivery(): PendingDelivery | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return readRememberedAddress();
    const p = JSON.parse(raw) as PendingDelivery;
    // 2 saatten eski seçimi bayat say (yanlış ürün/oturum sızmasın).
    // Seçim düşer ama HATIRLANAN ADRES ayakta kalır — müşteri adresi yeniden yazmaz.
    if (p.ts && Date.now() - p.ts > 2 * 60 * 60 * 1000) return readRememberedAddress();
    return p;
  } catch {
    return readRememberedAddress();
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
  // Aynı sayfada mount olmuş DeliveryPlanner (popup PDP üzerinde açıldıysa) adresi alsın.
  try { window.dispatchEvent(new CustomEvent(PENDING_ADDRESS_EVENT)); } catch { /* geç */ }
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

/** "Değiştir" düğmesi: mevcut adres popup'ını elle açtırır (ikinci seçici YOK). */
export const OPEN_ADDRESS_POPUP_EVENT = "cy:open-address-popup";

export function openDeliveryAddressPopup(): void {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent(OPEN_ADDRESS_POPUP_EVENT)); } catch { /* geç */ }
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
