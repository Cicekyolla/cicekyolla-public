import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { computeSiteIndexable, PRODUCTION_HOST } from "./site-config.ts";

const require = createRequire(import.meta.url);
const nextConfig = require("../next.config.js");
const CANON = "https://www.cicekyolla.com.tr";
const hostMatches = (pattern: string, host: string) => new RegExp(`^${pattern}$`).test(host);

test("Vercel production + kanonik adres bugünkü gibi indekslenir (geriye uyum)", () => {
  assert.equal(computeSiteIndexable({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: CANON }), true);
  assert.equal(computeSiteIndexable({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: `${CANON}/` }), true);
});

test("Vercel preview/development indekslenmez", () => {
  assert.equal(computeSiteIndexable({ VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: CANON }), false);
  assert.equal(computeSiteIndexable({ VERCEL_ENV: "development", NEXT_PUBLIC_SITE_URL: CANON }), false);
});

test("Vercel dışı barındırma yalnız SITE_INDEXABLE=true ile indekslenir", () => {
  assert.equal(computeSiteIndexable({ SITE_INDEXABLE: "true", NEXT_PUBLIC_SITE_URL: CANON }), true);
  assert.equal(computeSiteIndexable({ SITE_INDEXABLE: " true ", NEXT_PUBLIC_SITE_URL: CANON }), true);
  assert.equal(computeSiteIndexable({ NEXT_PUBLIC_SITE_URL: CANON }), false);
  assert.equal(computeSiteIndexable({ SITE_INDEXABLE: "false", NEXT_PUBLIC_SITE_URL: CANON }), false);
  assert.equal(computeSiteIndexable({ SITE_INDEXABLE: "1", NEXT_PUBLIC_SITE_URL: CANON }), false);
});

test("Bayrak açık olsa da kanonik olmayan adres indekslenmez", () => {
  assert.equal(computeSiteIndexable({ SITE_INDEXABLE: "true", NEXT_PUBLIC_SITE_URL: "https://cicekyolla-public.skyversal.xyz" }), false);
  assert.equal(computeSiteIndexable({ SITE_INDEXABLE: "true", NEXT_PUBLIC_SITE_URL: "https://cicekyolla.com.tr" }), false);
  assert.equal(computeSiteIndexable({ SITE_INDEXABLE: "true" }), false);
});

test("next.config kanonik host'u site-config ile aynı", async () => {
  assert.equal(PRODUCTION_HOST, "www.cicekyolla.com.tr");
  const [rule] = await nextConfig.headers();
  assert.ok(hostMatches(rule.missing[0].value, PRODUCTION_HOST));
});

test("Kanonik olmayan her host'a noindex başlığı, kanonik host'a değil", async () => {
  const [rule] = await nextConfig.headers();
  assert.equal(rule.source, "/:path*");
  assert.deepEqual(rule.headers, [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]);
  const gets = (host: string) => !hostMatches(rule.missing[0].value, host);
  assert.equal(gets("www.cicekyolla.com.tr"), false);
  assert.equal(gets("cicekyolla-public.skyversal.xyz"), true);
  assert.equal(gets("cicekyolla-public.vercel.app"), true);
  assert.equal(gets("cicekyolla.com.tr"), true);
  assert.equal(gets("wwwXcicekyolla.com.tr"), true);
});

test("Apex 308 ile www'ye, yol korunarak yönlenir; www yönlenmez", async () => {
  const [rule] = await nextConfig.redirects();
  assert.equal(rule.source, "/:path*");
  assert.equal(rule.permanent, true);
  assert.equal(rule.destination, "https://www.cicekyolla.com.tr/:path*");
  assert.equal(hostMatches(rule.has[0].value, "cicekyolla.com.tr"), true);
  assert.equal(hostMatches(rule.has[0].value, "www.cicekyolla.com.tr"), false);
  assert.equal(hostMatches(rule.has[0].value, "cicekyolla-public.skyversal.xyz"), false);
});
