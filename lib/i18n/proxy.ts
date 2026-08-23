/** /api/i18n proxy'sinin saf karar mantığı (test edilebilir): locale/kind/parametre doğrulama → upstream URL veya sabit yanıt. */
export const CONTENT_LOCALES = new Set(["en", "ar", "zh", "nl", "de", "it", "ja", "pt", "ko", "ru", "es", "az", "fr"]);

export type ProxyDecision = { upstream: string } | { data: null | Record<string, never> };

export function resolveUpstream(kind: string, params: URLSearchParams, apiOrigin: string): ProxyDecision {
  const locale = params.get("locale") ?? "";
  if (!CONTENT_LOCALES.has(locale)) return { data: null };
  if (kind === "product") {
    const slug = (params.get("slug") ?? "").trim();
    if (!/^[a-z0-9-]{1,200}$/i.test(slug)) return { data: null };
    return { upstream: `${apiOrigin}/api/public/translations/product/${encodeURIComponent(slug)}?locale=${locale}` };
  }
  if (kind === "products") {
    const ids = (params.get("ids") ?? "").split(",").filter((s) => /^\d{1,10}$/.test(s)).slice(0, 200).join(",");
    if (!ids) return { data: {} };
    return { upstream: `${apiOrigin}/api/public/translations/products?locale=${locale}&ids=${ids}` };
  }
  if (kind === "categories") return { upstream: `${apiOrigin}/api/public/translations/categories?locale=${locale}` };
  return { data: null };
}
