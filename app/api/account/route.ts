import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Hesabım'ın TEK veri kaynağı: `GET /api/auth/account`.
 *
 * Aynı gövde admin üye detayıyla aynı `accountOrders` sorgusundan üretilir, bu
 * yüzden istemci hiçbir rakamı yeniden hesaplamaz. Üye oturumu şart → çerez
 * iletilir. Hata artık yutulmuyor: upstream'e ulaşılamazsa 502 `proxy_error`
 * döner ve ekran "bağlantı kurulamadı" der (eskiden fetch throw edip Next'in
 * genel 500 sayfası çıkıyordu).
 */
export async function GET(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/account",
    cookie: true,
  });
}
