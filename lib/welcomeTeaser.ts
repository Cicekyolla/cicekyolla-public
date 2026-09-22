// ---------------------------------------------------------------------------
// welcomeTeaser.ts — "150 TL Hoş Geldin" teklif alanının görünürlük kuralları.
//
// NEDEN: Hoş geldin teklifi eskiden süre/kaydırma sonrası KENDİLİĞİNDEN açılan
// tam ekran bir pencereydi; mobilde ürün kartına dokunmak isteyen müşterinin
// önüne çıkıyor, alışverişi kesiyordu. Artık sayfada yalnız küçük bir teklif
// alanı durur; üyelik paneli SADECE müşteri bu alana dokununca açılır.
//
// Bu dosya saf kurallardır (DOM/React yok) → node:test ile doğrulanır.
// Tutar ve koşullar burada TUTULMAZ: Admin + Kupon Merkezi'ndeki gerçek
// kupondan (GET /api/consent/config → welcome) gelir.
// ---------------------------------------------------------------------------

/** localStorage anahtarı — mevcut üyelik penceresiyle AYNI (geçmiş kararlar korunur). */
export const WELCOME_MEMBER_KEY = "cy_member";

/** Teklif alanı kapatılınca bu süre boyunca gösterilmez (eski pencereyle aynı: 24 saat). */
export const WELCOME_TEASER_SNOOZE_MS = 24 * 60 * 60 * 1000;

/**
 * Teklif alanının HİÇ çizilmediği yollar (pazarlama engelli yollara EK olarak):
 * üyelik formunun zaten bulunduğu sayfalar ve şifre akışları.
 */
export const WELCOME_TEASER_HIDDEN_PREFIXES = [
  "/giris",
  "/hesabim",
  "/sifre-belirle",
  "/sifremi-unuttum",
] as const;

export type MemberFlagState = "joined" | "snoozed" | "none";

/** `cy_member` değeri: "joined" | gelecekteki bir zaman damgası (erteleme) | yok. */
export function memberFlagState(raw: string | null | undefined, now: number): MemberFlagState {
  if (!raw) return "none";
  if (raw === "joined") return "joined";
  const until = Number.parseInt(raw, 10);
  if (Number.isFinite(until) && until > now) return "snoozed";
  return "none";
}

export function snoozeValue(now: number): string {
  return String(now + WELCOME_TEASER_SNOOZE_MS);
}

export interface WelcomeTeaserInput {
  pathname: string | null | undefined;
  /** Admin'deki kampanya AÇIK ve kupon gerçekten kullanılabilir mi? */
  campaignActive: boolean;
  memberFlag: MemberFlagState;
  /** Üst bardaki oturum ipucu (lib/memberSessionHint). */
  sessionState: "unknown" | "guest" | "member";
  /** Çerez kararı verildi mi? Verilmeden alt bant ile üst üste binmesin. */
  cookieDecided: boolean;
  /** Global locale rotası mı (/en, /de …)? Orada TR kabuğu çizilmez. */
  isLocalePath: boolean;
  /** Pazarlama engelli yollar (checkout, sepet, ödeme …) — ConsentManager tek kaynak. */
  blockedPrefixes: readonly string[];
}

/** Teklif alanı görünsün mü? Her koşul "hayır"a düşer (fail-closed). */
export function welcomeTeaserVisible(i: WelcomeTeaserInput): boolean {
  if (!i.campaignActive) return false;
  if (i.memberFlag !== "none") return false;
  if (i.sessionState === "member") return false;
  if (!i.cookieDecided) return false;
  if (i.isLocalePath) return false;
  const p = i.pathname ?? "";
  if (!p) return false;
  if (i.blockedPrefixes.some((b) => p.startsWith(b))) return false;
  if (WELCOME_TEASER_HIDDEN_PREFIXES.some((b) => p === b || p.startsWith(`${b}/`))) return false;
  return true;
}

/**
 * Ürün sayfasında mobilde alt kısımda sabit "Sipariş Ver" çubuğu vardır; teklif
 * alanı onun ÜSTÜNDE durur (satın alma düğmesini asla örtmez).
 */
export function teaserSitsAboveBuyBar(pathname: string | null | undefined): boolean {
  return (pathname ?? "").startsWith("/urun/");
}

export interface WelcomeTeaserCopy {
  /** "150 TL" — boşsa teklif alanı tutarsız metin göstermemek için çizilmez. */
  amount: string;
  /** Kısa koşul: "500 TL ve üzeri ilk siparişte" / "İlk siparişinize özel". */
  condition: string;
}

/**
 * Metin YALNIZ sunucunun alanlarından kurulur; tutar yoksa null döner ve teklif
 * alanı çizilmez (uydurma rakam yok).
 */
export function welcomeTeaserCopy(
  welcome: { amount_minor: number | null; min_cart_total_minor: number | null; first_order_only: boolean } | null | undefined,
  formatMinor: (minor: number | null | undefined) => string,
): WelcomeTeaserCopy | null {
  if (!welcome) return null;
  const amount = formatMinor(welcome.amount_minor);
  if (!amount) return null;
  const min = formatMinor(welcome.min_cart_total_minor);
  const first = welcome.first_order_only === true;
  const condition = min
    ? `${min} ve üzeri ${first ? "ilk siparişte" : "siparişlerde"}`
    : first ? "İlk siparişinize özel" : "Üyelere özel";
  return { amount, condition };
}
