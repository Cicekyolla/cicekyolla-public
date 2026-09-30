import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Şifre belirleme / telefon kanıtının TAMAMLANMASI.
 *
 * ÇEREZ İLETİLMEK ZORUNDA (düzeltilen kök neden): API `resolveMemberSession`
 * ile isteği atan üyeyi okuyor ve `memberOwnership.decidePhoneProof`'un B3/C2
 * dallarını YALNIZ `session.authUserId === token.auth_user_id` ise çalıştırıyor
 * (DESIGN §3.A.5 · A1-5). Çerez iletilmezse oturum açık bir üyenin telefon
 * doğrulaması sessizce "kimliksiz talep" dalına düşer: geçmiş siparişleri
 * hesabına bağlanmaz ve kullanıcı sebebini hiç öğrenmez.
 *
 * Başarıda API yeni oturum çerezi yazar (session_version arttı) → aktarılır.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/sifre-sifirla/tamamla",
    method: "POST",
    cookie: true,
    body: await request.text(),
    passSetCookie: true,
  });
}
