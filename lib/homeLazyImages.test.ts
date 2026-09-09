import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Preload seli bekçisi (9 Eyl 2026, Adım 1): Next 14.2'nin React canary sürücüsü,
 * `loading="lazy"` olmayan ve <picture> dışındaki her <img> için SSR'da <head>'e
 * preload yazar. Ana sayfanın fold altı bileşenlerinde her <img>/<motion.img>
 * lazy kalmalı; hero (LCP) ise lazy OLMAMALI ve yüksek öncelikli kalmalı.
 */
const oku = (p: string) => readFileSync(p, "utf8");
const FOLD_ALTI = [
  "components/home/FloatingCategoryRail.tsx",
  "components/home/FeaturedCollections.tsx",
  "components/home/OccasionShopping.tsx",
  "components/home/EditorsPicks.tsx",
  "components/home/FeatureSplit.tsx",
  "components/home/BrandStory.tsx",
  "components/home/InstagramGallery.tsx",
  "components/home/WorkshopToday.tsx",
  "components/home/BlogRail.tsx",
  "components/home/CorporateReferences.tsx",
];

/** Yorumlardaki "<img>" metni (JSDoc blokları, satır yorumları, JSX yorumları) etiket sayılmaz. */
function yorumsuz(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function imgTags(src: string): string[] {
  const out: string[] = [];
  const kaynak = yorumsuz(src);
  const re = /<(?:motion\.)?img\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(kaynak))) {
    const end = kaynak.indexOf(">", m.index);
    out.push(kaynak.slice(m.index, end < 0 ? kaynak.length : end + 1));
  }
  return out;
}

test("fold altı ana sayfa bileşenlerinde her <img> loading=\"lazy\" taşır", () => {
  for (const f of FOLD_ALTI) {
    const tags = imgTags(oku(f));
    assert.ok(tags.length > 0, `${f}: <img> bulunamadı`);
    for (const t of tags) assert.match(t, /loading="lazy"/, `${f}: ${t.replace(/\s+/g, " ").slice(0, 120)}`);
  }
});

test("hero (LCP) lazy değil, yüksek öncelikli", () => {
  const tags = imgTags(oku("components/home/HomeHero.tsx"));
  assert.ok(tags.length >= 1);
  for (const t of tags) {
    assert.doesNotMatch(t, /loading="lazy"/, "hero lazy olamaz");
    assert.match(t, /fetchPriority="high"/);
  }
});
