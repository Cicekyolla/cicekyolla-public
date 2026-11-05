// KAYNAK KORUMA: kişisel / işlem sayfaları index dışı; index'lenebilir statik sayfalar kendine canonical.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PRIVATE_ROUTES, PRIVATE_ROUTE_ROBOTS, SELF_CANONICAL_STATIC_ROUTES } from "./privateRoutes.ts";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

test("PRIVATE_ROUTE_ROBOTS: index ve follow kapalı", () => {
  assert.deepEqual(PRIVATE_ROUTE_ROBOTS, { index: false, follow: false });
});

test("KAYNAK: her kişisel / işlem rotası robots kararını PRIVATE_ROUTE_ROBOTS'tan alır (sayfada ya da en yakın layout'ta)", () => {
  for (const route of PRIVATE_ROUTES) {
    const segments = route.split("/").filter(Boolean);
    // Rotanın kendi page.tsx'i ya da kökten o segmente kadar herhangi bir layout.tsx kararı taşıyabilir.
    const candidates = [`app/${segments.join("/")}/page.tsx`];
    for (let i = segments.length; i >= 1; i--) candidates.push(`app/${segments.slice(0, i).join("/")}/layout.tsx`);
    const carrier = candidates.find((rel) => exists(rel) && /robots:\s*PRIVATE_ROUTE_ROBOTS/.test(read(rel)));
    assert.ok(carrier, `${route}: robots kararı bulunamadı (${candidates.join(", ")})`);
    assert.ok(exists(`app/${segments.join("/")}/page.tsx`), `${route}: rota dosyası yok (liste bayat)`);
  }
});

test("KAYNAK: yeni eklenen layout'lar çocukları AYNEN döndürür (akışa dokunmaz)", () => {
  for (const rel of ["app/checkout/layout.tsx", "app/hesabim/layout.tsx", "app/siparis-takip/layout.tsx"]) {
    const src = read(rel);
    assert.match(src, /return children;/, rel);
    // C7 (6 Kas 2026): /checkout kabuğu /sepet gibi YALNIZ `cy_lang` çerezini okur (dil); TR'de çocuklar aynen.
    const izinli = rel === "app/checkout/layout.tsx" ? /"use client"|fetch\(|headers\(/ : /"use client"|fetch\(|cookies\(|headers\(/;
    assert.doesNotMatch(src, izinli, `${rel}: yalnız metadata + geçiş olmalı`);
  }
  const co = read("app/checkout/layout.tsx");
  assert.equal((co.match(/cookies\(\)/g) ?? []).length, 1, "checkout: tek çerez okuması");
  assert.match(co, /cookies\(\)\.get\(LANG_COOKIE\)/, "checkout: yalnız dil çerezi");
});

test("KAYNAK: index'lenebilir statik sayfalar KENDİ yolunu canonical verir ve index dışı bırakılmaz", () => {
  for (const route of SELF_CANONICAL_STATIC_ROUTES) {
    const src = read(`app${route}/page.tsx`);
    const m = /alternates:\s*\{\s*canonical:\s*"([^"]+)"\s*\}/.exec(src);
    assert.ok(m, `${route}: canonical yok`);
    assert.equal(m![1], route, `${route}: canonical kendi yolu olmalı`);
    assert.doesNotMatch(src, /PRIVATE_ROUTE_ROBOTS/, `${route}: index'lenebilir sayfa index dışına alınmamalı`);
  }
});

test("iki liste ayrık: bir rota hem index dışı hem canonical'lı statik sayfa olamaz", () => {
  const priv = new Set<string>(PRIVATE_ROUTES);
  for (const route of SELF_CANONICAL_STATIC_ROUTES) assert.equal(priv.has(route), false, route);
});
