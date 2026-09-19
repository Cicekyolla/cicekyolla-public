// ---------------------------------------------------------------------------
// memberAccountView.ts — Hesabım ekranının SAF görünüm mantığı.
//
// NEDEN AYRI DOSYA: Hesabım'daki her rakam ve her durum cümlesi API'den gelir
// (`GET /api/auth/account`). Bu dosya yalnız ÇEVİRİ ve GRUPLAMA yapar:
//   • ham enum'u Türkçe etikete çevirir (ekranda `payment_status` yazmaz),
//   • sunucunun gönderdiği özet sayılarını olduğu gibi kartlara yerleştirir,
//   • siparişleri sunucunun kendi `status` alanına göre "aktif / geçmiş"
//     başlıkları altında gösterir.
//
// BURADA OLMAYAN ŞEY: iş kuralı. Kaç sipariş "ödenmiş" sayılır, hangi kupon
// "kullanılabilir", geçmiş gizli mi — hepsi sunucunun kararıdır (orderTruth.ts,
// couponLifecycle.ts, memberAccountController.ts). İstemci bunları yeniden
// HESAPLAMAZ; yeniden hesaplarsa iki ekran birbirini yalanlar.
//
// Eski API sürümüyle uyum: `ownership` / `order_summary` blokları ADDITIVE'dir.
// Gelmezlerse ilgili kart/rakam hiç çizilmez (uydurma sıfır gösterilmez).
//
// BAĞIMSIZLIK: bu modül hiçbir yerel modülü import etmez (node --test ile
// doğrudan koşulabilmesi için repo kuralı). Telefonun okunur biçimi
// `lib/authErrors.ts::formatTrMobile` ile üretilir ve ekrandan GEÇİRİLİR —
// ikinci bir numara normalleştirici burada TANIMLANMAZ.
// ---------------------------------------------------------------------------

/* ────────────────────────── Sunucu sözleşmesi ────────────────────────── */

export interface MemberOrderItem {
  id: number;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  total_price_minor: number;
}

/**
 * Üye projeksiyonu (api/backend/src/accountOrders.ts MEMBER_ORDER_COLUMNS).
 * `note` / `changed_by` / `customer_phone` / `customer_email` /
 * `delivery_address` alanları sunucuda BİLİNÇLİ olarak yoktur (operatör notu
 * müşteriye sızmasın); `items` ve `timeline` de bu projeksiyonda yer almaz.
 * Bu yüzden hepsi opsiyoneldir ve yokken bölüm hiç çizilmez.
 */
export interface MemberOrder {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  delivery_city: string | null;
  delivery_district: string | null;
  recipient_name: string;
  card_message?: string | null;
  subtotal_minor?: number | null;
  discount_minor?: number | null;
  delivery_fee_minor?: number | null;
  total_amount_minor: number;
  currency?: string | null;
  coupon_code?: string | null;
  created_at: string;
  items?: MemberOrderItem[];
}

export interface MemberCoupon {
  id: number;
  discount_rule_id?: number;
  name: string;
  code: string;
  percentage: number | null;
  status: string;
  usage_limit?: number | null;
  used_count?: number | null;
  assigned_at?: string | null;
  used_at?: string | null;
}

export interface AccountOrderSummary {
  visible_order_count: number;
  open_order_count: number;
  awaiting_payment_count: number;
  paid_order_count: number;
  paid_spent_minor: number;
  last_paid_order_at: string | null;
}

export interface AccountOwnership {
  status?: string;
  history_hidden?: boolean;
  phone_verified?: boolean;
  email_verified?: boolean;
  has_phone?: boolean;
  message?: string | null;
}

export interface LedgerEntry {
  id: number;
  order_id: number | null;
  entry_type: string;
  points: number;
  description: string;
  created_at: string;
}

export interface MemberLoyalty {
  available_points: number;
  pending_points: number;
  lifetime_earned: number;
  tier: string;
  points_per_100_try: number;
  is_active: boolean;
  silver_threshold: number;
  gold_threshold: number;
  premium_threshold: number;
  ledger: LedgerEntry[];
}

export interface MemberAccount {
  customer: {
    id?: number | string;
    name: string;
    email: string | null;
    phone: string | null;
    member_since: string | null;
    last_login: string | null;
  };
  coupons: MemberCoupon[];
  orders: MemberOrder[];
  order_summary?: AccountOrderSummary | null;
  ownership?: AccountOwnership | null;
  loyalty: MemberLoyalty;
  /** W4-2 (additive): telefon kanıtından sonra "bu e-posta sizin mi?" sorusu. */
  email_review?: { required?: boolean | null; email_masked?: string | null; message?: string | null } | null;
}

