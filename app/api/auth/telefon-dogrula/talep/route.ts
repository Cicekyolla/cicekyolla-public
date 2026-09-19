import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Telefon sahipliği kanıtı talebi (DESIGN §3.A.4 · DECISIONS #9).
 *
 * Üye oturumu ŞART → çerez iletilir. Yanıt her koşulda 202 ve aynı metindir;
 * bu katman gövdeyi değiştirmez (aksi halde "bu numara başka hesapta" gibi bir
 * ipucu sızabilirdi). Kimlik başlıkları kullanıcı/IP kovaları için şarttır.
 *
 * Telefon numarası GÖVDEDE gider; sorgu dizesine ASLA yazılmaz.
 */
export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/telefon-dogrula/talep",
    method: "POST",
    cookie: true,
    body: await request.text(),
  });
}
