// ---------------------------------------------------------------------------
// AUTH HATA SÖZLÜĞÜ — üye giriş/kayıt/şifre akışlarının TEK hata çevirmeni.
//
// NEDEN VAR: giriş ekranı sunucudan geleni olduğu gibi basıyordu. Ağ koparsa
// müşteri "Failed to fetch", proxy düşerse "proxy_error", sunucu patlarsa "500"
// görüyordu — ne olduğunu anlamak imkânsızdı. Üstelik mesaj gri renkte ve
// role="status" ile basılıyordu; başarı mesajıyla aynı görünüyordu.
//
// KURALLAR
//   • Teknik metin ASLA kullanıcıya gösterilmez (proxy_error, 500, ECONNRESET…).
//   • Sunucunun Türkçe, kullanıcıya yazılmış mesajı YALNIZCA 4xx'te ve insan
//     cümlesi gibi görünüyorsa kullanılır; aksi hâlde bizim metnimiz basılır.
//   • Hesap sayımı (enumeration) yapılmaz: "şifre yanlış" ile "kayıt yok"
//     AYNI mesajı döndürür.
//   • API sözleşmesi DEĞİŞMEZ — bu katman tamamen istemci tarafıdır.
// ---------------------------------------------------------------------------

export type AuthErrorField = "identifier" | "password" | "email" | "phone" | "name" | null;

export interface AuthErrorView {
  /** Kullanıcıya gösterilecek Türkçe cümle. */
  message: string;
  /** Vurgulanacak alan (varsa) — kırmızı çerçeve + aria-invalid. */
  field: AuthErrorField;
  /** Teşhis/telemetri için sınıf; ekranda GÖSTERİLMEZ. */
  kind: "empty" | "format" | "credentials" | "conflict" | "rateLimit" | "server" | "network" | "unknown";
}

const GENEL_SUNUCU = "Şu anda işleminizi tamamlayamıyoruz. Lütfen birkaç dakika sonra tekrar deneyin.";
const GENEL_AG = "İnternet bağlantınıza ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.";
/** Güvenlik: e-posta kayıtlı mı değil mi ayırt EDİLMEZ. */
export const KIMLIK_HATASI = "E-posta adresi veya şifre hatalı. Lütfen kontrol edip tekrar deneyin.";
const COK_DENEME = "Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.";

