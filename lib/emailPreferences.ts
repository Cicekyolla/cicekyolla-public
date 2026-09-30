// ---------------------------------------------------------------------------
// emailPreferences.ts — pazarlama e-postasından ÇIKIŞ (RFC 8058 tek tık +
// /e-posta-tercihleri sayfası) için saf yardımcılar. DESIGN §3.G.2 · §6.9.
//
// NEDEN VAR: API her kampanya postasına iki bağlantı koyar
// (api/backend/src/marketingConsentToken.ts buildUnsubscribeLinks):
//   • başlık  → `https://www…/api/email-preferences/one-click?t=<jeton>`
//               (Gmail/Yahoo buraya `List-Unsubscribe=One-Click` gövdesiyle
//               form POST eder; jeton YALNIZ sorgu dizesindedir)
//   • gövde   → `https://www…/e-posta-tercihleri#t=<jeton>`
//               (insan sayfası; jeton FRAGMENT'te — sunucuya/Referer'a gitmez)
// Public uygulamada ikisi de yoktu → tek tık 404, gövde bağlantısı 404.
//
// KURALLAR
//   • GET ASLA MUTASYON YAPMAZ (posta tarayıcıları bağlantıyı önden çeker).
//     Sayfa verisi GET ile okunur; çıkış yalnız POST ile yazılır.
//   • Jetonun geçerliliğine burada KARAR VERİLMEZ — yalnız biçimsel süzgeç
//     vardır; imza/sürüm kararı API'dedir (geçersiz denemeler orada sayılır).
//   • Jeton sayfada okunur okunmaz adres çubuğundan silinir (GTM page_view'dan
//     önce çalışan satır içi script; lib/resetToken.ts ile aynı desen).
//   • Bu modül çalışma zamanında hiçbir şey import etmez (`node --test`).
// ---------------------------------------------------------------------------

/** API uçları (api/backend/src/marketingConsentController.ts). */
export const UNSUBSCRIBE_API_PATH = "/api/public/marketing/unsubscribe";
export const ONE_CLICK_API_PATH = "/api/public/marketing/unsubscribe/one-click";

/** İnsan sayfası (mail gövdesindeki bağlantı). */
export const PREFERENCE_PAGE_PATH = "/e-posta-tercihleri";

/**
 * Biçimsel süzgeç. API jetonu `u1.<id>.<imza32>` üretir, gövde şeması 8-200
 * karakter kabul eder. Sürüm öneki ileride değişebileceği için burada `u1`
 * dayatılmaz; URL-güvenli karakter kümesi yeter.
 */
const TOKEN_RE = /^[A-Za-z0-9._~-]{8,200}$/;

export function isPlausibleUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_RE.test(value);
}

/** Satır içi script'in jetonu bıraktığı global. Okunduktan sonra silinir. */
export const UNSUBSCRIBE_TOKEN_GLOBAL = "__cyUnsubscribeToken";

function pick(params: URLSearchParams): string | null {
  for (const key of ["t", "token"]) {
    const value = params.get(key);
    if (isPlausibleUnsubscribeToken(value)) return value;
  }
  return null;
}