export interface EmailReviewView {
  visible: boolean;
  emailMasked: string;
  message: string;
}

const EMAIL_REVIEW_FALLBACK =
  "Hesabınızda kayıtlı bir e-posta adresi var. Size ait değilse kaldırın; sipariş bildirimleri bu adrese gitmez.";

/**
 * W4-2 — sunucu "e-postayı sahibi onaylasın" dediyse kart gösterilir. Adres
 * yalnız MASKELİ gösterilir (sahibi değilse tam hâli ona da sızmasın); cümle
 * sunucudan gelir, yoksa nötr bir yedek kullanılır. Eski API bu bloğu hiç
 * göndermez → kart görünmez (geriye dönük uyum).
 */
export function emailReviewView(account: Pick<MemberAccount, "email_review"> | null | undefined): EmailReviewView {
  const raw = account?.email_review;
  const masked = typeof raw?.email_masked === "string" ? raw.email_masked.trim() : "";
  if (raw?.required !== true || !masked) return { visible: false, emailMasked: "", message: "" };
  const message = typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : EMAIL_REVIEW_FALLBACK;
  return { visible: true, emailMasked: masked, message };
}

/** Checkout ön doldurması: e-posta incelemesi sürerken ad/e-posta HİÇ doldurulmaz. */
export function checkoutPrefillAllowed(account: Pick<MemberAccount, "email_review"> | null | undefined): boolean {
  return account?.email_review?.required !== true;
}

/** `GET /api/auth/welcome-coupon` gövdesi (consentPushController.ts). */
export interface WelcomeCouponResponse {
  available: boolean;
  code?: string;
  amount_minor?: number | null;
  min_cart_total_minor?: number | null;
  first_order_only?: boolean;
  ends_at?: string | null;
  reason?: string;
  message?: string | null;
}

/* ────────────────────────── Biçimlendirme ────────────────────────── */

export function formatMinorTry(minor: number | null | undefined, currency = "TRY"): string {
  const value = Number(minor ?? 0) / 100;
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency || "TRY",
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    // Bilinmeyen para kodu geldiyse tutar KAYBOLMAZ.
    return `${value.toFixed(2)} ${currency || "TRY"}`;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * `delivery_date` sunucuda `::text` olarak döner (YYYY-MM-DD). Öğlen saatiyle
 * kurulur ki zaman dilimi kaydırması günü bir gün geri almasın.
 */
export function formatDeliveryDate(value: string | null | undefined): string {
  if (!value) return "Tarih belirlenmedi";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Tarih belirlenmedi";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(date);
}

/** Sentetik CRM anahtarı (`member-…`, `legacy-uye-…`) müşteriye GÖSTERİLMEZ. */
export function isSyntheticPhone(phone: string | null | undefined): boolean {
  return typeof phone === "string" && /^(member-|legacy-uye-)/.test(phone.trim());
}

/**
 * Ekranda gösterilebilir telefon; sentetik/boş değerde null. Okunur biçim
 * (0507 441 34 74) çağıran tarafta `authErrors.formatTrMobile` ile üretilir.
 */
export function displayPhone(phone: string | null | undefined): string | null {
  if (typeof phone !== "string") return null;
  const trimmed = phone.trim();
  if (!trimmed || isSyntheticPhone(trimmed)) return null;
  return trimmed;
}

export function memberInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ÜY";
  return parts.map((part) => part[0] ?? "").join("").slice(0, 2).toLocaleUpperCase("tr-TR");
}

/* ────────────────────────── Etiketler (ham enum YOK) ────────────────────────── */

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Sipariş alındı",
  confirmed: "Sipariş onaylandı",
  preparing: "Ürün hazırlanıyor",
  designing: "Tasarım hazırlanıyor",
  ready: "Teslimata hazır",
  courier: "Kuryeye verildi",
  delivering: "Yola çıktı",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Ödeme alındı",
  pending: "Ödeme bekleniyor",
  failed: "Ödeme alınamadı",
  refunded: "Ödeme iade edildi",
  cancelled: "Ödeme iptal edildi",
};

