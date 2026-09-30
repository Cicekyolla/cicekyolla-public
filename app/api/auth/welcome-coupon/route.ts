import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Hoş geldin kupon KODU — yalnız giriş yapmış üyeye (oturum yoksa 401).
 *
 * Kod/uygunluk kararının tamamı API'de verilir (welcomeOffer.welcomeMemberState
 * + DECISIONS #9 telefon kanıtı kapısı). Bu katman gövdeyi DEĞİŞTİRMEZ; ekran
 * `available:false` + `reason` geldiğinde kupon uydurmaz.
 */
export async function GET(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/welcome-coupon",
    cookie: true,
  });
}