/** `#t=…` (birincil) → `?t=…` (bazı istemciler) → null. */
export function extractUnsubscribeToken(location: { hash?: string; search?: string }): string | null {
  const hash = (location.hash ?? "").replace(/^#/, "");
  if (hash) {
    const fromHash = pick(new URLSearchParams(hash));
    if (fromHash) return fromHash;
  }
  return pick(new URLSearchParams((location.search ?? "").replace(/^\?/, "")));
}

/** Jeton silinmiş adres; diğer parametreler (utm_* …) korunur. */
export function urlWithoutUnsubscribeToken(location: { pathname?: string; search?: string; hash?: string }): string {
  const query = new URLSearchParams((location.search ?? "").replace(/^\?/, ""));
  query.delete("t");
  query.delete("token");
  const hash = new URLSearchParams((location.hash ?? "").replace(/^#/, ""));
  hash.delete("t");
  hash.delete("token");
  const q = query.toString();
  const h = hash.toString();
  return `${location.pathname || "/"}${q ? `?${q}` : ""}${h ? `#${h}` : ""}`;
}

/**
 * Sayfanın EN BAŞINDA çalışan satır içi script: jetonu global'e taşır, adres
 * çubuğundan siler. React/GTM yüklenmesini beklemez. history erişilemezse
 * sessizce geçer (sayfa yine çalışır, React tarafı yedek temizliği yapar).
 */
export function unsubscribeTokenStripScript(): string {
  const re = TOKEN_RE.source;
  return [
    "(function(){try{",
    "var l=window.location;",
    "var h=new URLSearchParams((l.hash||'').replace(/^#/,''));",
    "var s=new URLSearchParams(l.search||'');",
    `var ok=function(v){return typeof v==='string'&&/${re}/.test(v);};`,
    "var t=[h.get('t'),h.get('token'),s.get('t'),s.get('token')].filter(ok)[0];",
    "if(!t)return;",
    `window.${UNSUBSCRIBE_TOKEN_GLOBAL}=t;`,
    "h.delete('t');h.delete('token');s.delete('t');s.delete('token');",
    "var q=s.toString();var r=h.toString();",
    "history.replaceState(null,'',l.pathname+(q?'?'+q:'')+(r?'#'+r:''));",
    "}catch(e){}})();",
  ].join("");
}

/** Önce script'in bıraktığı global (okununca silinir), sonra URL. */
export function takeUnsubscribeToken(
  win: Record<string, unknown> & { location?: { hash?: string; search?: string } },
): string | null {
  const fromScript = win[UNSUBSCRIBE_TOKEN_GLOBAL];
  if (isPlausibleUnsubscribeToken(fromScript)) {
    delete win[UNSUBSCRIBE_TOKEN_GLOBAL];
    return fromScript;
  }
  return win.location ? extractUnsubscribeToken(win.location) : null;
}

/* ─────────────────────── Route handler yardımcıları ─────────────────────── */

function tokenFromJson(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { t?: unknown; token?: unknown } | null;
    for (const value of [parsed?.t, parsed?.token]) {
      if (isPlausibleUnsubscribeToken(value)) return value;
    }
  } catch {
    /* JSON değil */
  }
  return null;
}

/**
 * RFC 8058 tek tık isteğinden jeton. Sağlayıcı gövdeye yalnız
 * `List-Unsubscribe=One-Click` yazar; jeton başlıktaki URL'nin SORGU
 * dizesindedir. Yedek olarak form (`t=`) ve JSON (`{t}` / `{token}`) gövdesi
 * de okunur. Bulunamazsa boş dize → API bunu geçersiz deneme olarak sayar.
 */
export function oneClickToken(input: { url: string; body?: string | null; contentType?: string | null }): string {
  let fromQuery: string | null = null;
  try {
    fromQuery = pick(new URL(input.url, "http://localhost").searchParams);
  } catch {
    fromQuery = null;
  }
  if (fromQuery) return fromQuery;
  const body = input.body ?? "";
  if (!body) return "";
  const type = (input.contentType ?? "").toLowerCase();
  if (type.includes("json")) return tokenFromJson(body) ?? "";
  return pick(new URLSearchParams(body)) ?? tokenFromJson(body) ?? "";
}

/**
 * API'ye giden JSON gövde. Jeton yoksa `{}` gider: API onu da "geçersiz
 * deneme" olarak sayar (kaba kuvvet sınırı) ve 400 döner.
 */
export function unsubscribeUpstreamBody(token: string): string {
  return JSON.stringify(token ? { t: token } : {});
}

/** Sayfanın POST gövdesinden jeton (fazla alanlar API'ye taşınmaz). */
export function tokenFromPageBody(text: string): string {
  return tokenFromJson(text) ?? "";
}

/**
 * Sayfa verisi için API yolu. API GET ucu jetonu yalnız sorgu dizesinden okur
 * (kontrolcü sözleşmesi). Jeton kişisel veri değildir (düz e-posta taşımaz) ve
 * yalnız "bu adresin iznini kapat" yetkisi verir; çöp/uzun değer iletilmez.
 */
export function viewApiPath(rawToken: string | null | undefined): string {
  const token = isPlausibleUnsubscribeToken(rawToken) ? rawToken : "";
  return `${UNSUBSCRIBE_API_PATH}?t=${encodeURIComponent(token)}`;
}

/**
 * Tek tık adresine GET ile gelen (bazı istemciler başlık URL'sini tarayıcıda
 * açar) kişi insan sayfasına gönderilir. Jeton FRAGMENT'e taşınır; GET hiçbir
 * şey yazmaz. Jeton biçimsizse sayfa "bağlantı geçersiz" der.
 */
export function preferencePageLocation(rawToken: string | null | undefined): string {
  return isPlausibleUnsubscribeToken(rawToken)
    ? `${PREFERENCE_PAGE_PATH}#t=${encodeURIComponent(rawToken)}`
    : PREFERENCE_PAGE_PATH;
}

/** Tercih uçlarının yanıtına eklenen başlıklar (arama motoru + Referer + önbellek). */
export const PREFERENCE_RESPONSE_HEADERS: Record<string, string> = {
  "cache-control": "private, no-store",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow",
};

/* ─────────────────────── Sayfa görünüm modeli ─────────────────────── */

export interface UnsubscribeTokenView {
  valid: boolean;
  status: "granted" | "withdrawn" | "none";
  status_label: string;
  masked_email: string | null;
  already_withdrawn: boolean;
  text_version?: string | null;
}

export interface UnsubscribeResultBody {
  ok: true;
  already: boolean;
  status: "withdrawn";
  status_label: string;
  masked_email: string | null;
}

export type PreferencePageView =
  | { state: "missing"; title: string; message: string }
  | { state: "invalid"; title: string; message: string }
  | { state: "error"; title: string; message: string }
  | { state: "active"; title: string; message: string; maskedEmail: string | null; statusLabel: string }
  | { state: "done"; title: string; message: string; maskedEmail: string | null; statusLabel: string };

export const PREFERENCE_TEXT = {
  missingTitle: "Bağlantı bulunamadı",
  missing:
    "Bu sayfayı e-postanın altındaki “Abonelikten çık” bağlantısıyla açın. Üyeyseniz iletişim izninizi Hesabım sayfasından da yönetebilirsiniz.",
  invalidTitle: "Bağlantı geçersiz",
  invalid:
    "Bu bağlantı doğrulanamadı. Lütfen e-postadaki bağlantıyı yeniden kullanın. Üyeyseniz iletişim izninizi Hesabım sayfasından da yönetebilirsiniz.",
  errorTitle: "İşlem şu anda yapılamıyor",
  error: "Bir sorun oluştu. Lütfen birkaç dakika sonra tekrar deneyin.",
  rateLimited: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.",
  activeTitle: "Kampanya e-postalarından çıkın",
  active:
    "Onaylarsanız kampanya ve duyuru e-postaları bu adrese artık gönderilmez. Sipariş ve üyelik bildirimleri (işlemsel e-postalar) gelmeye devam eder.",
  doneTitle: "Aboneliğiniz sonlandırıldı",
  done: "Bu adrese artık kampanya ve duyuru e-postası gönderilmeyecek. Fikrinizi değiştirirseniz Hesabım sayfasından yeniden izin verebilirsiniz.",
  alreadyTitle: "Zaten abonelikten çıkmışsınız",
  already: "Bu adres için kampanya ve duyuru e-postaları zaten durdurulmuş. Başka bir işlem yapmanız gerekmiyor.",
} as const;

function humanError(body: unknown): string | null {
  const raw = (body as { error?: unknown } | null)?.error;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  // Teknik kod (`proxy_error`, `link_invalid`) ekrana basılmaz; yalnız cümle.
  if (!text || !/\s/.test(text) || /^[a-z_]+$/.test(text)) return null;
  return text;
}

function errorView(status: number, body: unknown): PreferencePageView {
  if (status === 429) {
    return { state: "error", title: PREFERENCE_TEXT.errorTitle, message: humanError(body) ?? PREFERENCE_TEXT.rateLimited };
  }
  if (status === 400) {
    return { state: "invalid", title: PREFERENCE_TEXT.invalidTitle, message: humanError(body) ?? PREFERENCE_TEXT.invalid };
  }
  return { state: "error", title: PREFERENCE_TEXT.errorTitle, message: humanError(body) ?? PREFERENCE_TEXT.error };
}

/** GET (okuma) yanıtı → ekran. Karar SUNUCUNUN `valid` / `already_withdrawn` alanlarıdır. */
export function preferencePageView(token: string | null, status: number, body: unknown): PreferencePageView {
  if (!token) return { state: "missing", title: PREFERENCE_TEXT.missingTitle, message: PREFERENCE_TEXT.missing };
  if (status < 200 || status >= 300) return errorView(status, body);
  const view = (body as { unsubscribe?: UnsubscribeTokenView } | null)?.unsubscribe;
  if (!view || typeof view !== "object") {
    return { state: "error", title: PREFERENCE_TEXT.errorTitle, message: PREFERENCE_TEXT.error };
  }
  if (view.valid !== true) {
    return { state: "invalid", title: PREFERENCE_TEXT.invalidTitle, message: PREFERENCE_TEXT.invalid };
  }
  const maskedEmail = typeof view.masked_email === "string" ? view.masked_email : null;
  const statusLabel = typeof view.status_label === "string" ? view.status_label : "";
  if (view.already_withdrawn === true) {
    return { state: "done", title: PREFERENCE_TEXT.alreadyTitle, message: PREFERENCE_TEXT.already, maskedEmail, statusLabel };
  }
  return { state: "active", title: PREFERENCE_TEXT.activeTitle, message: PREFERENCE_TEXT.active, maskedEmail, statusLabel };
}

/** POST (çıkış) yanıtı → ekran. Tekrar çağrı (`already`) da başarıdır. */
export function unsubscribeResultView(status: number, body: unknown): PreferencePageView {
  if (status < 200 || status >= 300) return errorView(status, body);
  const result = (body as { unsubscribe?: UnsubscribeResultBody } | null)?.unsubscribe;
  if (!result || result.status !== "withdrawn") {
    return { state: "error", title: PREFERENCE_TEXT.errorTitle, message: PREFERENCE_TEXT.error };
  }
  const maskedEmail = typeof result.masked_email === "string" ? result.masked_email : null;
  const statusLabel = typeof result.status_label === "string" ? result.status_label : "";
  return result.already
    ? { state: "done", title: PREFERENCE_TEXT.alreadyTitle, message: PREFERENCE_TEXT.already, maskedEmail, statusLabel }
    : { state: "done", title: PREFERENCE_TEXT.doneTitle, message: PREFERENCE_TEXT.done, maskedEmail, statusLabel };
}
