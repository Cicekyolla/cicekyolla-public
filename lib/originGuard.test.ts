import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_HOSTS, foreignOriginHost, hostGuardScript, isForeignOriginWrite } from "./originGuard.ts";

function headers(map: Record<string, string>) {
  const lower = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

const PROD = "www.cicekyolla.com.tr";

test("ayna sitenin Origin'iyle gelen POST reddedilir", () => {
  const h = headers({ host: PROD, origin: "https://deeplyreverence.com" });
  assert.equal(isForeignOriginWrite("POST", h), true);
  assert.equal(foreignOriginHost("POST", h), "deeplyreverence.com");
});

test("resmî siteden gelen POST geçer (www ve çıplak alan adı)", () => {
  assert.equal(isForeignOriginWrite("POST", headers({ host: PROD, origin: `https://${PROD}` })), false);
  assert.equal(isForeignOriginWrite("POST", headers({ host: PROD, origin: "https://cicekyolla.com.tr" })), false);
});

test("preview ve localhost kendi alan adından geçer", () => {
  const preview = "cicekyolla-public-git-x-cicekyollas-projects.vercel.app";
  assert.equal(isForeignOriginWrite("POST", headers({ host: preview, origin: `https://${preview}` })), false);
  assert.equal(isForeignOriginWrite("POST", headers({ host: "localhost:3000", origin: "http://localhost:3000" })), false);
});

test("Origin'siz istek geçer (sunucudan sunucuya çağrı, ödeme geri bildirimi)", () => {
  assert.equal(isForeignOriginWrite("POST", headers({ host: PROD })), false);
});

test('Origin "null" veya bozuksa istek geçer (fail-open)', () => {
  assert.equal(isForeignOriginWrite("POST", headers({ host: PROD, origin: "null" })), false);
  assert.equal(isForeignOriginWrite("POST", headers({ host: PROD, origin: "::::" })), false);
});

test("okuma istekleri Origin'e bakılmadan geçer", () => {
  const h = headers({ host: PROD, origin: "https://deeplyreverence.com" });
  for (const method of ["GET", "HEAD", "OPTIONS", "get"]) assert.equal(isForeignOriginWrite(method, h), false);
});

test("PUT / PATCH / DELETE de yazma sayılır", () => {
  const h = headers({ host: PROD, origin: "https://evil.example" });
  for (const method of ["PUT", "PATCH", "DELETE"]) assert.equal(isForeignOriginWrite(method, h), true);
});

function runGuard(hostname: string, pathname = "/ru/istanbul/sisli", search = "?gclid=abc") {
  let target: string | null = null;
  const location = { hostname, pathname, search, replace: (url: string) => { target = url; } };
  new Function("location", hostGuardScript())(location);
  return target;
}

test("betikte resmî alan adı metin olarak geçmez (proxy metin değiştirmesine dayanıklı)", () => {
  const script = hostGuardScript();
  for (const host of CANONICAL_HOSTS) assert.equal(script.includes(host), false);
  assert.equal(script.includes("cicekyolla"), false);
});

test("resmî alan adlarında betik hiçbir şey yapmaz", () => {
  for (const host of CANONICAL_HOSTS) assert.equal(runGuard(host), null);
  assert.equal(runGuard("WWW.CICEKYOLLA.COM.TR"), null);
});

test("preview, localhost ve çeviri görüntüleyicide betik hiçbir şey yapmaz", () => {
  for (const host of ["localhost", "127.0.0.1", "cicekyolla-public.vercel.app", "x-y.vercel.app", "www-cicekyolla-com-tr.translate.goog"]) {
    assert.equal(runGuard(host), null);
  }
});

test("ayna alan adında ziyaretçi aynı yol + sorguyla resmî siteye taşınır", () => {
  assert.equal(runGuard("deeplyreverence.com"), "https://www.cicekyolla.com.tr/ru/istanbul/sisli?gclid=abc");
  assert.equal(runGuard("www.deeplyreverence.com", "/", ""), "https://www.cicekyolla.com.tr/");
});

test("location erişimi hata verirse betik sessizce çıkar (fail-open)", () => {
  const broken = { get hostname(): string { throw new Error("x"); } };
  assert.doesNotThrow(() => new Function("location", hostGuardScript())(broken));
});
