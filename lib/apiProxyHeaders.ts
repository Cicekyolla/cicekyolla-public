// ---------------------------------------------------------------------------
// apiProxyHeaders.ts — Vercel route handler'larından Render API'ye giden
// KİMLİK BAŞLIKLARININ tek kaynağı.
//
// NEDEN VAR: API'nin hız sınırı (authRateLimit + requestIdentity.ts) IP'ye
// yalnız "bizim proxy'mizden geldiği KANITLANDIĞINDA" güvenir. Kanıt iki
// başlıktır: `x-cy-proxy-secret` (paylaşılan sır) + `x-cy-client-ip`. Bu iki
// başlık gönderilmezse API her public isteği tek bir paylaşılan "direct"
// kovasına yazar; tek bir saldırgan tüm müşterilerin girişini kilitleyebilir
// (ya da kendi sınırını hiç görmez). API `x-forwarded-for`'a ASLA güvenmez —
// çünkü onu istemci yazabilir.
//
// KURALLAR
//   • Sır YOKSA (veya 16 karakterden kısaysa) hiçbir başlık eklenmez. API o
//     durumda kovaları "observe" modunda işletir → meşru trafik kesilmez.
//     Uydurma bir sır göndermek, API'yi yanlış IP'ye güvendirmekten kötüdür.
//   • İstemciden gelen `x-cy-*` başlıkları ASLA iletilmez. Bu dosya çıkan
//     başlık kümesini sıfırdan kurar; gelen istek başlıkları kopyalanmaz.
//   • İstemci IP'si Vercel'in kendi koyduğu başlıklardan okunur. `x-real-ip`
//     birincil kaynaktır; `x-forwarded-for` listesi kullanılacaksa SON değer
//     alınır — istemcinin yazdığı sahte değerler listenin BAŞINDA kalır,
//     kenarın eklediği gerçek IP sonda olur.
//   • IP biçimsel olarak doğrulanır (api/backend/src/requestIdentity.ts ile
//     aynı kabul kümesi); çöp değer gönderilmez.
//   • Kişisel veri URL'ye/query'ye YAZILMAZ; yalnız başlıkla iletilir.
//
// DEPLOY SIRASI (DESIGN §5 Faz 3): ÖNCE Vercel'e `API_PROXY_SECRET`, SONRA
// Render'a `PUBLIC_PROXY_SECRET`. Ters sıra meşru trafiği "direct" kovasına
// düşürür.
// ---------------------------------------------------------------------------

/** API tarafında `requestIdentity.ts` bu iki adı okur. */
export const PROXY_SECRET_HEADER = "x-cy-proxy-secret";
export const CLIENT_IP_HEADER = "x-cy-client-ip";

/** Sır bu uzunluğun altındaysa YOK sayılır (API: proxyConfigured → >= 16). */
export const MIN_PROXY_SECRET_LENGTH = 16;

export interface HeaderReader {
  get(name: string): string | null;
}

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_RE = /^[0-9A-Fa-f:.]{2,45}$/;

/** API'nin `isPlausibleIp` kabul kümesiyle aynı. */
export function isPlausibleIp(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 45) return false;
  if (IPV4_RE.test(v)) return true;
  return v.includes(":") && IPV6_RE.test(v);
}

/** Virgüllü listenin SONDAN ilk geçerli değeri (kenarın eklediği gerçek IP). */
function lastPlausible(list: string | null): string | null {
  if (!list) return null;
  const parts = list.split(",");
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const candidate = parts[i]?.trim() ?? "";
    if (isPlausibleIp(candidate)) return candidate;
  }
  return null;
}

/**
 * Gerçek istemci IP'si. Sıra bilinçlidir:
 *   1) `x-real-ip`            — Vercel koyar, istemci yazamaz.
 *   2) `x-vercel-forwarded-for` — Vercel'e özel, son değer.
 *   3) `x-forwarded-for`      — son değer (istemcinin sahte değeri başta kalır).
 * Hiçbiri geçerli değilse null → başlık HİÇ gönderilmez (API "IP okunamadı"
 * dalına düşer ve paylaşılan kovayı kullanır; yanlış IP'ye güvenmez).
 */
export function clientIpFromHeaders(headers: HeaderReader): string | null {
  const real = headers.get("x-real-ip");
  if (isPlausibleIp(real)) return (real as string).trim();
  return lastPlausible(headers.get("x-vercel-forwarded-for")) ?? lastPlausible(headers.get("x-forwarded-for"));
}

/** Sır gerçekten kurulu mu? (Boş/kısa değer fail-closed olarak yok sayılır.) */
export function proxySecretConfigured(secret: string | undefined | null): boolean {
  return typeof secret === "string" && secret.trim().length >= MIN_PROXY_SECRET_LENGTH;
}

/**
 * API'ye eklenecek kimlik başlıkları. Sır yoksa BOŞ nesne döner.
 * IP okunamazsa yalnız sır gönderilir (API: "proxy'den geldi, IP'ye güvenme").
 */
export function proxyIdentityHeaders(
  headers: HeaderReader,
  secret: string | undefined | null = process.env.API_PROXY_SECRET,
): Record<string, string> {
  if (!proxySecretConfigured(secret)) return {};
  const out: Record<string, string> = { [PROXY_SECRET_HEADER]: (secret as string).trim() };
  const ip = clientIpFromHeaders(headers);
  if (ip) out[CLIENT_IP_HEADER] = ip;
  return out;
}

