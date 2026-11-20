// ============================================================================
// paytrDisplayMode.ts — PayTR ödeme formu çerçevede mi, tam sayfada mı? (20 Kas 2026)
// ----------------------------------------------------------------------------
// NEDEN: 15 ve 19 Kasım'da yabancı kartlı iki müşteri bankanın 3D Secure
// adımında kaldı (7 deneme). Banka doğrulama sayfası bizim sayfamızdaki
// çerçevenin (iframe) içinde açılıyordu; bazı bankalar çerçevede açılmayı
// reddeder, mobilde banka uygulamasına geçiş çerçeveden tamamlanamayabilir.
//
// KURAL (additive — masaüstü Türkçe akış AYNEN kalır):
//   • Çerçeve bayrağı kapalıysa → bugünkü gibi tam sayfa.
//   • Sayfa dili Türkçe DEĞİLSE → tam sayfa (yabancı banka kartı olasılığı).
//   • Cihaz mobil / tabletse   → tam sayfa.
//   • Aksi hâlde (masaüstü + Türkçe) → çerçeve.
//
// Yalnız GÖSTERİM kararıdır: adres initPaytr'ın döndürdüğü resmi PayTR
// adresinin aynısıdır; token, tutar, bildirim ve sipariş akışı değişmez.
// Saf fonksiyon — kart verisi yok, ağ çağrısı yok.
// ============================================================================

export type PaytrDisplayMode = "frame" | "fullpage";

export interface PaytrDisplayInput {
  /** NEXT_PUBLIC_PAYTR_EMBED bayrağı. */
  embedEnabled: boolean;
  /** Sayfa dili (useI18n().locale). */
  locale: string | null | undefined;
  /** navigator.userAgent. */
  userAgent?: string | null;
  /** window.innerWidth (piksel). */
  viewportWidth?: number | null;
  /** Birincil işaretçi dokunmatik mi (matchMedia "(pointer: coarse)"). */
  coarsePointer?: boolean | null;
}

/** Bu genişliğin altı telefon düzenidir (Tailwind `md` kırılımı). */
export const PAYTR_FRAME_MIN_WIDTH = 768;

const MOBILE_UA = /Mobi|iPhone|iPod|iPad|Android|Tablet|Windows Phone|Opera Mini|IEMobile/i;

export function isMobileLikeDevice(input: Pick<PaytrDisplayInput, "userAgent" | "viewportWidth" | "coarsePointer">): boolean {
  if (input.userAgent && MOBILE_UA.test(input.userAgent)) return true;
  const w = input.viewportWidth;
  if (typeof w === "number" && Number.isFinite(w) && w > 0 && w < PAYTR_FRAME_MIN_WIDTH) return true;
  // iPadOS masaüstü kimliğiyle gelir; dokunmatik + dar/orta ekran tablet sayılır.
  if (input.coarsePointer && typeof w === "number" && w > 0 && w < 1100) return true;
  return false;
}

export function paytrDisplayMode(input: PaytrDisplayInput): PaytrDisplayMode {
  if (!input.embedEnabled) return "fullpage";
  if (String(input.locale ?? "tr").toLowerCase() !== "tr") return "fullpage";
  if (isMobileLikeDevice(input)) return "fullpage";
  return "frame";
}

/** Tarayıcıdan cihaz bilgisini okur. Asla fırlatmaz; sunucuda boş döner. */
export function readPaytrDisplayEnv(): Pick<PaytrDisplayInput, "userAgent" | "viewportWidth" | "coarsePointer"> {
  if (typeof window === "undefined") return {};
  let coarse: boolean | null = null;
  try { coarse = window.matchMedia?.("(pointer: coarse)").matches ?? null; } catch { coarse = null; }
  let ua: string | null = null;
  try { ua = window.navigator?.userAgent ?? null; } catch { ua = null; }
  return { userAgent: ua, viewportWidth: window.innerWidth, coarsePointer: coarse };
}
