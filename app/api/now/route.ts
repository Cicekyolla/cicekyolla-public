import { NextResponse } from "next/server";

/**
 * Sunucu saati çıpası.
 *
 * NEDEN: sepetteki "teslimat tarihi geçti" kararı tarayıcı saatine körü körüne
 * güvenemez — saati bozuk/ileri alınmış bir cihaz geçerli bir satırı sildirir.
 * Bu uç yalnızca zaman döner; kimlik, oturum, veri YOK. Yanıt önbelleklenmez.
 *
 * Tüketici: lib/serverClock.ts (tek çağrı, yalnız sepette tarihli satır varsa).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { now: new Date().toISOString(), epoch_ms: Date.now(), tz: "Europe/Istanbul" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
