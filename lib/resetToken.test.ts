import test from "node:test";
import assert from "node:assert/strict";
import {
  RESET_TOKEN_GLOBAL,
  extractResetToken,
  isPlausibleResetToken,
  resetTokenStripScript,
  takeResetToken,
  urlWithoutResetToken,
} from "./resetToken.ts";

const TOKEN = "Jd8-_kQ3zS1abcDEF456ghiJKL789mnoPQRs";

test("fragment biçimi okunur (#token=) — API RESET_LINK_FRAGMENT açıkken", () => {
  assert.equal(extractResetToken({ hash: `#token=${TOKEN}` }), TOKEN);
  assert.equal(extractResetToken({ hash: `#${TOKEN}` }), TOKEN);
});

test("query biçimi okunur (?token=) — bayrak kapalıyken bugünkü bağlantı", () => {
  assert.equal(extractResetToken({ search: `?token=${TOKEN}` }), TOKEN);
});

test("fragment query'den ÖNCE gelir (iki biçim birlikte gelirse)", () => {
  assert.equal(extractResetToken({ hash: `#token=${TOKEN}`, search: "?token=eskisi_gecersiz" }), TOKEN);
});

test("geçersiz/çöp token kabul edilmez", () => {
  for (const bad of ["", "kisa", "a".repeat(201), "abc def", "<script>", "../../etc/passwd"]) {
    assert.equal(isPlausibleResetToken(bad), false, `kabul edildi: ${bad}`);
    assert.equal(extractResetToken({ search: `?token=${encodeURIComponent(bad)}` }), null);
  }
});

test("token silinir, DİĞER parametreler korunur (atıf bozulmaz)", () => {
  assert.equal(
    urlWithoutResetToken({ pathname: "/sifre-belirle", search: `?token=${TOKEN}&utm_source=wa` }),
    "/sifre-belirle?utm_source=wa",
  );
  assert.equal(urlWithoutResetToken({ pathname: "/sifre-belirle", hash: `#token=${TOKEN}` }), "/sifre-belirle");
  assert.equal(
    urlWithoutResetToken({ pathname: "/sifre-belirle", hash: `#token=${TOKEN}&x=1` }),
    "/sifre-belirle#x=1",
  );
});

test("satır içi script token'ı global'e taşır ve adresi temizler", () => {
  // Script'i gerçekten çalıştır: sahte window/history/location ile.
  const state: { url: string } = { url: `/sifre-belirle?token=${TOKEN}&utm_source=wa` };
  const win: Record<string, unknown> = {
    location: { pathname: "/sifre-belirle", search: `?token=${TOKEN}&utm_source=wa`, hash: "" },
    history: { replaceState: (_a: unknown, _b: unknown, url: string) => { state.url = url; } },
    URLSearchParams,
  };
  const fn = new Function("window", "URLSearchParams", "history", `${resetTokenStripScript()}`);
  fn(win, URLSearchParams, win.history);
  assert.equal(win[RESET_TOKEN_GLOBAL], TOKEN);
  assert.equal(state.url, "/sifre-belirle?utm_source=wa");
});

test("takeResetToken: global okunur ve HEMEN silinir", () => {
  const win: Record<string, unknown> & { location?: { hash?: string; search?: string } } = {
    [RESET_TOKEN_GLOBAL]: TOKEN,
    location: { hash: "", search: "" },
  };
  assert.equal(takeResetToken(win), TOKEN);
  assert.equal(win[RESET_TOKEN_GLOBAL], undefined);
  assert.equal(takeResetToken(win), null);
});

test("takeResetToken: script çalışmadıysa URL'den okunur (yedek yol)", () => {
  const win = { location: { hash: `#token=${TOKEN}`, search: "" } } as Record<string, unknown> & {
    location: { hash: string; search: string };
  };
  assert.equal(takeResetToken(win), TOKEN);
});

test("satır içi script token yoksa adresi DEĞİŞTİRMEZ", () => {
  let called = false;
  const win: Record<string, unknown> = {
    location: { pathname: "/sifre-belirle", search: "", hash: "" },
    history: { replaceState: () => { called = true; } },
  };
  new Function("window", "URLSearchParams", "history", resetTokenStripScript())(win, URLSearchParams, win.history);
  assert.equal(called, false);
  assert.equal(win[RESET_TOKEN_GLOBAL], undefined);
});
