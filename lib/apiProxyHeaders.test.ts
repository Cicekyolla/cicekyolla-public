import test from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_IP_HEADER,
  DEFAULT_API_ORIGIN,
  PROXY_SECRET_HEADER,
  apiOrigin,
  clientIpFromHeaders,
  forwardToApi,
  isPlausibleIp,
  proxyIdentityHeaders,
  proxySecretConfigured,
  upstreamHeaders,
} from "./apiProxyHeaders.ts";

const SECRET = "s".repeat(32);

function headers(map: Record<string, string>) {
  const lower = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

test("sır yoksa / kısaysa HİÇ başlık gönderilmez (observe modu)", () => {
  const h = headers({ "x-real-ip": "1.2.3.4" });
  assert.deepEqual(proxyIdentityHeaders(h, undefined), {});
  assert.deepEqual(proxyIdentityHeaders(h, ""), {});
  assert.deepEqual(proxyIdentityHeaders(h, "kisa"), {});
  assert.deepEqual(proxyIdentityHeaders(h, " ".repeat(40)), {});
  assert.equal(proxySecretConfigured("x".repeat(15)), false);
  assert.equal(proxySecretConfigured("x".repeat(16)), true);
});

test("sır varsa sır + doğrulanmış IP gönderilir", () => {
  const out = proxyIdentityHeaders(headers({ "x-real-ip": "1.2.3.4" }), SECRET);
  assert.deepEqual(out, { [PROXY_SECRET_HEADER]: SECRET, [CLIENT_IP_HEADER]: "1.2.3.4" });
});

test("İSTEMCİNİN yazdığı x-cy-* başlıkları ASLA iletilmez", () => {
  const out = upstreamHeaders(
    {
      headers: headers({
        [PROXY_SECRET_HEADER]: "saldirganin-sirri-cok-uzun-olsa-bile",
        [CLIENT_IP_HEADER]: "9.9.9.9",
        "x-real-ip": "1.2.3.4",
        cookie: "cy_member_session=abc",
        "content-type": "application/json",
      }),
    },
    { cookie: true, contentType: true },
  );
  // Sır ortamda yok → kimlik başlıkları hiç yoktur; istemcinin değeri sızmaz.
  assert.equal(out[PROXY_SECRET_HEADER], undefined);
  assert.equal(out[CLIENT_IP_HEADER], undefined);
  assert.equal(out.cookie, "cy_member_session=abc");
  assert.equal(out["content-type"], "application/json");
});

test("sahte x-forwarded-for zinciri: yalnız SON (kenarın eklediği) değer alınır", () => {
  // İstemci "9.9.9.9" yazdı, Vercel gerçek IP'yi sona ekledi.
  assert.equal(clientIpFromHeaders(headers({ "x-forwarded-for": "9.9.9.9, 1.2.3.4" })), "1.2.3.4");
  // x-real-ip her zaman önceliklidir.
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "1.2.3.4" })),
    "1.2.3.4",
  );
  // Vercel'e özel başlık, genel XFF'ten önce gelir.
  assert.equal(
    clientIpFromHeaders(headers({ "x-vercel-forwarded-for": "5.6.7.8", "x-forwarded-for": "9.9.9.9" })),
    "5.6.7.8",
  );
});

test("bozuk/çöp IP değeri gönderilmez; yalnız sır gider", () => {
  for (const bad of ["", "   ", "abc", "1.2.3.999", "'; DROP TABLE orders; --", "x".repeat(60)]) {
    assert.equal(isPlausibleIp(bad), false, `kabul edildi: ${bad}`);
    const out = proxyIdentityHeaders(headers({ "x-real-ip": bad }), SECRET);
    assert.deepEqual(out, { [PROXY_SECRET_HEADER]: SECRET });
  }
});

test("IPv6 ve sınır IPv4 değerleri kabul edilir", () => {
  assert.equal(isPlausibleIp("::1"), true);
  assert.equal(isPlausibleIp("2a02:e0:1234::9"), true);
  assert.equal(isPlausibleIp("255.255.255.255"), true);
  assert.equal(isPlausibleIp("0.0.0.0"), true);
});

