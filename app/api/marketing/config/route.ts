import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Pazarlama e-posta izni kutucuğunun TEK gerçeği (DESIGN §3.G.2 · §5.1):
 * API `GET /api/public/marketing/config`.
 *
 * `capture_enabled` yalnız API bayrağı (MARKETING_CONSENT_CAPTURE_ENABLED) VE
 * hukukça onaylı metin sürümü birlikteyken true'dur; kapalıyken metin de
 * DÖNMEZ → /giris, yeni üye penceresi ve Hesabım kutucuk ÇİZMEZ. Kimliksiz uç:
 * çerez iletilmez.
 */
export async function GET(request: Request) {
  return forwardToApi(request, { path: "/api/public/marketing/config" });
}