export interface UpstreamHeaderOptions {
  /** Üye oturum çerezini ilet (üye uçları için ŞART). */
  cookie?: boolean;
  /** İstek gövdesi varsa content-type'ı ilet. */
  contentType?: boolean;
  /** Sabit ek başlıklar (nadiren gerekir). */
  extra?: Record<string, string>;
}

/**
 * Bir route handler'ın upstream fetch'inde kullanacağı TAM başlık kümesi.
 * Gelen istek başlıkları kopyalanmaz — yalnız burada adı geçenler geçer.
 */
export function upstreamHeaders(
  request: { headers: HeaderReader },
  options: UpstreamHeaderOptions = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  if (options.contentType) {
    out["content-type"] = request.headers.get("content-type") ?? "application/json";
  }
  if (options.cookie) {
    out.cookie = request.headers.get("cookie") ?? "";
  }
  Object.assign(out, options.extra ?? {}, proxyIdentityHeaders(request.headers));
  return out;
}

/* ───────────────────── Tek proxy yolu (üye uçları) ───────────────────── */

export const DEFAULT_API_ORIGIN = "https://cicekyolla-api.onrender.com";

export function apiOrigin(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  const raw = env.NEXT_PUBLIC_API_ORIGIN;
  const origin = typeof raw === "string" && raw.trim() ? raw.trim() : DEFAULT_API_ORIGIN;
  return origin.replace(/\/+$/, "");
}

export interface ForwardOptions {
  /** API yolu — `/api/auth/login` gibi. Sorgu dizesi EKLENMEZ (PII URL'ye yazılmaz). */
  path: string;
  method?: "GET" | "POST";
  /** Üye oturum çerezi iletilsin mi? Üye uçlarında ŞART. */
  cookie?: boolean;
  /** Gövde (POST). Verilmezse content-type da gönderilmez. */
  body?: string;
  /** Upstream `Set-Cookie` istemciye aktarılsın mı? (login/register/tamamla/logout) */
  passSetCookie?: boolean;
  /**
   * Upstream'e gidecek content-type'ı SABİTLER. Verilmezse istemcinin başlığı
   * iletilir (bugünkü davranış). Gövdeyi bu katman YENİDEN KURDUĞUNDA şarttır:
   * ör. RFC 8058 tek tık isteği `application/x-www-form-urlencoded` gelir ama
   * API'ye JSON gövde gider — istemcinin başlığı kopyalanırsa API gövdeyi
   * hiç ayrıştırmaz ve geçerli bir çıkış "bağlantı geçersiz" olur.
   */
  contentType?: string;
  /** Test için enjekte edilir; üretimde global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Upstream yanıtından istemciye AYNEN geçen başlıklar (content-type,
 * cache-control ve istenirse Set-Cookie dışında). Liste bilinçli olarak dar:
 * upstream'in iç başlıkları (sunucu, istek kimliği…) istemciye sızmaz.
 *
 *   • `retry-after` — API 429'da kaç saniye beklenmesi gerektiğini söyler
 *     (DESIGN §3.A.8: "429 gövdesi + Retry-After"). Proxy onu düşürürse
 *     tarayıcı/istemci ne zaman yeniden deneyeceğini bilemez.
 */
export const PASSTHROUGH_RESPONSE_HEADERS = ["retry-after"] as const;

/**
 * Route handler'ların TEK upstream yolu. Aynı üç şeyi her dosyada tekrarlamak
 * yerine burada bir kez yapar: kimlik başlıkları, çerez aktarımı, hata yalıtımı.
 *
 * Hata durumunda 502 `{error:'proxy_error'}` döner (bugünkü davranış); teknik
 * ayrıntı gövdeye yazılmaz — `lib/authErrors.ts` bunu kullanıcıya gösterilecek
 * Türkçe cümleye çevirir.
 */
export async function forwardToApi(
  request: { headers: HeaderReader },
  options: ForwardOptions,
): Promise<Response> {
  const doFetch = options.fetchImpl ?? fetch;
  const hasBody = typeof options.body === "string";
  let upstream: Response;
  const outHeaders = upstreamHeaders(request, { cookie: options.cookie === true, contentType: hasBody });
  if (hasBody && typeof options.contentType === "string" && options.contentType) {
    outHeaders["content-type"] = options.contentType;
  }
  try {
    upstream = await doFetch(`${apiOrigin()}${options.path}`, {
      method: options.method ?? "GET",
      headers: outHeaders,
      ...(hasBody ? { body: options.body } : {}),
      cache: "no-store",
    });
  } catch {
    return new Response(JSON.stringify({ error: "proxy_error" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
  const headers = new Headers({
    "content-type": upstream.headers.get("content-type") ?? "application/json",
    "cache-control": "private, no-store",
  });
  if (options.passSetCookie) {
    const cookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [upstream.headers.get("set-cookie")].filter((value): value is string => Boolean(value));
    for (const cookie of cookies) headers.append("set-cookie", cookie);
  }
  for (const name of PASSTHROUGH_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (upstream.status === 204) return new Response(null, { status: 204, headers });
  return new Response(await upstream.text(), { status: upstream.status, headers });
}
