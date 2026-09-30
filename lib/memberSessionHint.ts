// ---------------------------------------------------------------------------
// memberSessionHint.ts — üst bardaki hesap girişinin oturum durumu.
//
// KÖK NEDEN (dalga 2 raporu, public-auth-consent-account): Header üst barındaki
// bağlantı oturum açmış üyeyi de /giris'e gönderiyordu; üye kendi hesabına
// menüden ulaşamıyordu.
//
// NEDEN BU KADAR DAR: `cy_member_session` çerezi HttpOnly'dir, istemci onu
// OKUYAMAZ. Tek dürüst kaynak mevcut `GET /api/account` ucunun YANIT KODUdur
// (401 = oturum yok). Yeni uç açılmadı.
//
// ÖNBELLEK GÜVENLİĞİ (değişmez kural): sunucuda (SSR) durum DAİMA "unknown"dır,
// yani üretilen HTML misafir görünümünü taşır. Statik/ISR ile önbelleğe alınan
// bir sayfa hiçbir zaman "bu ziyaretçi üye" bilgisini taşımaz; gerçek durum
// yalnız hidrasyondan SONRA istemcide okunur. Bu dosya yanıt GÖVDESİNİ hiç
// okumaz: karar tek bir HTTP durum kodundan verilir, bu yüzden ad/e-posta gibi
// bir alan header'a hiç girmez.
//
// İpucu kaydı (sessionStorage) YALNIZ ilk boyamayı hızlandırır: sunucunun
// verdiği karar her zaman kazanır ve ipucu her sayfa yüklemesinde yeniden
// doğrulanır. Bu yüzden bayat bir ipucu en fazla bir istek boyu yaşar.
// ---------------------------------------------------------------------------

export type MemberSessionState = "unknown" | "guest" | "member";

/** Sekme ömürlü ipucu anahtarı (sessionStorage). */
export const MEMBER_SESSION_HINT_KEY = "cy.uye.oturum";

/** İpucu bu süreden sonra yok sayılır; karar yine sunucudan gelir. */
export const MEMBER_SESSION_HINT_TTL_MS = 15 * 60 * 1000;

/** Aynı sekmedeki Header'a "durum değişti" demenin tek yolu. */
export const MEMBER_SESSION_EVENT = "cy:uye-oturum";

/** sessionStorage'ın test edilebilir en küçük yüzeyi. */
export interface HintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Yanıt KODUndan durum. Gövde okunmaz.
 *  200 → üye · 401/403 → misafir · diğer (502 proxy_error, 500, 0) → bilinmiyor
 * "Bilinmiyor" bilinçli olarak mevcut görünümü BOZMAZ: geçici bir ağ/proxy
 * hatası üyeyi çıkmış gibi göstermez, misafiri de üye yapmaz.
 */
export function memberStateFromStatus(status: number): MemberSessionState {
  if (status === 200) return "member";
  if (status === 401 || status === 403) return "guest";
  return "unknown";
}

export interface HeaderAccountEntry {
  href: "/hesabim" | "/giris";
  labelKey: "header.account" | "header.login";
  shortLabelKey: "header.accountShort" | "header.loginShort";
}

/**
 * Üst bardaki hesap bağlantısı. "unknown" ve "guest" BİREBİR aynı sonucu verir:
 * oturum açmamış görünüm (ve önbellekli HTML) bu düzeltmeden sonra da aynıdır.
 */
export function headerAccountEntry(state: MemberSessionState): HeaderAccountEntry {
  if (state === "member") {
    return { href: "/hesabim", labelKey: "header.account", shortLabelKey: "header.accountShort" };
  }
  return { href: "/giris", labelKey: "header.login", shortLabelKey: "header.loginShort" };
}

/** Kayıt YALNIZ verdikti + zaman damgası taşır; kişiye ait hiçbir alan yazılmaz. */
export function serializeHint(state: "guest" | "member", now: number): string {
  return JSON.stringify({ state, at: now });
}

/** Bozuk / bayat / ileri tarihli (saat değişimi) kayıt → "unknown". */
export function parseHint(
  raw: string | null | undefined,
  now: number,
  ttlMs: number = MEMBER_SESSION_HINT_TTL_MS,
): MemberSessionState {
  if (typeof raw !== "string" || !raw) return "unknown";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "unknown";
  }
  if (!parsed || typeof parsed !== "object") return "unknown";
  const record = parsed as { state?: unknown; at?: unknown };
  if (record.state !== "guest" && record.state !== "member") return "unknown";
  if (typeof record.at !== "number" || !Number.isFinite(record.at)) return "unknown";
  const age = now - record.at;
  if (age < 0 || age > ttlMs) return "unknown";
  return record.state;
}

/** Gizli sekmede/erişim kapalıyken storage erişimi FIRLATIR → "unknown". */
export function readSessionHint(
  storage: HintStorage | null | undefined,
  now: number,
  ttlMs: number = MEMBER_SESSION_HINT_TTL_MS,
): MemberSessionState {
  if (!storage) return "unknown";
  try {
    return parseHint(storage.getItem(MEMBER_SESSION_HINT_KEY), now, ttlMs);
  } catch {
    return "unknown";
  }
}

export function writeSessionHint(
  storage: HintStorage | null | undefined,
  state: "guest" | "member",
  now: number,
): void {
  if (!storage) return;
  try {
    storage.setItem(MEMBER_SESSION_HINT_KEY, serializeHint(state, now));
  } catch {
    /* kota/gizli sekme: ipucu olmadan da ekran doğru çalışır */
  }
}

export function clearSessionHint(storage: HintStorage | null | undefined): void {
  if (!storage) return;
  try {
    storage.removeItem(MEMBER_SESSION_HINT_KEY);
  } catch {
    /* yoksay */
  }
}

/* ─────────── Tarayıcı kenarı (sunucuda çağrılmaz, test edilmez) ─────────── */

/** Sunucuda ve erişim kapalıyken null döner. */
export function sessionHintStorage(): HintStorage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function announce(): void {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(MEMBER_SESSION_EVENT));
  } catch {
    /* yoksay */
  }
}

/** Hesabım kendi yanıtından emin olduğunda çağırır; açık Header'ı da günceller. */
export function noteMemberSession(state: "guest" | "member"): void {
  writeSessionHint(sessionHintStorage(), state, Date.now());
  announce();
}

/** Çıkışta: ipucu silinir, Header misafir görünümüne döner. */
export function forgetMemberSession(): void {
  clearSessionHint(sessionHintStorage());
  announce();
}