const COUPON_STATUS_LABELS: Record<string, string> = {
  available: "Kullanılabilir",
  used: "Kullanıldı",
  expired: "Süresi doldu",
  revoked: "İptal edildi",
  reserved: "Siparişinizde bekliyor",
};

const TIER_LABELS: Record<string, string> = {
  standard: "Standart",
  silver: "Gümüş",
  gold: "Altın",
  premium: "Premium",
};

/** Bilinmeyen değerde ham enum basılmaz; nötr Türkçe cümle döner. */
function labelOf(map: Record<string, string>, value: string | null | undefined, fallback: string): string {
  const key = (value ?? "").trim().toLowerCase();
  return map[key] ?? fallback;
}

export function orderStatusLabel(status: string | null | undefined): string {
  return labelOf(ORDER_STATUS_LABELS, status, "Durum bilgisi bekleniyor");
}

export function paymentStatusLabel(status: string | null | undefined): string {
  return labelOf(PAYMENT_STATUS_LABELS, status, "Ödeme durumu bekleniyor");
}

export function couponStatusLabel(status: string | null | undefined): string {
  return labelOf(COUPON_STATUS_LABELS, status, "Durum bilgisi bekleniyor");
}

export function tierLabel(tier: string | null | undefined): string {
  return labelOf(TIER_LABELS, tier, "Standart");
}

/* ────────────────────────── Gruplama ────────────────────────── */

const CLOSED_STATUSES = new Set(["delivered", "cancelled"]);

/** Sunucunun `status` alanına göre iki başlık; iş kuralı türetilmez. */
export function splitOrdersByPhase(orders: MemberOrder[] | null | undefined): {
  active: MemberOrder[];
  past: MemberOrder[];
} {
  const list = Array.isArray(orders) ? orders : [];
  const active: MemberOrder[] = [];
  const past: MemberOrder[] = [];
  for (const order of list) {
    if (CLOSED_STATUSES.has((order?.status ?? "").trim().toLowerCase())) past.push(order);
    else active.push(order);
  }
  return { active, past };
}

/**
 * Kupon ayrımı SUNUCUNUN `status` alanıyla yapılır. `used_count`/`usage_limit`
 * üzerinden "bitmiş mi" hesaplanmaz — o karar couponLifecycle'ın canlı kullanım
 * yüklemine aittir (DESIGN §2.2 A3-1: admin ile checkout aynı yüklemi okur).
 */
export function partitionCoupons(coupons: MemberCoupon[] | null | undefined): {
  available: MemberCoupon[];
  other: MemberCoupon[];
} {
  const list = Array.isArray(coupons) ? coupons : [];
  const available: MemberCoupon[] = [];
  const other: MemberCoupon[] = [];
  for (const coupon of list) {
    if ((coupon?.status ?? "").trim().toLowerCase() === "available") available.push(coupon);
    else other.push(coupon);
  }
  return { available, other };
}

/** Kupon kartındaki indirim ifadesi — yalnız API alanlarından. */
export function couponValueText(coupon: MemberCoupon): string | null {
  if (coupon.percentage != null && Number.isFinite(Number(coupon.percentage))) {
    return `%${Number(coupon.percentage)}`;
  }
  return null;
}

/* ────────────────────────── Özet kartları ────────────────────────── */

export interface SummaryTile {
  key: string;
  label: string;
  value: string;
  detail: string;
}

/**
 * Kartlardaki rakamların HEPSİ `order_summary`'den gelir (tek gerçek: admin üye
 * detayı aynı nesneyi okur). Özet gelmezse kart dizisi BOŞ döner — istemci
 * kendi kendine sayıp farklı bir rakam göstermez.
 */
export function summaryTiles(summary: AccountOrderSummary | null | undefined): SummaryTile[] {
  if (!summary) return [];
  return [
    {
      key: "open",
      label: "Devam eden sipariş",
      value: String(summary.open_order_count ?? 0),
      detail: `${summary.visible_order_count ?? 0} sipariş görüntülenebiliyor`,
    },
    {
      key: "awaiting",
      label: "Ödeme bekleyen",
      value: String(summary.awaiting_payment_count ?? 0),
      detail: "Ödemesi tamamlanmamış sipariş",
    },
    {
      key: "paid",
      label: "Ödemesi alınan sipariş",
      value: String(summary.paid_order_count ?? 0),
      detail: `${formatMinorTry(summary.paid_spent_minor)} ödenen toplam`,
    },
    {
      key: "last_paid",
      label: "Son ödenen sipariş",
      value: summary.last_paid_order_at ? formatDateTime(summary.last_paid_order_at) : "—",
      detail: summary.last_paid_order_at ? "Ödemesi onaylanan en son sipariş" : "Henüz ödemesi alınan sipariş yok",
    },
  ];
}

