import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AVIF_BREAK_EVEN_PX, DPR_BUCKETS, avifMediaFromSizes, parseSizes, pictureSources, type SizesSegment } from "./avifPolicy.ts";

const CARD = "(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw";
const LOCATION = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw";
const PDP = "(max-width:1024px) 100vw, 50vw";
const THUMB = "(max-width:640px) 100px, 180px";

// ── Yardımcılar: tarayıcı davranışının küçük simülasyonu ─────────────────────
function cssWidth(segs: SizesSegment[], viewport: number): number {
  for (const s of segs) {
    if (s.maxWidth == null || viewport <= s.maxWidth) return s.vw != null ? (viewport * s.vw) / 100 : (s.px ?? 0);
  }
  return 0;
}
/** Chrome: yoğunluğu DPR'yi karşılayan en küçük aday; yoksa en büyük. */
function webpCandidate(css: number, dpr: number): 400 | 800 | 1500 {
  for (const w of [400, 800, 1500] as const) if (w / css >= dpr) return w;
  return 1500;
}
/** Yalnız üretecin kendi grameri için media değerlendirici: "a and b, c and d". */
function mediaMatches(media: string, viewport: number, dpr: number): boolean {
  return media.split(",").some((clause) =>
    clause.split(" and ").every((cond) => {
      const m = /\((min-resolution|min-width|max-width):\s*([\d.]+)(dppx|px)\)/.exec(cond.trim());
      if (!m) throw new Error("beklenmeyen koşul: " + cond);
      const v = Number(m[2]);
      if (m[1] === "min-resolution") return dpr >= v;
      if (m[1] === "min-width") return viewport >= v;
      return viewport <= v;
    }),
  );
}

test("parseSizes: desteklenen gramer ve reddedilenler", () => {
  assert.deepEqual(parseSizes(CARD), [{ maxWidth: 640, vw: 50 }, { maxWidth: 1024, vw: 33 }, { vw: 25 }]);
  assert.deepEqual(parseSizes("160px"), [{ px: 160 }]);
  assert.deepEqual(parseSizes(THUMB), [{ maxWidth: 640, px: 100 }, { px: 180 }]);
  assert.equal(parseSizes(""), null);
  assert.equal(parseSizes(undefined), null);
  assert.equal(parseSizes("calc(100vw - 32px)"), null);
  assert.equal(parseSizes("(min-width:640px) 50vw, 25vw"), null);
  assert.equal(parseSizes("(max-width:640px) 50vw"), null, "son değer varsayılan olmalı");
  assert.equal(parseSizes("(max-width:1024px) 50vw, (max-width:640px) 100vw, 25vw"), null, "artan sıra");
});

test("küçük sabit px bağlamlarında AVIF hiç basılmaz (false)", () => {
  assert.equal(avifMediaFromSizes("160px"), false);
  assert.equal(avifMediaFromSizes("132px"), false);
  assert.equal(avifMediaFromSizes(THUMB), false);
});

test("ayrıştırılamayan sizes → undefined (bugünkü davranış korunur)", () => {
  assert.equal(avifMediaFromSizes(undefined), undefined);
  assert.equal(avifMediaFromSizes("calc(100vw - 32px)"), undefined);
});

test("PDP ana görsel: mobil yüksek DPR ve masaüstü DPR≥2 AVIF, masaüstü DPR1 WebP", () => {
  const media = avifMediaFromSizes(PDP);
  assert.equal(typeof media, "string");
  const m = media as string;
  assert.ok(mediaMatches(m, 412, 3), "412px DPR3 → 1236 px gerek → AVIF");
  assert.ok(mediaMatches(m, 412, 2), "412px DPR2 → 824 px → AVIF");
  assert.ok(!mediaMatches(m, 375, 2), "375px DPR2 → 750 px → 800w WebP");
  assert.ok(mediaMatches(m, 1440, 2), "masaüstü 50vw DPR2 → 1440 px → AVIF");
  assert.ok(!mediaMatches(m, 1440, 1), "masaüstü 50vw DPR1 → 720 px → 800w WebP");
  assert.ok(mediaMatches(m, 1700, 1), "çok geniş masaüstü DPR1 → 850 px → AVIF");
});

test("kart grid'i: yaygın mobil/masaüstü ekranlarda WebP, yalnız büyük yüksek-DPR'de AVIF", () => {
  const m = avifMediaFromSizes(CARD) as string;
  assert.equal(typeof m, "string");
  assert.ok(!mediaMatches(m, 412, 2.75), "412px DPR2.75 50vw → 567 px → 800w WebP");
  assert.ok(!mediaMatches(m, 360, 3), "360px DPR3 → 540 → 800w WebP");
  assert.ok(!mediaMatches(m, 1440, 1), "masaüstü DPR1 25vw → 360 → 400w WebP");
  assert.ok(!mediaMatches(m, 1440, 2), "masaüstü DPR2 → 720 → 800w WebP");
  assert.ok(mediaMatches(m, 600, 3), "600px DPR3 50vw → 900 px → AVIF");
});

