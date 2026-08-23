import { NextResponse } from "next/server";
import { resolveUpstream } from "@/lib/i18n/proxy";

/**
 * 14 dil Faz 2 — dinamik içerik çevirisi proxy'si (API: /api/public/translations/*).
 *   /api/i18n/product?slug=...&locale=xx   → { data: {name, short_description, long_description} | null }
 *   /api/i18n/products?ids=1,2&locale=xx   → { data: { [id]: name } }
 *   /api/i18n/categories?locale=xx         → { data: { byId, bySlug } }
 * Yalnız ONAYLI çeviriler döner; hata/boşta null → istemci TR'ye düşer. Fiyat/slot yok.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";
export const revalidate = 300;

export async function GET(request: Request, { params }: { params: { kind: string } }) {
  const d = resolveUpstream(params.kind, new URL(request.url).searchParams, API_ORIGIN);
  if (!("upstream" in d)) return NextResponse.json(d);
  try {
    const resp = await fetch(d.upstream, { next: { revalidate: 300 } });
    const json = await resp.json().catch(() => null);
    return NextResponse.json(resp.ok && json ? json : { data: null }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ data: null });
  }
}
