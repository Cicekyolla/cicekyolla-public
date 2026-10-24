import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Ödeme sayfası önerileri → `GET /api/public/checkout-offers?ids=` (Revenue Optimizer).
 * Panelde kapalıysa API `{ enabled: false }` döner; vitrin bugünkü gibi çalışır.
 */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",").map((x) => x.trim()).filter((x) => /^\d{1,12}$/.test(x)).slice(0, 30).join(",");
  return forwardToApi(request, { path: `/api/public/checkout-offers?ids=${encodeURIComponent(ids)}`, method: "GET" });
}
