import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Kampanya banner'ı bekçisi (10 Eyl 2026, migration 090): banner YOKKEN hero
 * bugünkü davranışla birebir aynı kalmalı; VARKEN yalnız GÖRSEL değişmeli.
 * HomeHero client component olduğu için kaynak okunur (anasayfaH1 deseni).
 */
const oku = (p: string) => readFileSync(p, "utf8");
const hero = oku("components/home/HomeHero.tsx");
const sayfa = oku("app/page.tsx");
const renderer = oku("components/home/HomepageRenderer.tsx");

test("öncelik zinciri: banner > CMS hero görseli > kod içi varsayılan", () => {
  assert.match(hero, /const desktopImage = bannerImage \|\| cmsDesktop \|\| DEFAULT_HERO_IMAGE;/);
  // banner=null → prop varsayılanı; CMS kırılımları o zaman aynen okunur
  assert.match(hero, /banner = null/);
  assert.match(hero, /const tabletImage = hasBanner \? "" : mediaUrl\(config\.media\?\.tablet\?\.trim\(\)\);/);
  assert.match(hero, /const mobileImage = hasBanner \? "" : mediaUrl\(config\.media\?\.mobile\?\.trim\(\)\);/);
});

test("banner görseli yüklenemezse Unsplash'a değil CMS görseline düşer", () => {
  assert.match(hero, /const failedFallbackImage = hasBanner && cmsDesktop \? cmsDesktop : DEFAULT_HERO_IMAGE;/);
  assert.match(hero, /src=\{failedFallbackImage\}/);
});

test("LOCKED yapılar ve LCP ayarları yerinde (kampanya banner'ı görsel dışına dokunmaz)", () => {
  assert.match(hero, /minHeight: "82svh"/);
  assert.match(hero, /fetchPriority="high"/);
  assert.match(hero, /heroPreloadLinks\(\{ desktop: desktopImage, tablet: tabletImage, mobile: mobileImage \}\)/);
  // Banner başlık/CTA/rozet/cam kartı DEĞİŞTİRMEZ: yalnız görsel kaynağı seçilir.
  assert.match(hero, /Sevdiklerine<br \/>/);
  assert.match(hero, /Aynı Gün Teslimat<\/p>/);
});

test("iki render yolu da banner'ı alır: CMS'li (renderer ctx) ve CMS'siz fallback", () => {
  assert.match(renderer, /<HomeHero config=\{s\.config\} banner=\{ctx\.heroBanner \?\? null\} \/>/);
  assert.match(sayfa, /<HomeHero banner=\{heroBanner\} \/>/);
  assert.match(sayfa, /heroBanner \}\} \/>/, "renderer ctx'ine heroBanner geçilmeli");
  assert.match(sayfa, /getActiveHomepageBanner\(\)/);
});

test("banner okuması güvenli: hata/yok → null, ISR 60 sn (yayınla aynı)", () => {
  const lib = oku("lib/homepage.ts");
  const i = lib.indexOf("export async function getActiveHomepageBanner");
  assert.ok(i > 0);
  const govde = lib.slice(i, i + 700);
  assert.match(govde, /catch \{[\s\S]*?return null;/);
  assert.match(govde, /revalidate: 60/);
  assert.match(govde, /api\/public\/homepage\/banner/);
});