/* ────────────────────────── Sahiplik kartı ────────────────────────── */

export interface OwnershipNotice {
  /** Kart çizilecek mi? */
  visible: boolean;
  title: string;
  /** Sunucunun cümlesi varsa O kullanılır; yoksa nötr yedek. */
  body: string;
  ctaLabel: string;
  /** Oturumda gönderilebilir bir numara yoksa kullanıcıdan istenir. */
  needsPhoneInput: boolean;
  /** Geçmiş gizli mi (üyelik öncesi sipariş/puan görünmüyor)? */
  historyHidden: boolean;
}

const OWNERSHIP_FALLBACK =
  "Telefonunuzu doğrulayın: WhatsApp ile göndereceğimiz bağlantıyı tamamladığınızda geçmiş siparişleriniz ve puanlarınız hesabınıza bağlanır.";

/**
 * "Telefonunuzu doğrulayın" kartı (DECISIONS #9 / DESIGN §3.A.6).
 * `ownership` bloğu YOKSA (eski API) kart hiç çizilmez.
 */
export function ownershipNotice(
  ownership: AccountOwnership | null | undefined,
  sessionPhone: string | null | undefined,
): OwnershipNotice {
  const hidden: OwnershipNotice = {
    visible: false,
    title: "",
    body: "",
    ctaLabel: "",
    needsPhoneInput: false,
    historyHidden: false,
  };
  if (!ownership || typeof ownership !== "object") return hidden;
  const verified = ownership.phone_verified === true || ownership.status === "verified";
  if (verified) return hidden;
  const historyHidden = ownership.history_hidden === true;
  const usablePhone = ownership.has_phone === true && !isSyntheticPhone(sessionPhone) && Boolean(sessionPhone);
  return {
    visible: true,
    title: historyHidden ? "Telefonunuzu doğrulayın, geçmişiniz hesabınıza bağlansın" : "Telefonunuzu doğrulayın",
    body: typeof ownership.message === "string" && ownership.message.trim() ? ownership.message : OWNERSHIP_FALLBACK,
    ctaLabel: "WhatsApp ile doğrulama bağlantısı gönder",
    needsPhoneInput: !usablePhone,
    historyHidden,
  };
}

/* ────────────────────────── Hoş geldin teklifi ────────────────────────── */

export interface WelcomeOfferView {
  state: "usable" | "needs_phone_verification" | "unavailable";
  /** Yalnız gerçekten kullanılabilir olduğunda dolu. */
  code: string | null;
  /** Kuponun GERÇEK kuralı (tutar / alt sepet / ilk sipariş / bitiş). */
  ruleText: string;
  /** Kullanılamıyorsa sunucunun açıklaması; yoksa nötr cümle. */
  message: string | null;
}

const WELCOME_REASON_TEXT: Record<string, string> = {
  not_configured: "Şu anda tanımlı bir hoş geldin avantajı bulunmuyor.",
  campaign_inactive: "Hoş geldin kampanyası şu anda kapalı.",
  coupon_not_found: "Şu anda tanımlı bir hoş geldin avantajı bulunmuyor.",
  coupon_inactive: "Hoş geldin avantajı şu anda kullanıma kapalı.",
  not_started: "Hoş geldin avantajı henüz başlamadı.",
  expired: "Hoş geldin avantajının süresi doldu.",
  limit_reached: "Hoş geldin avantajı için ayrılan kontenjan doldu.",
  not_fixed_amount: "Şu anda tanımlı bir hoş geldin avantajı bulunmuyor.",
  lookup_failed: "Hoş geldin avantajı şu anda görüntülenemiyor.",
  used: "Bu hoş geldin avantajını daha önce kullandınız.",
  already_used: "Bu hoş geldin avantajını daha önce kullandınız.",
  not_first_order: "Bu avantaj yalnız ilk siparişte geçerlidir.",
  already_ordered: "Bu avantaj yalnız ilk siparişte geçerlidir.",
  needs_phone_verification:
    "Bu avantajı kullanmak için telefonunuzu doğrulayın. WhatsApp ile göndereceğimiz bağlantıyı tamamlamanız yeterli.",
  not_member: "Avantajı görmek için giriş yapın.",
};

