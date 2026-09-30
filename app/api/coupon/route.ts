import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Kupon doğrulama proxy'si → `POST /api/public/coupon`.
 *
 * ÜYE OTURUMU ŞART: API müşteri kimliğini YALNIZ çerezden türetir
 * (publicCheckoutController: gövdedeki `customer_id` kabul edilir ama
 * OKUNMAZ), bu yüzden `first_order_only` / `usage_per_customer` kuponları
 * ancak çerez iletildiğinde doğru değerlendirilir.
 *
 * KİMLİK BAŞLIKLARI (düzeltilen kök neden): bu uç API tarafında hız
 * sınırlıdır — `coupon:validate` ve `coupon:not_found` kovaları
 * `requestIdentity.clientIdentity(req)` ile kurulur (publicCheckoutController
 * `rateBuckets`). `x-cy-proxy-secret` + `x-cy-client-ip` gönderilmezse her
 * misafir isteği tek bir paylaşılan "direct" kovasına düşer ve kova `observe`
 * modunda kalır: kupon kodu deneyen bot için kapı FİİLEN kapalı olmaz. Bu
 * yüzden istek, diğer üye uçlarıyla AYNI tek yoldan (lib/apiProxyHeaders)
 * geçer; başlık kümesi sıfırdan kurulur, istemcinin `x-cy-*` başlıkları
 * kopyalanmaz.
 *
 * Gövde ve yanıt sözleşmesi DEĞİŞMEDİ; hata yine 502 `{error:'proxy_error'}`.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/public/coupon",
    method: "POST",
    cookie: true,
    body: await request.text(),
  });
}
