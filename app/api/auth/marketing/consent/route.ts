import { forwardToApi } from "@/lib/apiProxyHeaders";

/**
 * Üyenin kendi pazarlama e-posta izni (DESIGN §3.G.2 — Hesabım anahtarı ve
 * yeni üye penceresi). API `GET|POST /api/auth/marketing/consent`.
 *
 *   GET  → güncel durum (izin verildi / geri çekildi / yok + gönderim engeli).
 *   POST → `{granted, source}`; kaynak yalnız `account_settings` |
 *          `welcome_popup` (API `.strict()` şeması; fazladan alan 400).
 *          İZİN VERME API bayrağına bağlıdır (kapalıysa 409); GERİ ÇEKME her
 *          zaman çalışır. Yanıt taze read-back'tir.
 *
 * Üye oturumu ŞART → çerez iletilir. Kimlik başlıkları iletilir: API izin
 * kanıtına istemci IP'sinin HMAC'ini yazar (ham IP saklanmaz).
 */
export async function GET(request: Request) {
  return forwardToApi(request, { path: "/api/auth/marketing/consent", cookie: true });
}

export async function POST(request: Request) {
  return forwardToApi(request, {
    path: "/api/auth/marketing/consent",
    method: "POST",
    cookie: true,
    body: await request.text(),
    contentType: "application/json",
  });
}
