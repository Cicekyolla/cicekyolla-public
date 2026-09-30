import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ONE_CLICK_API_PATH,
  PREFERENCE_PAGE_PATH,
  PREFERENCE_TEXT,
  UNSUBSCRIBE_API_PATH,
  UNSUBSCRIBE_TOKEN_GLOBAL,
  extractUnsubscribeToken,
  isPlausibleUnsubscribeToken,
  oneClickToken,
  preferencePageLocation,
  preferencePageView,
  takeUnsubscribeToken,
  tokenFromPageBody,
  unsubscribeResultView,
  unsubscribeTokenStripScript,
  unsubscribeUpstreamBody,
  urlWithoutUnsubscribeToken,
  viewApiPath,
} from "./emailPreferences.ts";

/*
 * BU DOSYANIN SEBEBİ (E2E S26 / CMP-UNS): API her kampanya postasına
 *   List-Unsubscribe: <https://www…/api/email-preferences/one-click?t=JETON>, <…/e-posta-tercihleri#t=JETON>
 * koyuyordu, fakat public uygulamada ne tek tık route'u ne de sayfa vardı:
 * Gmail/Yahoo'nun RFC 8058 POST'u 404 alıyor, üye listede kalıyordu.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = "u1.42.AbCdEfGhIjKlMnOpQrStUvWxYz012345";

test("sözleşme: API yolları ve public route/sayfa dosyaları mevcut (mail başlığındaki adresler 404 değil)", () => {
  assert.equal(ONE_CLICK_API_PATH, "/api/public/marketing/unsubscribe/one-click");
  assert.equal(UNSUBSCRIBE_API_PATH, "/api/public/marketing/unsubscribe");
  assert.equal(PREFERENCE_PAGE_PATH, "/e-posta-tercihleri");
  for (const rel of [
    "app/api/email-preferences/one-click/route.ts",
    "app/api/email-preferences/route.ts",
    "app/e-posta-tercihleri/page.tsx",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `eksik: ${rel}`);
  }
  const oneClick = readFileSync(join(ROOT, "app/api/email-preferences/one-click/route.ts"), "utf8");
  assert.match(oneClick, /export async function POST/);
  assert.match(oneClick, /ONE_CLICK_API_PATH/);
  // Tek tık gövdesi form'dur; API'ye JSON gider → content-type SABİTLENMELİ.
  assert.match(oneClick, /contentType:\s*"application\/json"/);
  // Çıkış jetonla yapılır; üye çerezi iletilmez.
  assert.doesNotMatch(oneClick, /cookie:\s*true/);
});

test("RFC 8058: sağlayıcının POST'unda jeton SORGU DİZESİNDEN okunur (gövde yalnız List-Unsubscribe=One-Click)", () => {
  const token = oneClickToken({
    url: `https://www.cicekyolla.com.tr/api/email-preferences/one-click?t=${encodeURIComponent(TOKEN)}`,
    body: "List-Unsubscribe=One-Click",
    contentType: "application/x-www-form-urlencoded",
  });
  assert.equal(token, TOKEN);
  assert.equal(unsubscribeUpstreamBody(token), JSON.stringify({ t: TOKEN }));
});

test("yedek: jeton form gövdesinde ya da JSON gövdede olabilir; hiç yoksa boş dize → `{}` (API geçersiz deneme sayar)", () => {
  assert.equal(
    oneClickToken({ url: "/api/email-preferences/one-click", body: `t=${TOKEN}`, contentType: "application/x-www-form-urlencoded" }),
    TOKEN,
  );
  assert.equal(
    oneClickToken({ url: "/api/email-preferences/one-click", body: JSON.stringify({ token: TOKEN }), contentType: "application/json" }),
    TOKEN,
  );
  const none = oneClickToken({ url: "/api/email-preferences/one-click", body: "List-Unsubscribe=One-Click", contentType: null });
  assert.equal(none, "");
  assert.equal(unsubscribeUpstreamBody(none), "{}");
});

test("çöp/uzun/enjeksiyon değerleri jeton sayılmaz", () => {
  for (const bad of ["", "kisa", "a".repeat(201), "u1.1.abc def", "<script>", "u1.1.x&admin=1", null, 42]) {
    assert.equal(isPlausibleUnsubscribeToken(bad), false, `kabul edildi: ${String(bad)}`);
  }
  assert.equal(isPlausibleUnsubscribeToken(TOKEN), true);
});

test("sayfa: #t= birincil, ?t= yedek; temizlenen adres diğer parametreleri korur", () => {
  assert.equal(extractUnsubscribeToken({ hash: `#t=${TOKEN}` }), TOKEN);
  assert.equal(extractUnsubscribeToken({ search: `?utm_source=x&t=${TOKEN}` }), TOKEN);
  assert.equal(extractUnsubscribeToken({ hash: "#t=kisa" }), null);
  assert.equal(extractUnsubscribeToken({}), null);
  assert.equal(
    urlWithoutUnsubscribeToken({ pathname: "/e-posta-tercihleri", search: "?utm_source=mail&t=x", hash: `#t=${TOKEN}` }),
    "/e-posta-tercihleri?utm_source=mail",
  );
});

test("satır içi script: jetonu global'e taşır ve adres çubuğundan siler; global okununca silinir", () => {
  const replaced: string[] = [];
  const win: Record<string, unknown> = {
    location: { pathname: "/e-posta-tercihleri", search: "?utm_source=mail", hash: `#t=${TOKEN}` },
  };
  const history = { replaceState: (_a: unknown, _b: unknown, url: string) => replaced.push(url) };
  new Function("window", "history", "URLSearchParams", unsubscribeTokenStripScript())(win, history, URLSearchParams);
  assert.equal(win[UNSUBSCRIBE_TOKEN_GLOBAL], TOKEN);
  assert.deepEqual(replaced, ["/e-posta-tercihleri?utm_source=mail"]);
  assert.equal(takeUnsubscribeToken(win), TOKEN);
  assert.equal(win[UNSUBSCRIBE_TOKEN_GLOBAL], undefined);
});

test("GET yolları: okuma ucu jetonu kodlanmış iletir; tek tık GET'i insan sayfasına FRAGMENT ile gider", () => {
  assert.equal(viewApiPath(TOKEN), `/api/public/marketing/unsubscribe?t=${encodeURIComponent(TOKEN)}`);
  assert.equal(viewApiPath("x&admin=1"), "/api/public/marketing/unsubscribe?t=");
  assert.equal(preferencePageLocation(TOKEN), `/e-posta-tercihleri#t=${encodeURIComponent(TOKEN)}`);
  assert.equal(preferencePageLocation(null), "/e-posta-tercihleri");
  assert.equal(tokenFromPageBody(JSON.stringify({ t: TOKEN, status: "granted" })), TOKEN);
  assert.equal(tokenFromPageBody("çöp"), "");
});

test("tek tık GET'i hiçbir şey YAZMAZ: API'ye istek atmadan 303 ile sayfaya yönlendirir", async () => {
  const src = readFileSync(join(ROOT, "app/api/email-preferences/one-click/route.ts"), "utf8");
  const get = src.slice(src.indexOf("export async function GET"));
  assert.doesNotMatch(get, /forwardToApi/);
  assert.match(get, /status:\s*303/);
});

test("sayfa görünümü: karar sunucunun valid / already_withdrawn alanlarından", () => {
  assert.equal(preferencePageView(null, 0, null).state, "missing");
  assert.equal(preferencePageView(TOKEN, 200, { ok: true, unsubscribe: { valid: false } }).state, "invalid");
  const active = preferencePageView(TOKEN, 200, {
    ok: true,
    unsubscribe: { valid: true, status: "granted", status_label: "İzin verildi", masked_email: "e2***@local.test", already_withdrawn: false },
  });
  assert.deepEqual(active, {
    state: "active",
    title: PREFERENCE_TEXT.activeTitle,
    message: PREFERENCE_TEXT.active,
    maskedEmail: "e2***@local.test",
    statusLabel: "İzin verildi",
  });
  const already = preferencePageView(TOKEN, 200, {
    ok: true,
    unsubscribe: { valid: true, status: "withdrawn", status_label: "İzin geri çekildi", masked_email: "e***@x.com", already_withdrawn: true },
  });
  assert.equal(already.state, "done");
  assert.equal(already.title, PREFERENCE_TEXT.alreadyTitle);
  const limited = preferencePageView(TOKEN, 429, { ok: false, error: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.", code: "rate_limited" });
  assert.equal(limited.state, "error");
  assert.match(limited.message, /Çok fazla deneme/);
  // Teknik kod ekrana basılmaz.
  assert.equal(preferencePageView(TOKEN, 502, { error: "proxy_error" }).message, PREFERENCE_TEXT.error);
});

test("çıkış sonucu: 200 → tamam; tekrar (already) da başarı; 400 → geçersiz bağlantı", () => {
  const done = unsubscribeResultView(200, {
    ok: true,
    unsubscribe: { ok: true, already: false, status: "withdrawn", status_label: "İzin geri çekildi", masked_email: "e***@x.com" },
  });
  assert.equal(done.state, "done");
  assert.equal(done.title, PREFERENCE_TEXT.doneTitle);
  const again = unsubscribeResultView(200, {
    ok: true,
    unsubscribe: { ok: true, already: true, status: "withdrawn", status_label: "İzin geri çekildi", masked_email: "e***@x.com" },
  });
  assert.equal(again.title, PREFERENCE_TEXT.alreadyTitle);
  const invalid = unsubscribeResultView(400, { ok: false, error: "Bağlantı geçersiz. Lütfen e-postadaki bağlantıyı yeniden kullanın.", code: "link_invalid" });
  assert.equal(invalid.state, "invalid");
  assert.match(invalid.message, /Bağlantı geçersiz/);
  // Gövde "withdrawn" demiyorsa başarı UYDURULMAZ.
  assert.equal(unsubscribeResultView(200, { ok: true }).state, "error");
  assert.equal(
    unsubscribeResultView(200, { ok: true, unsubscribe: { ok: true, already: false, status: "granted", status_label: "İzin verildi" } }).state,
    "error",
  );
});

test("kampanyadan çıkan kişiye pazarlama popup'ı gösterilmez", () => {
  const src = readFileSync(join(ROOT, "components/consent/ConsentManager.tsx"), "utf8");
  const list = src.slice(src.indexOf("export const MARKETING_BLOCKED_PATHS"), src.indexOf("];", src.indexOf("export const MARKETING_BLOCKED_PATHS")));
  assert.match(list, /"\/e-posta-tercihleri"/);
});

test("sayfa başlıkları: no-referrer + no-store + noindex (next.config.js)", () => {
  const src = readFileSync(join(ROOT, "next.config.js"), "utf8");
  const block = src.slice(src.indexOf('source: "/e-posta-tercihleri"'));
  assert.ok(src.includes('source: "/e-posta-tercihleri"'), "başlık bloğu yok");
  assert.match(block.slice(0, 400), /Referrer-Policy", value: "no-referrer"/);
  assert.match(block.slice(0, 400), /no-store/);
  assert.match(block.slice(0, 400), /noindex/);
});
