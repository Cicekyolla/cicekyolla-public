import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * W4-2 — telefon kanıtından sonra hesapta kalan (başkasının yazmış olabileceği)
 * e-posta için üyenin kararı: { karar: "onayla" | "kaldir" }.
 *
 * Üye oturumu şarttır; çerez iletilir. Karar ve metin sunucudadır, bu dosya
 * yalnız köprüdür.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/eposta-inceleme",
    method: "POST",
    cookie: true,
    body: await request.text(),
  });
}
