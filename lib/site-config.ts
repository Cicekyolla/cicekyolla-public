import type { Metadata } from "next";

const PRODUCTION_SITE_URL = "https://www.cicekyolla.com.tr";

function normalizeSiteUrl(value: string | undefined): string {
  const candidate = value?.trim() || PRODUCTION_SITE_URL;
  try {
    const url = new URL(candidate);
    const normalized = `${url.protocol}//${url.host}`.replace(/\/$/, "");
    return normalized === PRODUCTION_SITE_URL ? normalized : PRODUCTION_SITE_URL;
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

// Domain cutover onayı: yalnız gerçek Vercel production + kesin kanonik domain
// birlikteyse indeksleme açılır. Preview/branch/local ortamları noindex kalır.
export const SITE_INDEXABLE =
  process.env.VERCEL_ENV === "production" &&
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") === PRODUCTION_SITE_URL;

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path);
      if (
        parsed.hostname.endsWith("cicekyolla.com") ||
        parsed.hostname.endsWith("cicekyolla.com.tr") ||
        parsed.hostname.endsWith("vercel.app")
      ) {
        return `${SITE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return path;
    } catch {
      return SITE_URL;
    }
  }
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function indexRobots(indexState: string = "index"): Metadata["robots"] {
  const indexable = SITE_INDEXABLE && indexState === "index";
  return indexable
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true };
}
