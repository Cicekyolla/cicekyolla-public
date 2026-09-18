import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * "Tüm cihazlarda oturumu kapat" (DESIGN §3.A.6).
 *
 * API `session_version`'ı artırır; o üyeye ait BÜTÜN çerezler — çalınmış
 * olanlar dâhil — anında geçersizleşir. Üye oturumu şart olduğu için çerez
 * iletilir; API'nin sildiği çerez de istemciye aktarılır.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/oturumlari-kapat",
    method: "POST",
    cookie: true,
    passSetCookie: true,
  });
}
