import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Şifre sıfırlama talebi. Kimlik (e-posta/telefon) GÖVDEDE gider.
 *
 * Kimlik başlıkları burada özellikle önemlidir: API bu ucu IP 5/15dk,
 * identifier 3/15dk ve `sent_to` 3/15dk + 5/gün kovalarıyla sınırlar. Gerçek
 * IP iletilmezse bütün ziyaretçiler aynı kovayı paylaşır.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/sifre-sifirla/talep",
    method: "POST",
    body: await request.text(),
  });
}
