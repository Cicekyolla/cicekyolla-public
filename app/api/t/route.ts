import { apiOrigin } from "@/lib/apiProxyHeaders";

/**
 * Ziyaretçi olay köprüsü → `POST /api/public/visit/events` (migration 118).
 *
 * Tarayıcı aynı kökene `sendBeacon` ile yazar; burası paketi API'ye iletir.
 * Yanıt DAİMA 204 (hata/zaman aşımı dahil) — tarayıcı tekrar denemez, sayfa
 * hiçbir koşulda beklemez. İstemcinin IP'si iletilmez; yalnız user-agent
 * (API'de bot süzgeci) ve varsa `VISIT_INGEST_KEY` (yalnız sunucuda) eklenir.
 */
const MAX_BYTES = 16_384;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body && body.length <= MAX_BYTES) {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-client-ua": (request.headers.get("user-agent") ?? "").slice(0, 400),
      };
      const key = process.env.VISIT_INGEST_KEY?.trim();
      if (key) headers["x-visit-key"] = key;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      await fetch(`${apiOrigin()}/api/public/visit/events`, { method: "POST", headers, body, cache: "no-store", signal: ctrl.signal }).catch(() => {});
      clearTimeout(t);
    }
  } catch {
    /* ölçüm asla hata döndürmez */
  }
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
