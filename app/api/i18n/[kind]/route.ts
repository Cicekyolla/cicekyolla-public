import { NextResponse } from "next/server";

/**
 * 14 dil Faz 2 — dinamik içerik çevirisi proxy'si (API: /api/public/translations/*).
 *   /api/i18n/product?slug=...&locale=xx   → { data: {name, short_description, long_description} | null }
 *   /api/i18n/products?ids=1,2&locale=xx   → { data: { [id]: name } }
 *   /api/i18n/categories?locale=xx         → { data: { byId, bySlug } }
 * Yalnız ONAYLI çeviriler döner; hata/boşta null → istemci TR'ye düşer. Fiyat/slot yok.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";
const LOCALES = new Set(["en", "ar", "zh", "nl", "de", "it", "ja", "pt", "ko", "ru", "es", "az", "fr"]);

export const revalidate = 300;

export async function GET(request: Request, { params }: { params: { kind: string } }) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "";
  if (!LOCALES.has(locale)) return NextResponse.json({ data: null });
  let upstream: string | null = null;
  if (params.kind === "product") {
    const slug = (url.searchParams.get("slug") ?? "").trim();
    if (!/^[a-z0-9-]{1,200}$/i.test(slug)) return NextResponse.json({ data: null });
    upstream = `${API_ORIGIN}/api/public/translations/product/${encodeURIComponent(slug)}?locale=${locale}`;
  } else if (params.kind === "products") {
    const ids = (url.searchParams.get("ids") ?? "").split(",").filter((s) => /^\d{1,10}$/.test(s)).slice(0, 200).join(",");
    if (!ids) return NextResponse.json({ data: {} });
    upstream = `${API_ORIGIN}/api/public/translations/products?locale=${locale}&ids=${ids}`;
  } else if (params.kind === "categories") {
    upstream = `${API_ORIGIN}/api/public/translations/categories?locale=${locale}`;
  }
  if (!upstream) return NextResponse.json({ data: null }, { status: 404 });
  try {
    const resp = await fetch(upstream, { next: { revalidate: 300 } });
    const json = await resp.json().catch(() => null);
    return NextResponse.json(resp.ok && json ? json : { data: null }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ data: null });
  }
}
