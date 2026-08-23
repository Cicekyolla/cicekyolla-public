import { NextResponse } from "next/server";
import { resolveUpstream } from "@/lib/i18n/proxy";

/**
 * 14 dil Faz 2 — dinamik içerik çevirisi proxy'si (API: /api/public/translations/*).
 *   /api/i18n/product?slug=...&locale=xx   → { data: {name, short_description, long_description} | null }
 *   /api/i18n/products?ids=1,2&locale=xx   → { data: { [id]: name } }
 *   /api/i18n/categories?locale=xx         → { data: { byId, bySlug } }
 * Yalnız ONAYLI çeviriler döner; hata/boşta null → istemci TR'ye düşer. Fiyat/slot yok.
 * CACHE YOK (canlı ölçüm 23 Ağu: Vercel edge s-maxage + Next Data Cache üst üste binince
 * unapprove ~10 dk, approve ~5 dk gecikiyordu). API origin zaten dinamik; yanıtlar küçük;
 * istemci tarafında oturum içi bellek cache (lib/i18n/content.tsx) tekrarlı isteği önler.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { kind: string } }) {
  const d = resolveUpstream(params.kind, new URL(request.url).searchParams, API_ORIGIN);
  if (!("upstream" in d)) return NextResponse.json(d);
  try {
    const resp = await fetch(d.upstream, { cache: "no-store" });
    const json = await resp.json().catch(() => null);
    return NextResponse.json(resp.ok && json ? json : { data: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ data: null });
  }
}