test("upstreamHeaders: cookie istenmezse çerez İLETİLMEZ (kimliksiz uçlar)", () => {
  const out = upstreamHeaders({ headers: headers({ cookie: "cy_member_session=abc" }) }, { contentType: true });
  assert.equal(out.cookie, undefined);
  assert.equal(out["content-type"], "application/json");
});

test("upstreamHeaders: cookie istendiğinde çerez yoksa boş dize gider (undefined değil)", () => {
  const out = upstreamHeaders({ headers: headers({}) }, { cookie: true });
  assert.equal(out.cookie, "");
});

test("apiOrigin: sondaki eğik çizgi(ler) atılır, boş env varsayılana düşer", () => {
  assert.equal(apiOrigin({ NEXT_PUBLIC_API_ORIGIN: "https://x.example.com/" }), "https://x.example.com");
  assert.equal(apiOrigin({ NEXT_PUBLIC_API_ORIGIN: "https://x.example.com///" }), "https://x.example.com");
  assert.equal(apiOrigin({ NEXT_PUBLIC_API_ORIGIN: "   " }), DEFAULT_API_ORIGIN);
  assert.equal(apiOrigin({}), DEFAULT_API_ORIGIN);
});

/* ─────────────────────── forwardToApi ─────────────────────── */

type Captured = { url: string; init: RequestInit & { headers: Record<string, string> } };

function fakeFetch(
  captured: Captured[],
  response: Response | (() => never),
): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    captured.push({ url, init: init as Captured["init"] });
    if (typeof response === "function") response();
    return response;
  }) as unknown as typeof fetch;
}

function req(map: Record<string, string> = {}) {
  const lower = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null } };
}

/*
 * BU TESTİN SEBEBİ (DESIGN §3.A.5 · A1-5): /sifre-sifirla/tamamla ucu API'de
 * `resolveMemberSession(req)` okuyor ve MERGE/ADOPT dallarını yalnız oturum
 * token'ın sahibiyse çalıştırıyor. Proxy çerezi İLETMEZSE oturum açık bir
 * üyenin telefon kanıtı sessizce "kimliksiz" dalına düşer: geçmiş siparişleri
 * hesabına BAĞLANMAZ ve kullanıcı sebebini hiç öğrenmez.
 */
test("cookie:true ise üye oturum çerezi upstream'e İLETİLİR", async () => {
  const captured: Captured[] = [];
  await forwardToApi(req({ cookie: "cy_member_session=abc" }), {
    path: "/api/auth/sifre-sifirla/tamamla",
    method: "POST",
    cookie: true,
    body: JSON.stringify({ token: "t" }),
    fetchImpl: fakeFetch(captured, new Response("{}", { status: 200 })),
  });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].init.headers.cookie, "cy_member_session=abc");
  assert.equal(captured[0].init.method, "POST");
  assert.match(captured[0].url, /\/api\/auth\/sifre-sifirla\/tamamla$/);
});

test("cookie belirtilmezse çerez İLETİLMEZ (kimliksiz uçlar sızdırmaz)", async () => {
  const captured: Captured[] = [];
  await forwardToApi(req({ cookie: "cy_member_session=abc" }), {
    path: "/api/auth/sifre-sifirla/talep",
    method: "POST",
    body: "{}",
    fetchImpl: fakeFetch(captured, new Response("{}", { status: 202 })),
  });
  assert.equal(captured[0].init.headers.cookie, undefined);
});

test("PII sorgu dizesine yazılmaz: URL yalnız yoldan oluşur", async () => {
  const captured: Captured[] = [];
  await forwardToApi(req(), {
    path: "/api/auth/telefon-dogrula/talep",
    method: "POST",
    body: JSON.stringify({ phone: "+905074413474" }),
    fetchImpl: fakeFetch(captured, new Response("{}", { status: 202 })),
  });
  assert.equal(captured[0].url.includes("?"), false);
  assert.equal(captured[0].url.includes("905074413474"), false);
  assert.equal(String(captured[0].init.body).includes("905074413474"), true);
});

