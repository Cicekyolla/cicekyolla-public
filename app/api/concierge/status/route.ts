import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Web AI Satış Danışmanı — açık mı?
 *
 * İKİ BAYRAK birlikte gerekir:
 *   • Public: CONCIERGE_ENABLED === "true"  (bu rota; kapalıyken API'ye HİÇ gidilmez → 404)
 *   • API:    WEB_AI_ENABLED === "true"     (kapalıyken API 404 döner, aynen iletilir)
 * Biri kapalıysa başlatıcı çizilmez; müşteri hiçbir şey görmez.
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response(JSON.stringify({ error: "Not found" }), {
  status: 404,
  headers: { "content-type": "application/json", "cache-control": "private, no-store" },
});

export async function GET(request: Request) {
  if (process.env.CONCIERGE_ENABLED !== "true") return NOT_FOUND();
  return forwardToApi(request, { path: "/api/public/concierge/status", method: "GET" });
}
