// POST /api/revalidate — yayın sonrası ana sayfa verisini anında tazeler (Tema & Sezon Adım 5).
// Çağıran: API (homepageService.publish + banner değişikliği), başlık x-revalidate-secret.
// Etki: "homepage" etiketli fetch önbelleği (yayındaki DTO + banner) ve "/" rotası geçersizlenir;
// sonraki istek taze veriyle üretilir. Layout aynı DTO'yu okuduğu için sezon değişkenleri de
// diğer sayfalarda ilk ziyarette yenilenir (tembel; toplu yeniden üretim YOK).
// REVALIDATE_SECRET tanımlı değilse 503 → API bunu "yapılandırılmadı" olarak raporlar, site
// bugünkü gibi 60 sn ISR ile güncellenmeye devam eder.
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { HOMEPAGE_CACHE_TAG } from "@/lib/homepage";
import { checkRevalidateSecret, REVALIDATE_HEADER } from "@/lib/revalidateAuth";
import { parseRevalidatePaths, seoPageTag } from "@/lib/revalidatePaths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function POST(req: Request) {
  const auth = checkRevalidateSecret(req.headers.get(REVALIDATE_HEADER), process.env.REVALIDATE_SECRET);
  if (auth === "not_configured") {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503, headers: NO_STORE });
  }
  if (auth === "unauthorized") {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  // EK (27 Eki 2026): { paths: [...] } gövdesi → yalnız o SEO sayfaları (sayfa + fetchSeoPage verisi) yenilenir.
  // Gövdesiz / paths'siz çağrı bugünkü gibi ana sayfa (API homepageRevalidate gövdesiz çağırır).
  const body = await req.json().catch(() => null);
  const parsed = parseRevalidatePaths(body);
  if (parsed) {
    for (const p of parsed.paths) {
      revalidateTag(seoPageTag(p));
      revalidatePath(p);
    }
    return NextResponse.json(
      { ok: true, revalidated: parsed.paths, rejected: parsed.rejected, at: new Date().toISOString() },
      { headers: NO_STORE },
    );
  }
  revalidateTag(HOMEPAGE_CACHE_TAG);
  revalidatePath("/");
  return NextResponse.json(
    { ok: true, revalidated: [HOMEPAGE_CACHE_TAG, "/"], at: new Date().toISOString() },
    { headers: NO_STORE },
  );
}
