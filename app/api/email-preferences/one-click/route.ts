import { forwardToApi } from "@/lib/apiProxyHeaders";
import {
  ONE_CLICK_API_PATH,
  PREFERENCE_RESPONSE_HEADERS,
  oneClickToken,
  preferencePageLocation,
  unsubscribeUpstreamBody,
} from "@/lib/emailPreferences";

/**
 * RFC 8058 TEK TIK ÇIKIŞ (DESIGN §3.G.2).
 *
 * Her kampanya postasının başlığı buraya işaret eder:
 *   List-Unsubscribe: <https://www…/api/email-preferences/one-click?t=JETON>
 *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
 * Gmail/Yahoo bu adrese `application/x-www-form-urlencoded` gövdesiyle POST
 * eder; jeton YALNIZ sorgu dizesindedir. Bu katman jetonu okur ve API'ye JSON
 * olarak iletir (paket değişikliği yok). Kimlik başlıkları iletilir: API
 * geçersiz jeton denemelerini istemci IP'sine göre sayar (geçerli çıkışlar
 * sayılmaz — sağlayıcılar paylaşılan IP'lerden POST eder).
 *
 * Yanıt API'ninkidir: geçerli jeton → 200 (tekrarında da 200, `already:true`),
 * geçersiz → 400, sınır → 429 + Retry-After. RFC 8058 gereği YÖNLENDİRME YOK.
 * Üye oturum çerezi İLETİLMEZ: çıkış jetonla yapılır, oturumla değil.
 */
export async function POST(request: Request) {
  const token = oneClickToken({
    url: request.url,
    body: await request.text().catch(() => ""),
    contentType: request.headers.get("content-type"),
  });
  const response = await forwardToApi(request, {
    path: ONE_CLICK_API_PATH,
    method: "POST",
    body: unsubscribeUpstreamBody(token),
    contentType: "application/json",
  });
  for (const [name, value] of Object.entries(PREFERENCE_RESPONSE_HEADERS)) response.headers.set(name, value);
  return response;
}

/**
 * Bazı posta istemcileri başlık adresini tarayıcıda (GET) açar. GET ASLA
 * mutasyon yapmaz (posta tarayıcıları bağlantıları önden çeker): kişi insan
 * sayfasına gönderilir, jeton FRAGMENT'e taşınır ve orada onaylanır.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? url.searchParams.get("token");
  return new Response(null, {
    status: 303,
    headers: { location: preferencePageLocation(token), ...PREFERENCE_RESPONSE_HEADERS },
  });
}