test("ızgara simülasyonu: media eşleşiyorsa WebP adayı KESİN 1500w (hiçbir bağlam kötüleşmez); DPR basamaklarında eksiksiz", () => {
  for (const sizes of [CARD, LOCATION, PDP, "(max-width:1024px) 100vw, 360px", "(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw", "(max-width:640px) 50vw, 25vw"]) {
    const media = avifMediaFromSizes(sizes);
    const segs = parseSizes(sizes)!;
    if (media === false) continue;
    assert.equal(typeof media, "string", sizes);
    for (let viewport = 320; viewport <= 2560; viewport += 8) {
      for (const dpr of [1, 1.25, 1.5, 1.75, 2, 2.5, 2.75, 3, 3.5, 4]) {
        const css = cssWidth(segs, viewport);
        const cand = webpCandidate(css, dpr);
        const chosen = mediaMatches(media as string, viewport, dpr);
        if (chosen) assert.equal(cand, 1500, `${sizes} @ ${viewport}px DPR${dpr}: AVIF seçildi ama aday ${cand}w`);
        if (DPR_BUCKETS.includes(dpr) && css * dpr > AVIF_BREAK_EVEN_PX) assert.ok(chosen, `${sizes} @ ${viewport}px DPR${dpr}: AVIF kazanmalıydı`);
      }
    }
  }
});

test("pictureSources: üç mod", () => {
  const base = { avifSrc: "/r2/a.avif", webpSrcSet: "/r2/400.webp 400w, /r2/800.webp 800w", webpType: "image/webp", sizes: CARD };
  // undefined → bugünkü: AVIF önce, media yok
  assert.deepEqual(pictureSources(base), [
    { type: "image/avif", srcSet: "/r2/a.avif", sizes: CARD },
    { type: "image/webp", srcSet: base.webpSrcSet, sizes: CARD },
  ]);
  // false → AVIF yok
  assert.deepEqual(pictureSources({ ...base, avifMedia: false }), [{ type: "image/webp", srcSet: base.webpSrcSet, sizes: CARD }]);
  // string → AVIF media ile, yine önce
  const out = pictureSources({ ...base, avifMedia: "(min-resolution: 2dppx) and (min-width: 401px)" });
  assert.equal(out.length, 2);
  assert.equal(out[0].type, "image/avif");
  assert.equal(out[0].media, "(min-resolution: 2dppx) and (min-width: 401px)");
  assert.equal(out[1].media, undefined);
  // boş string media → koşulsuz
  assert.equal(pictureSources({ ...base, avifMedia: "  " })[0].media, undefined);
  // AVIF yoksa yalnız WebP; hiçbiri yoksa boş
  assert.equal(pictureSources({ ...base, avifSrc: null }).length, 1);
  assert.deepEqual(pictureSources({}), []);
});

test("çağıranlar: her ProductImage bağlamı avifMedia kararını taşır; ProductImage pictureSources kullanır", () => {
  const oku = (p: string) => readFileSync(p, "utf8");
  assert.match(oku("components/product/ProductImage.tsx"), /pictureSources\(/);
  assert.match(oku("components/product/ProductImage.tsx"), /avifMedia\?: string \| false/);
  const BEKLENEN: Array<[string, RegExp]> = [
    ["components/home/ProductCard.tsx", /avifMedia=\{CARD_AVIF_MEDIA\}/],
    ["components/location/LocationProducts.tsx", /avifMedia=\{LOCATION_AVIF_MEDIA\}/],
    ["components/product/ProductDetail.tsx", /avifMedia=\{PDP_MAIN_AVIF_MEDIA\}/],
    ["components/product/ProductDetail.tsx", /avifMedia=\{PDP_ITEM_AVIF_MEDIA\}/],
    ["app/urun/[slug]/page.tsx", /avifMedia=\{RELATED_AVIF_MEDIA\}/],
    ["app/teslimat/[city]/page.tsx", /avifMedia=\{CITY_CARD_AVIF_MEDIA\}/],
    ["components/global/v80/V80ProductCard.tsx", /avifMedia=\{V80_CARD_AVIF_MEDIA\}/],
    ["components/global/v80/V80Sections.tsx", /avifMedia=\{avifMediaFromSizes\(sizes\)\}/],
    ["app/sepet/page.tsx", /avifMedia=\{false\}/],
    ["components/checkout/AccountGate.tsx", /avifMedia=\{false\}/],
    ["components/checkout/CheckoutWizard.tsx", /avifMedia=\{false\}/],
  ];
  for (const [f, re] of BEKLENEN) assert.match(oku(f), re, f);
});
