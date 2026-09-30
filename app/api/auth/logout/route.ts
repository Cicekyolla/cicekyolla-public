import { forwardToApi } from "@/lib/apiProxyHeaders";

/** Bu cihazda çıkış. API 204 + çerez silme başlığı döner. */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/logout",
    method: "POST",
    cookie: true,
    passSetCookie: true,
  });
}
