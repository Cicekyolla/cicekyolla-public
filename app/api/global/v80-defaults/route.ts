import { NextResponse } from "next/server";
import { isGlobalLocale, GLOBAL_LOCALES } from "@/lib/global/config";
import { flattenCopy, V80_COPY } from "@/lib/global/v80/copy";
import { defaultStructure, V80_SECTION_IDS } from "@/lib/global/v80/schema";

// GLOBAL VERSION 80 — Admin "Vitrin" editörünün tek metin kaynağı: kodda gömülü
// 13 dil varsayılanları (düz anahtar → metin). Admin yalnız geçersiz kılmaları
// DB'ye yazar; varsayılanlar burada okunur (ikinci kopya tutulmaz).
export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale");
  if (!locale || !isGlobalLocale(locale)) {
    return NextResponse.json({ error: "invalid locale", locales: GLOBAL_LOCALES }, { status: 400 });
  }
  return NextResponse.json(
    { data: { locale, texts: flattenCopy(V80_COPY[locale]), structure: defaultStructure(), sections: V80_SECTION_IDS } },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