/** Kuponun kuralı — UYDURULMAZ, yalnız sunucudan gelen alanlardan kurulur. */
export function welcomeRuleText(offer: WelcomeCouponResponse | null | undefined): string {
  if (!offer) return "";
  const parts: string[] = [];
  if (offer.amount_minor != null) parts.push(`${formatMinorTry(offer.amount_minor)} indirim`);
  if (offer.min_cart_total_minor != null) {
    parts.push(`${formatMinorTry(offer.min_cart_total_minor)} ve üzeri sepetlerde geçerli`);
  }
  if (offer.first_order_only === true) parts.push("yalnızca ilk siparişinizde kullanılabilir");
  if (offer.ends_at) {
    const ends = new Date(offer.ends_at);
    if (!Number.isNaN(ends.getTime())) {
      parts.push(`${new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(ends)} tarihine kadar geçerli`);
    }
  }
  if (parts.length === 0) return "";
  return `${parts.join(", ")}.`;
}

/**
 * Kampanyanın KENDİSİ yok/kapalı demek olan sebepler. Bunlarda Hesabım'da
 * "hoş geldin avantajı" bölümü hiç çizilmez: var olmayan bir kampanyayı her
 * üyeye "şu anda yok" diye duyurmak bilgi değil gürültüdür. Üyeye ÖZEL sebepler
 * (kullandınız / ilk sipariş değil / telefon doğrulaması gerekli) gösterilir —
 * çünkü onlar üyenin kendi durumunu açıklar.
 */
const WELCOME_CAMPAIGN_ABSENT_REASONS = new Set([
  "not_configured",
  "campaign_inactive",
  "coupon_not_found",
  "coupon_inactive",
  "not_started",
  "expired",
  "limit_reached",
  "not_fixed_amount",
  "lookup_failed",
  "not_member",
]);

/** Hesabım'da hoş geldin bölümü çizilsin mi? */
export function welcomeSectionVisible(offer: WelcomeCouponResponse | null | undefined): boolean {
  if (!offer || typeof offer !== "object") return false;
  if (offer.available === true) return true;
  return !WELCOME_CAMPAIGN_ABSENT_REASONS.has((offer.reason ?? "").trim());
}

export function welcomeOfferView(offer: WelcomeCouponResponse | null | undefined): WelcomeOfferView {
  if (!offer) {
    return { state: "unavailable", code: null, ruleText: "", message: null };
  }
  if (offer.available === true) {
    const code = (offer.code ?? "").trim();
    // Kod boşsa "kazandınız" demek yalandır; kullanılamaz sayılır.
    if (!code) {
      return {
        state: "unavailable",
        code: null,
        ruleText: welcomeRuleText(offer),
        message: "Hoş geldin avantajı şu anda görüntülenemiyor.",
      };
    }
    return { state: "usable", code, ruleText: welcomeRuleText(offer), message: null };
  }
  const reason = (offer.reason ?? "").trim();
  const serverMessage = typeof offer.message === "string" && offer.message.trim() ? offer.message.trim() : null;
  const message = serverMessage ?? WELCOME_REASON_TEXT[reason] ?? "Hoş geldin avantajı şu anda kullanılamıyor.";
  return {
    state: reason === "needs_phone_verification" ? "needs_phone_verification" : "unavailable",
    code: null,
    ruleText: welcomeRuleText(offer),
    message,
  };
}

/* ────────────────────────── Onay metinleri ────────────────────────── */

/**
 * Müşteriye mesaj GİDECEK eylem — önce onay istenir (UI sözleşmesi).
 * `shownPhone` ekranda görünen (biçimlenmiş) numaradır; yoksa nötr cümle.
 */
export function phoneVerifyConfirmText(shownPhone: string | null | undefined): string {
  const shown = typeof shownPhone === "string" ? shownPhone.trim() : "";
  return shown && !isSyntheticPhone(shown)
    ? `${shown} numarasına WhatsApp ile doğrulama bağlantısı gönderilecek. Onaylıyor musunuz?`
    : "Yazdığınız numaraya WhatsApp ile doğrulama bağlantısı gönderilecek. Onaylıyor musunuz?";
}

export const LOGOUT_ALL_CONFIRM_TEXT =
  "Tüm cihazlarda oturumunuz kapatılacak ve yeniden giriş yapmanız gerekecek. Onaylıyor musunuz?";
