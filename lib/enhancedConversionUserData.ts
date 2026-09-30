/* --------------------------------------------------------------------------
 * Gelişmiş dönüşümler (Google Ads web etiketi) — purchase event'ine eklenen
 * HASH'Lİ kullanıcı verisi.
 *
 * Neden: Ads teşhisi Birincil "Satın alma işlemi" (7712950757) için "sayfa içi
 * kodu Otomatik ile birlikte uygulayın" diyor; kapsam ~%39. Otomatik algılama
 * kart akışında e-postayı göremez: purchase /checkout/sonuc'ta atılır ve o
 * sayfada e-posta/telefon yoktur. Kodla verilen veri Google'da otomatiğe
 * ÖNCELİKLİDİR.
 *
 * Kurallar (Google Ads Help 13262500 — web etiketi):
 *  • e-posta: baş/son boşluk atılır, küçük harf; gmail.com / googlemail.com'da
 *    alan adından önceki noktalar silinir ('+' eki web kuralında YOKTUR).
 *  • telefon: E.164, artı işaretiyle (+905…).
 *  • SHA-256 HEX; anahtarlar `sha256_email_address` / `sha256_phone_number`.
 *
 * GİZLİLİK: ham e-posta/telefon bu modülden HİÇBİR yere yazılmaz — ne URL'ye,
 * ne loga, ne depolamaya. Kart akışında yalnız HASH'ler sessionStorage'da,
 * sipariş başına tek anahtarla ve kısa ömürle tutulur; okunduğu an silinir.
 * Her yol sessizce null döner: ödeme ve mevcut purchase ölçümü etkilenmez.
 * ------------------------------------------------------------------------ */

export type HashedUserData = {
  sha256_email_address?: string;
  sha256_phone_number?: string;
};

/** Kendi alan adlarımız: PayTR yer tutucusu (musteri@…) ve mağaza adresleri müşteri değildir. */
const KENDI_ALAN_ADLARI = ["cicekyolla.com.tr", "cicekyolla.com"];
const STORAGE_PREFIX = "cicekyolla:ec-user:";
/** Kart ödemesi dönüşü bundan uzun sürerse hash'ler kullanılmaz. */
const OMUR_MS = 2 * 60 * 60 * 1000;
/** Hash hesabı ödeme yönlendirmesini ASLA bundan fazla geciktiremez. */
const HASH_SURE_SINIRI_MS = 300;
const HEX64 = /^[0-9a-f]{64}$/;

export function normalizeEmailForTag(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  const m = /^([^\s@]+)@([^\s@]+\.[^\s@]+)$/.exec(s);
  if (!m) return null;
  const alan = m[2];
  if (KENDI_ALAN_ADLARI.some((d) => alan === d || alan.endsWith(`.${d}`))) return null;
  let yerel = m[1];
  if (alan === "gmail.com" || alan === "googlemail.com") {
    yerel = yerel.replace(/\./g, "");
    if (!yerel) return null;
  }
  return `${yerel}@${alan}`;
}

/** TR cep telefonu → E.164 (+905xxxxxxxxx). Checkout'un kabul ettiği biçimler; başka her şey null. */
export function normalizePhoneE164TR(raw: string | null | undefined): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("90")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? `+90${d}` : null;
}

async function sha256Hex(v: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sureSinirli<T>(p: Promise<T>, ms: number, yedek: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(yedek), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(yedek); });
  });
}

/** Geçerli olanların hash'i; hiçbiri geçerli değilse ya da tarayıcı desteklemiyorsa null. ASLA fırlatmaz. */
export async function buildHashedUserData(
  email: string | null | undefined,
  phone: string | null | undefined,
): Promise<HashedUserData | null> {
  try {
    const e = normalizeEmailForTag(email);
    const p = normalizePhoneE164TR(phone);
    if ((!e && !p) || !globalThis.crypto?.subtle) return null;
    const is = (async () => {
      const out: HashedUserData = {};
      if (e) out.sha256_email_address = await sha256Hex(e);
      if (p) out.sha256_phone_number = await sha256Hex(p);
      return out;
    })();
    return await sureSinirli<HashedUserData | null>(is, HASH_SURE_SINIRI_MS, null);
  } catch {
    return null;
  }
}

/** PayTR merchant_oid = sipariş numarasının yalnız harf/rakamları (api paymentController.toOid ile aynı kural). */
export function orderNumberToOid(orderNumber: string): string {
  return String(orderNumber ?? "").replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Kart akışı: initPaytr sipariş numarasını (merchant_oid) döndürdükten sonra,
 * yönlendirmeden ÖNCE çağrılır. Yalnız hash'ler saklanır. ASLA fırlatmaz.
 */
export async function stashCardPurchaseUserData(
  merchantOid: string,
  email: string | null | undefined,
  phone: string | null | undefined,
  now: number = Date.now(),
): Promise<void> {
  try {
    if (!merchantOid || typeof window === "undefined") return;
    const ud = await buildHashedUserData(email, phone);
    if (!ud) return;
    window.sessionStorage.setItem(STORAGE_PREFIX + merchantOid, JSON.stringify({ ...ud, ts: now }));
  } catch {
    /* depolama engelli → yalnız otomatik algılama kalır */
  }
}

/** Sonuç sayfası (trackPaidPurchase): hash'leri okur ve HEMEN siler. Tek kullanımlık. ASLA fırlatmaz. */
export function takeCardPurchaseUserData(orderNumber: string, now: number = Date.now()): HashedUserData | null {
  try {
    if (typeof window === "undefined" || !orderNumber) return null;
    const key = STORAGE_PREFIX + orderNumberToOid(orderNumber);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    window.sessionStorage.removeItem(key);
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (!d || typeof d.ts !== "number" || now - d.ts > OMUR_MS) return null;
    const out: HashedUserData = {};
    if (typeof d.sha256_email_address === "string" && HEX64.test(d.sha256_email_address)) {
      out.sha256_email_address = d.sha256_email_address;
    }
    if (typeof d.sha256_phone_number === "string" && HEX64.test(d.sha256_phone_number)) {
      out.sha256_phone_number = d.sha256_phone_number;
    }
    return out.sha256_email_address || out.sha256_phone_number ? out : null;
  } catch {
    return null;
  }
}