/** Basit e-posta biçim denetimi (sunucu yine kendi doğrulamasını yapar). */
export function isEmailLike(value: string): boolean {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** Girdi e-posta mı yoksa telefon mu? (giriş alanı ikisini de kabul eder) */
export function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

/**
 * Sunucunun kullanıcıya YAZDIĞI (Türkçe) mesajların tam listesi.
 * Kaynak: cicekyolla-api `MemberAuthError` çağrıları. Türkçe'ye özgü harf
 * içermeyenler burada açıkça tanınır; liste dışındakiler için Türkçe harf
 * kuralı çalışır. Sunucu yeni bir mesaj eklerse kullanıcı GENEL metni görür —
 * güvenli bozulma; teknik metin ASLA sızmaz.
 */
const SUNUCU_MESAJ_LISTESI = new Set<string>([
  "E-posta veya telefon zorunludur.",
  "E-posta ve telefon farklı müşterilere bağlı.",
]);

/** Türkçe'ye özgü harf var mı? (İngilizce sistem metinlerini eler) */
function hasTurkishLetter(s: string): boolean {
  return /[çğıİöşüÇĞÖŞÜ]/.test(s);
}

/**
 * Sunucu mesajı kullanıcıya gösterilebilir mi?
 * Teknik anahtarlar (`proxy_error`, `internal_error`, `validation_error`),
 * yığın izleri ve İngilizce sistem metinleri (`Failed to fetch`) elenir.
 */
export function isHumanMessage(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const s = raw.trim();
  if (s.length < 8 || s.length > 200) return false;
  if (/^[a-z0-9_.-]+$/i.test(s)) return false;          // proxy_error, internal_error…
  if (!s.includes(" ")) return false;                    // tek kelime → teknik
  if (/\bat\s+\/|\.ts:\d+|\.js:\d+|Error:|stack|fetch|null|undefined/i.test(s)) return false;
  if (SUNUCU_MESAJ_LISTESI.has(s)) return true;
  return hasTurkishLetter(s);
}

/** HTTP durum + gövde → kullanıcı mesajı. */
export function viewForResponse(status: number, body: unknown): AuthErrorView {
  const serverMessage = (body as { error?: unknown } | null)?.error;

  if (status === 401 || status === 403) {
    return { message: KIMLIK_HATASI, field: "password", kind: "credentials" };
  }
  if (status === 429) {
    return { message: COK_DENEME, field: null, kind: "rateLimit" };
  }
  if (status >= 500 || status === 0) {
    return { message: GENEL_SUNUCU, field: null, kind: "server" };
  }
  if (status === 409) {
    return {
      message: isHumanMessage(serverMessage) ? serverMessage : "Bu bilgilerle zaten bir hesap var. Giriş yapmayı deneyin.",
      field: null,
      kind: "conflict",
    };
  }
  if (status >= 400) {
    // 400/422 — sunucunun Türkçe doğrulama cümlesi kullanıcıya yardımcıdır.
    return {
      message: isHumanMessage(serverMessage) ? serverMessage : "Girdiğiniz bilgilerde bir eksik var. Lütfen kontrol edin.",
      field: null,
      kind: "format",
    };
  }
  return { message: GENEL_SUNUCU, field: null, kind: "unknown" };
}

/** fetch() throw etti (DNS, offline, CORS, iptal) → ağ mesajı. */
export function viewForThrown(error: unknown): AuthErrorView {
  const name = (error as { name?: string } | null)?.name;
  if (name === "AbortError") {
    return { message: "İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.", field: null, kind: "network" };
  }
  return { message: GENEL_AG, field: null, kind: "network" };
}

/** Giriş formu ön denetimi — sunucuya gitmeden önce. */
export function validateLogin(identifier: string, password: string): AuthErrorView | null {
  if (!identifier.trim() && !password) {
    return { message: "E-posta/telefon ve şifrenizi girin.", field: "identifier", kind: "empty" };
  }
  if (!identifier.trim()) {
    return { message: "E-posta adresinizi veya telefon numaranızı girin.", field: "identifier", kind: "empty" };
  }
  if (!password) {
    return { message: "Şifrenizi girin.", field: "password", kind: "empty" };
  }
  const v = identifier.trim();
  if (!isEmailLike(v) && !looksLikePhone(v)) {
    return {
      message: "Geçerli bir e-posta adresi veya telefon numarası girin.",
      field: "identifier",
      kind: "format",
    };
  }
  return null;
}

/** Şifre sıfırlama talebi ön denetimi. */
export function validateResetRequest(identifier: string): AuthErrorView | null {
  const v = identifier.trim();
  if (!v) return { message: "E-posta adresinizi veya telefon numaranızı girin.", field: "identifier", kind: "empty" };
  if (!isEmailLike(v) && !looksLikePhone(v)) {
    return { message: "Geçerli bir e-posta adresi veya telefon numarası girin.", field: "identifier", kind: "format" };
  }
  return null;
}

/** Yeni şifre ön denetimi (sunucu 8–200 bekler). */
export function validateNewPassword(password: string, again: string): AuthErrorView | null {
  if (!password) return { message: "Yeni şifrenizi girin.", field: "password", kind: "empty" };
  if (password.length < 8) {
    return { message: "Şifreniz en az 8 karakter olmalı.", field: "password", kind: "format" };
  }
  if (password.length > 200) {
    return { message: "Şifreniz en fazla 200 karakter olabilir.", field: "password", kind: "format" };
  }
  if (password !== again) {
    return { message: "Şifreler eşleşmiyor. İki alana da aynı şifreyi yazın.", field: "password", kind: "format" };
  }
  return null;
}
