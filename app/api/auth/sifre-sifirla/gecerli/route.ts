import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * "Bu bağlantı hâlâ geçerli mi?" kontrolü.
 *
 * POST BİRİNCİL YOLDUR (DESIGN §3.A.9): bağlantı `#token=` fragment biçimine
 * geçtiğinde istemci token'ı tekrar bir sorgu dizesine yazmak zorunda kalmaz —
 * yazsaydı fragment'in tüm kazancı (sunucu erişim kayıtları, Referer, GTM
 * `page_location`) geri kaybedilirdi.
 *
 * GET yalnız geriye dönük uyum için KALIR (eski `?token=` bağlantısına tıklamış
 * ve sayfası önbellekten gelen kullanıcı). Yeni kod POST kullanır.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/sifre-sifirla/gecerli",
    method: "POST",
    body: await request.text(),
  });
}

export async function GET(request: Request) {
  // Yalnız `token` iletilir; gelen sorgu dizesi olduğu gibi geçirilmez.
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return forwardToApi(request, {
    path: "/api/auth/sifre-sifirla/gecerli",
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
