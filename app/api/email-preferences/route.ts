import { forwardToApi } from "@/lib/apiProxyHeaders";
import {
  PREFERENCE_RESPONSE_HEADERS,
  UNSUBSCRIBE_API_PATH,
  tokenFromPageBody,
  unsubscribeUpstreamBody,
  viewApiPath,
} from "@/lib/emailPreferences";

/**
 * /e-posta-tercihleri sayfasının iki ucu (DESIGN §3.G.2):
 *
 *   GET  ?t=JETON → API `GET /api/public/marketing/unsubscribe?t=` — SADECE OKUR
 *        (maskeli adres + durum). Posta tarayıcıları bağlantıları önden
 *        çektiği için burada hiçbir şey yazılmaz.
 *   POST {t}      → API `POST /api/public/marketing/unsubscribe` — "Aboneliği
 *        bırak" düğmesi. İdempotent (ikinci çağrı `already:true`).
 *
 * Kimlik başlıkları iletilir (geçersiz jeton denemeleri IP'ye göre sayılır);
 * üye çerezi iletilmez (çıkış jetonla yapılır).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await forwardToApi(request, {
    path: viewApiPath(url.searchParams.get("t") ?? url.searchParams.get("token")),
  });
  for (const [name, value] of Object.entries(PREFERENCE_RESPONSE_HEADERS)) response.headers.set(name, value);
  return response;
}

export async function POST(request: Request) {
  const token = tokenFromPageBody(await request.text().catch(() => ""));
  const response = await forwardToApi(request, {
    path: UNSUBSCRIBE_API_PATH,
    method: "POST",
    body: unsubscribeUpstreamBody(token),
    contentType: "application/json",
  });
  for (const [name, value] of Object.entries(PREFERENCE_RESPONSE_HEADERS)) response.headers.set(name, value);
  return response;
}