test("passSetCookie: upstream çerezleri istemciye aktarılır, istenmezse aktarılmaz", async () => {
  const withCookie = () =>
    new Response("{}", { status: 200, headers: { "set-cookie": "cy_member_session=z; Path=/; HttpOnly" } });

  const passed = await forwardToApi(req(), {
    path: "/api/auth/login",
    method: "POST",
    body: "{}",
    passSetCookie: true,
    fetchImpl: fakeFetch([], withCookie()),
  });
  assert.match(passed.headers.get("set-cookie") ?? "", /cy_member_session=z/);

  const blocked = await forwardToApi(req(), {
    path: "/api/auth/account",
    fetchImpl: fakeFetch([], withCookie()),
  });
  assert.equal(blocked.headers.get("set-cookie"), null);
});

test("upstream'e ulaşılamazsa 502 proxy_error döner (teknik ayrıntı sızmaz)", async () => {
  const res = await forwardToApi(req(), {
    path: "/api/auth/account",
    cookie: true,
    fetchImpl: fakeFetch([], () => {
      throw new Error("ECONNRESET cicekyolla-api.onrender.com");
    }),
  });
  assert.equal(res.status, 502);
  const body = await res.text();
  assert.equal(body, JSON.stringify({ error: "proxy_error" }));
  assert.equal(body.includes("ECONNRESET"), false);
});

test("204 gövdesiz aktarılır; yanıt daima private/no-store", async () => {
  const res = await forwardToApi(req(), {
    path: "/api/auth/logout",
    method: "POST",
    cookie: true,
    fetchImpl: fakeFetch([], new Response(null, { status: 204 })),
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});

/*
 * OWN-RL-REG (E2E): API 429'u `Retry-After` ile döndürüyordu, fakat bu proxy
 * yanıt başlıklarını yalnız content-type + cache-control ile YENİDEN kurduğu
 * için başlık tarayıcıya hiç ulaşmıyordu (register, login, sıfırlama, telefon
 * doğrulama — hepsi bu yoldan geçer). DESIGN §3.A.8: "429 gövdesi + Retry-After".
 */
test("429: upstream Retry-After istemciye AYNEN aktarılır, gövde değişmez", async () => {
  const body = JSON.stringify({
    ok: false,
    error: "Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.",
  });
  const res = await forwardToApi(req({ "x-real-ip": "198.18.0.9" }), {
    path: "/api/auth/register",
    method: "POST",
    body: "{}",
    passSetCookie: true,
    fetchImpl: fakeFetch(
      [],
      new Response(body, {
        status: 429,
        headers: { "content-type": "application/json; charset=utf-8", "retry-after": "3187" },
      }),
    ),
  });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "3187");
  assert.equal(await res.text(), body);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});

test("Retry-After yoksa uydurulmaz; upstream'in diğer iç başlıkları sızmaz", async () => {
  const res = await forwardToApi(req(), {
    path: "/api/auth/login",
    method: "POST",
    body: "{}",
    fetchImpl: fakeFetch(
      [],
      new Response("{}", { status: 200, headers: { "x-powered-by": "Express", server: "render" } }),
    ),
  });
  assert.equal(res.headers.get("retry-after"), null);
  assert.equal(res.headers.get("x-powered-by"), null);
  assert.equal(res.headers.get("server"), null);
});

test("contentType verilirse upstream content-type SABİTLENİR (istemcininki kopyalanmaz)", async () => {
  const captured: Captured[] = [];
  await forwardToApi(req({ "content-type": "application/x-www-form-urlencoded" }), {
    path: "/api/public/marketing/unsubscribe/one-click",
    method: "POST",
    body: JSON.stringify({ t: "u1.1.abc" }),
    contentType: "application/json",
    fetchImpl: fakeFetch(captured, new Response("{}", { status: 200 })),
  });
  assert.equal(captured[0].init.headers["content-type"], "application/json");

  // Verilmezse bugünkü davranış: istemcinin başlığı gider.
  const legacy: Captured[] = [];
  await forwardToApi(req({ "content-type": "application/json; charset=utf-8" }), {
    path: "/api/auth/login",
    method: "POST",
    body: "{}",
    fetchImpl: fakeFetch(legacy, new Response("{}", { status: 200 })),
  });
  assert.equal(legacy[0].init.headers["content-type"], "application/json; charset=utf-8");
});
