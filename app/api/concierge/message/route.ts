import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Web AI Satış Danışmanı — bir sohbet turu.
 *
 * Tarayıcı API'ye doğrudan gitmez: istek buradan, kimlik başlıklarıyla (proxy sırrı + istemci IP'si,
 * lib/apiProxyHeaders.ts) iletilir → API'nin IP hız sınırı gerçek ziyaretçiye göre çalışır.
 * Gövde ve yanıt sözleşmesi API'nindir (POST /api/public/concierge/message); burada değiştirilmez.
 *
 * Bayrak: CONCIERGE_ENABLED !== "true" iken 404 — gövde okunmaz, API'ye gidilmez.
 * Çerez iletilmez (anonim sohbet; üye oturumu bu uca taşınmaz).
 */
export const dynamic = "force-dynamic";

/** API'nin kendi sınırı 8 KB; daha büyüğü buradan geri çevrilir. */
const MAX_BODY_BYTES = 8 * 1024;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "private, no-store" },
});

export async function POST(request: Request) {
  if (process.env.CONCIERGE_ENABLED !== "true") return json(404, { error: "Not found" });
  const body = await request.text();
  if (body.length === 0 || new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    return json(422, { ok: false, error: "Geçersiz istek." });
  }
  return forwardToApi(request, { path: "/api/public/concierge/message", method: "POST", body });
}
