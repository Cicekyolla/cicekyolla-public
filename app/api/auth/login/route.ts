import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Üye girişi. Tek değişiklik: istek artık kimlik başlıklarıyla iletiliyor
 * (lib/apiProxyHeaders.ts). Bunlar olmadan API'nin login hız sınırı TÜM
 * ziyaretçileri tek "direct" kovasına yazar; tek bir saldırgan herkesin
 * girişini kilitleyebilir. Gövde ve yanıt sözleşmesi DEĞİŞMEDİ.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/login",
    method: "POST",
    body: await request.text(),
    passSetCookie: true,
  });
}
