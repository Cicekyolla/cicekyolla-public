import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Üyelik kaydı. Gövde olduğu gibi iletilir — `kvkk_onay` dâhil. API
 * `kvkk_onay !== true` ise 400 döner (memberAuthValidation.parseRegisterInput),
 * bu yüzden bu katman onayı ASLA kendisi doldurmaz.
 *
 * Kimlik başlıkları register kovaları için şarttır (IP 5/saat).
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/register",
    method: "POST",
    body: await request.text(),
    passSetCookie: true,
  });
}
