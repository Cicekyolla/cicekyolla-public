// GLOBAL VERSION 80 — banner bölümü (structure.banners) sözleşme, çözümleyici ve kaynak koruma testleri.
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as V80Schema from "./global/v80/schema.ts";
import {
  parseStorefrontConfig, parseBanners, defaultStructure, defaultConfig, safeImageOrNull, bannerTextKey, parseTexts,
  V80_SECTION_IDS, V80_MAX_BANNERS, V80_BANNER_KEY_RE, V80_BANNER_TEXT_FIELDS,
} from "./global/v80/schema.ts";
import { mergedTexts } from "./global/v80/copy.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";
import { resolveV80, type V80SourceCategory } from "./global/v80/view.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const C = (slug: string, live: number): V80SourceCategory => ({ slug, name: slug.toUpperCase(), live_products: live, min_price_minor: 1, image: null });

test("banners bölüm id'si hero'nun hemen ardından; varsayılan yapıda açık ve liste boş", () => {
  assert.equal(V80_SECTION_IDS[0], "hero");
  assert.equal(V80_SECTION_IDS[1], "banners");
  const d = defaultStructure();
  assert.deepEqual(d.sections.slice(0, 2), [{ id: "hero", enabled: true }, { id: "banners", enabled: true }]);
  assert.deepEqual(d.banners, []);
  assert.equal(new Set(V80_SECTION_IDS).size, V80_SECTION_IDS.length, "bölüm id'leri tekil");
});

test("eski (v1) belge: kayıtlı sırada banners yoksa hero'nun HEMEN ardına eklenir (açık; DESIGN-FIX F3); banner yoksa görünüm boş", () => {
  const old = V80_SECTION_IDS.filter((id) => id !== "banners").map((id) => ({ id, enabled: id !== "ticker" }));
  const c = parseStorefrontConfig(JSON.stringify({ v: 1, structure: { sections: old } }))!;
  const ids = c.structure.sections.map((s) => s.id);
  assert.deepEqual(ids, [...V80_SECTION_IDS], "hero → banners → kayıtlı sıranın geri kalanı");
  assert.deepEqual(c.structure.sections[1], { id: "banners", enabled: true });
  assert.notEqual(ids[ids.length - 1], "banners", "artık sona eklenmez");
  assert.equal(c.structure.sections.find((s) => s.id === "ticker")?.enabled, false, "kayıtlı görünürlük korunur");
  const v = resolveV80({ locale: "en", config: c, home: null, products: [], categories: [], livePages: new Set() });
  assert.deepEqual(v.sections.slice(0, 3), ["hero", "banners", "discovery"], "kapalı ticker görünümde yok; banners hero'nun ardında");
  assert.deepEqual(v.banners, [], "banner yok → bölüm hiçbir şey basmaz");
});

// ── DESIGN-FIX F3 ortak fikstürleri ─────────────────────────────────────────────────────────────
// Admin deposundaki src/app/lib/globalStorefrontSchema.test.ts içinde BİREBİR AYNI fikstürler ve
// beklentiler vardır (iki ayrıştırıcı aynı davranmalı). Değiştirirken ikisini birlikte güncelle.
// Beklenti yalnız BİLİNEN bölüm id'leri üzerinden yazılır: admin bilinmeyen güvenli id'yi yerinde
// korur, public atar; bilinen id'lerin sırası/görünürlüğü iki tarafta aynıdır.
type F3Fixture = { name: string; sections: unknown[]; expect: [string, boolean][] };
const F3_REST = (skip: string[]): [string, boolean][] =>
  ["hero", "banners", "ticker", "discovery", "shop", "categories", "delivery", "collections", "mood", "card", "destinations", "journey", "reviews", "cta", "trust", "content"]
    .filter((id) => !skip.includes(id))
    .map((id) => [id, true]);
const F3_FIXTURES: F3Fixture[] = [
  {
    name: "v1 tam liste (banners yok, ticker kapalı) → hero'nun hemen ardına",
    sections: [{ id: "hero", enabled: true }, { id: "ticker", enabled: false }, { id: "discovery" }, { id: "shop" }, { id: "categories" }, { id: "delivery" }, { id: "collections" }, { id: "mood" }, { id: "card" }, { id: "destinations" }, { id: "journey" }, { id: "reviews" }, { id: "cta" }, { id: "trust" }, { id: "content" }],
    expect: [["hero", true], ["banners", true], ["ticker", false], ...F3_REST(["hero", "banners", "ticker"])],
  },
  {
    name: "hero ortada ve kapalı; geçersiz öğeler atlanır → banners hero'nun ardına, diğer eksikler sona",
    sections: [{ id: "shop", enabled: false }, { id: "Bad Id!" }, "bozuk", null, { id: "hero", enabled: false }, { id: "ticker" }],
    expect: [["shop", false], ["hero", false], ["banners", true], ["ticker", true], ...F3_REST(["shop", "hero", "banners", "ticker"])],
  },
  {
    name: "kayıtta hero yok → banners başa; hero diğer eksiklerle sona",
    sections: [{ id: "shop" }, { id: "ticker", enabled: false }],
    expect: [["banners", true], ["shop", true], ["ticker", false], ...F3_REST(["banners", "shop", "ticker"])],
  },
  {
    name: "boş dizi (hero yok) → banners başa, kalanlar varsayılan sırayla",
    sections: [],
    expect: [["banners", true], ...F3_REST(["banners"])],
  },
  {
    name: "banners kayıtlı (sonda, kapalı) → operatörün yeri ve görünürlüğü aynen (↑/↓ korunur)",
    sections: [{ id: "hero" }, { id: "shop" }, { id: "banners", enabled: false }],
    expect: [["hero", true], ["shop", true], ["banners", false], ...F3_REST(["hero", "shop", "banners"])],
  },
  {
    name: "tekrarlı hero ilk kayıttan; hero'nun ardındaki bilinmeyen güvenli id sıralamayı bozmaz",
    sections: [{ id: "ticker" }, { id: "hero" }, { id: "story_v3", enabled: false }, { id: "hero", enabled: false }, { id: "content", enabled: false }],
    expect: [["ticker", true], ["hero", true], ["banners", true], ["content", false], ...F3_REST(["ticker", "hero", "banners", "content"])],
  },
];

test("DESIGN-FIX F3: eksik banners hero'nun hemen ardına (hero yoksa başa), açık; diğer eksikler sona — ortak fikstürler", () => {
  for (const f of F3_FIXTURES) {
    const c = parseStorefrontConfig(JSON.stringify({ v: 1, structure: { sections: f.sections } }))!;
    const known = c.structure.sections.filter((s) => (V80_SECTION_IDS as readonly string[]).includes(s.id)).map((s) => [s.id, s.enabled]);
    assert.deepEqual(known, f.expect, f.name);
    assert.equal(c.structure.sections.length, V80_SECTION_IDS.length, `${f.name}: her bilinen bölüm tam bir kez`);
    // Yuvarlak tur: ilk ayrıştırmadan sonra banners kayıtlıdır → ikinci tur yerini DEĞİŞTİRMEZ.
    const again = parseStorefrontConfig(JSON.stringify(c))!;
    assert.deepEqual(again.structure.sections, c.structure.sections, `${f.name}: yuvarlak tur sabit`);
  }
  // Yapı dizisi yok/geçersiz → varsayılan (hero, banners, …) — değişmedi.
  assert.deepEqual(parseStorefrontConfig(JSON.stringify({ structure: { sections: "nope" } }))!.structure.sections, defaultStructure().sections);
  assert.deepEqual(parseStorefrontConfig("{}")!.structure.sections.map((s) => s.id), [...V80_SECTION_IDS]);
});

test("DESIGN-FIX F3: admin ↑/↓ sonrası kayıt — banners operatörün koyduğu yerde kalır (ayrıştırıcı yeniden hero'nun ardına TAŞIMAZ; admin testiyle aynı)", () => {
  // v1 belgesi → F3 ile hero'nun ardına girer → operatör ↓ ile sona taşır ve kapatır → kaydet → yeniden oku.
  const cfg = parseStorefrontConfig(JSON.stringify({ v: 1, structure: { sections: V80_SECTION_IDS.filter((id) => id !== "banners").map((id) => ({ id, enabled: true })) } }))!;
  assert.deepEqual(cfg.structure.sections[1], { id: "banners", enabled: true });
  const moved = cfg.structure.sections.filter((x) => x.id !== "banners").concat({ id: "banners", enabled: false });
  const saved = parseStorefrontConfig(JSON.stringify({ v: 2, structure: { ...cfg.structure, sections: moved }, texts: {} }))!;
  assert.deepEqual(saved.structure.sections, moved, "operatör sırası/görünürlüğü aynen");
  // Başa taşıma (hero'dan önce) da korunur.
  const first = [{ id: "banners" as const, enabled: true }, ...cfg.structure.sections.filter((x) => x.id !== "banners")];
  assert.deepEqual(parseStorefrontConfig(JSON.stringify({ v: 2, structure: { ...cfg.structure, sections: first }, texts: {} }))!.structure.sections, first);
});

test("parseBanners: anahtar kuralı (küçük harf/rakam/_/-, en çok 40), tekrar atılır, en çok 12, aktif varsayılanı true", () => {
  assert.ok(V80_BANNER_KEY_RE.test("yaz_2026-a"));
  assert.ok(!V80_BANNER_KEY_RE.test("Yaz"), "büyük harf yok (metin anahtarı parçası)");
  const list = parseBanners([
    { key: "a", image: "/a.jpg" },
    { key: "a", image: "/tekrar.jpg" },
    { key: "Buyuk", image: "/x.jpg" },
    { key: "bosluk var", image: "/x.jpg" },
    { key: "x".repeat(41), image: "/x.jpg" },
    { image: "/anahtarsiz.jpg" },
    "metin",
    null,
    { key: "b", image: "/b.jpg", enabled: false, target: { kind: "anchor", id: "shop" } },
  ]);
  assert.deepEqual(list.map((b) => b.key), ["a", "b"]);
  assert.equal(list[0].image, "/a.jpg");
  assert.equal(list[0].enabled, true);
  assert.deepEqual(list[0].target, { kind: "none" });
  assert.equal(list[1].enabled, false);
  assert.deepEqual(list[1].target, { kind: "anchor", id: "shop" });
  const many = parseBanners(Array.from({ length: 15 }, (_, i) => ({ key: `b${i}`, image: `/b${i}.jpg` })));
  assert.equal(V80_MAX_BANNERS, 12);
  assert.equal(many.length, 12);
  assert.deepEqual(many.map((b) => b.key), Array.from({ length: 12 }, (_, i) => `b${i}`), "ilk 12 geçerli öğe, sıra korunur");
  assert.deepEqual(parseBanners("değil"), []);
  assert.deepEqual(parseBanners(undefined), []);
});

test("banner görselleri güvenli: yalnız göreli /yol ya da https://; diğer her şey null", () => {
  const ok = ["/global/v80/b.jpg", "/r2/1700-homepage-banner.webp", "/uploads/a_b.jpg", "https://cdn.example.com/a.jpg", "  /trim.jpg  "];
  for (const v of ok) assert.equal(safeImageOrNull(v), v.trim(), `kabul: ${v}`);
  const bad = ["javascript:alert(1)", "data:image/png;base64,AAAA", "http://example.com/a.jpg", "//evil.example/a.jpg", "/\\evil.example/a.jpg", "/", "a.jpg", "https://a b.jpg", "", "   ", 42, null, undefined, {}];
  for (const v of bad) assert.equal(safeImageOrNull(v), null, `ret: ${String(v)}`);
  const [b] = parseBanners([{ key: "k", image: "javascript:alert(1)", imageMobile: "https://cdn.example.com/m.jpg" }]);
  assert.equal(b.image, null, "güvensiz masaüstü görsel null → banner basılmaz");
  assert.equal(b.imageMobile, "https://cdn.example.com/m.jpg");
});

test("banner dil metinleri x.banner.<key>.title|body|cta|alt: texts ayrıştırıcısı ve mergedTexts kabul eder", () => {
  assert.deepEqual([...V80_BANNER_TEXT_FIELDS], ["title", "body", "cta", "alt"]);
  const longKey = "k".repeat(40);
  assert.equal(bannerTextKey(longKey, "title"), `x.banner.${longKey}.title`);
  const texts = parseTexts({ [bannerTextKey(longKey, "title")]: "Başlık", [bannerTextKey("yaz", "alt")]: " Yaz " });
  assert.equal(texts[bannerTextKey(longKey, "title")], "Başlık", "en uzun anahtar 80 karakter sınırına sığar");
  const m = mergedTexts("de", texts);
  assert.equal(m["x.banner.yaz.alt"], "Yaz");
});

test("resolveV80: yalnız aktif + görselli bannerlar dizi sırasıyla; metinler ve hedefler o dilde çözülür", () => {
  const cfg = defaultConfig();
  cfg.structure.banners = parseBanners([
    { key: "kis", image: "/kis.jpg", imageMobile: "/kis-m.jpg", target: { kind: "category", ref: { id: 1, tr_slug: "guller", slugs: { de: "rosen" } } } },
    { key: "pasif", image: "/p.jpg", enabled: false },
    { key: "gorselsiz", image: null },
    { key: "yaz", image: "https://cdn.example.com/yaz.jpg", target: { kind: "anchor", id: "shop" } },
    { key: "olu", image: "/o.jpg", target: { kind: "category", ref: { id: 2, tr_slug: "orkide", slugs: { de: "orchideen" } } } },
  ]);
  cfg.texts = {
    "x.banner.kis.title": "Winterzauber", "x.banner.kis.body": "Frische Rosen", "x.banner.kis.cta": "Entdecken", "x.banner.kis.alt": "Rosenstrauß",
    "x.banner.yaz.alt": "Sommer",
  };
  const v = resolveV80({ locale: "de", config: cfg, home: null, products: [], categories: [C("rosen", 4)], livePages: new Set() });
  assert.deepEqual(v.banners.map((b) => b.key), ["kis", "yaz", "olu"]);
  assert.deepEqual(v.banners[0], {
    key: "kis", image: "/kis.jpg", imageMobile: "/kis-m.jpg", href: "/de/kategorie/rosen",
    title: "Winterzauber", body: "Frische Rosen", cta: "Entdecken", alt: "Rosenstrauß",
  });
  assert.deepEqual(v.banners[1], { key: "yaz", image: "https://cdn.example.com/yaz.jpg", imageMobile: null, href: "#shop", title: "", body: "", cta: "", alt: "Sommer" });
  assert.equal(v.banners[2].href, null, "o dilde canlı olmayan kategori hedefi bağlantısız (yalnız görsel)");
  // Metin dil başına (her dil satırının kendi texts'i): o dilde metin yoksa boş başlık → yalnız görsel + bağlantı.
  const en = resolveV80({ locale: "en", config: { ...cfg, texts: {} }, home: null, products: [], categories: [], livePages: new Set() });
  assert.deepEqual(en.banners.map((b) => [b.key, b.title, b.alt]), [["kis", "", ""], ["yaz", "", ""], ["olu", "", ""]]);
  // Hedef gizli bölüm (#shop kapalı) → bağlantısız.
  cfg.structure.sections = cfg.structure.sections.map((s) => (s.id === "shop" ? { ...s, enabled: false } : s));
  const hidden = resolveV80({ locale: "de", config: cfg, home: null, products: [], categories: [C("rosen", 4)], livePages: new Set() });
  assert.equal(hidden.banners.find((b) => b.key === "yaz")?.href, null);
});

// ── Gerçek sunucu çıktısı (SSR) korumaları ────────────────────────────────────────────────────────
// node:test TSX çalıştıramaz; bileşen kaynağı mevcut `typescript` devDependency'si ile (yeni kütüphane
// YOK) CommonJS'e çevrilir ve react-dom/server ile basılır. next/image ve next/link sade saplamadır;
// V80Page testinde diğer bölüm bileşenleri <section data-stub="Ad"> saplamasıdır, V80Banners GERÇEKTİR.
const req = createRequire(import.meta.url);
const React = req("react") as typeof import("react");
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const h = React.createElement;

function loadTsx(rel: string, resolve: (id: string) => unknown): Record<string, unknown> {
  const js = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const localRequire = (id: string) => {
    const m = resolve(id);
    if (m === undefined) throw new Error(`beklenmeyen import: ${id}`);
    return m;
  };
  new Function("require", "module", "exports", js)(localRequire, mod, mod.exports);
  return mod.exports;
}

const nextImageStub = {
  __esModule: true,
  default: (p: { src: string; alt: string; className?: string }) => h("img", { src: p.src, alt: p.alt, className: p.className }),
  getImageProps: (p: { src: string; alt: string; className?: string }) => ({ props: { src: p.src, alt: p.alt, className: p.className } }),
};
const nextLinkStub = {
  __esModule: true,
  // aria-label de aktarılır (gerçek next/link tüm <a> niteliklerini geçirir; UX-10 testleri buna bakar).
  default: (p: { href: string; className?: string; children?: React.ReactNode; "aria-label"?: string; "data-banner-key"?: string }) =>
    h("a", { href: p.href, className: p.className, "aria-label": p["aria-label"], "data-banner-key": p["data-banner-key"] }, p.children),
};
const bannersModule = loadTsx("../components/global/v80/V80Banners.tsx", (id) =>
  ({ "react/jsx-runtime": req("react/jsx-runtime"), "next/image": nextImageStub, "next/link": nextLinkStub, "@/lib/global/v80/schema": V80Schema } as Record<string, unknown>)[id],
);
const sectionStubCache = new Map<string, React.FunctionComponent>();
const sectionStubs = new Proxy({} as Record<string, unknown>, {
  get: (_t, name) => {
    if (name === "__esModule") return true;
    const key = String(name);
    if (!sectionStubCache.has(key)) sectionStubCache.set(key, () => h("section", { "data-stub": key }));
    return sectionStubCache.get(key);
  },
});
const pageModule = loadTsx("../components/global/v80/V80Page.tsx", (id) =>
  id === "react/jsx-runtime" ? req("react/jsx-runtime") : id === "./V80Banners" ? bannersModule : id.startsWith("./V80") ? sectionStubs : undefined,
);
const renderBanners = (view: unknown) => renderToStaticMarkup(h(bannersModule.V80Banners as React.FunctionComponent<{ view: unknown }>, { view }));
const renderPage = (view: unknown) => renderToStaticMarkup(h(pageModule.V80Page as React.FunctionComponent<{ view: unknown }>, { view }));
const BV = (key: string, image: string, extra: Record<string, unknown> = {}) => ({ key, image, imageMobile: null, href: "#shop", title: "", body: "", cta: "", alt: "", ...extra });

test("SSR: V80Banners boş listede ya da görselsiz öğede HİÇBİR çıktı üretmez (section/başlık/boşluk yok); pozitif kontrol basar", () => {
  assert.equal(renderBanners({ banners: [] }), "", "boş liste → boş çıktı");
  assert.equal(renderBanners({ banners: [BV("bos", "", { imageMobile: "/m.jpg", title: "Başlık" })] }), "", "görselsiz öğe → boş çıktı");
  assert.equal(renderBanners({}), "", "banners alanı olmayan görünüm → boş çıktı");
  // Pozitif kontrol (koşum düzeneği gerçekten basıyor): 1 → tam genişlik kart, 2 → şerit.
  const one = renderBanners({ banners: [BV("kis", "/kis.jpg", { href: "/de/kategorie/rosen", title: "Winterzauber" })] });
  assert.match(one, /^<section id="banners" class="v80-banners"><div class="v80-wrap"><a href="\/de\/kategorie\/rosen" class="v80-banner is-single v80-card" data-banner-key="kis">/);
  assert.ok(one.includes("Winterzauber"));
  const two = renderBanners({ banners: [BV("a", "/a.jpg"), BV("gorselsiz", ""), BV("b", "/b.jpg")] });
  assert.match(two, /<ul class="v80-banner-strip"><li>/);
  assert.equal((two.match(/<li>/g) ?? []).length, 2, "görselsiz öğe şeritte de basılmaz");
});

test("SSR: V80Page — aktif + görselli banner yoksa sayfa, banners bölümü hiç olmayan sayfayla BİREBİR aynı; varsa hero'nun hemen ardında", () => {
  // Eski (v1) belge: sections'ta banners yok (F3 → hero'nun ardına, açık); banner'lar pasif/görselsiz/güvensiz.
  const stored = V80_SECTION_IDS.filter((id) => id !== "banners").map((id) => ({ id, enabled: true }));
  const cfg = parseStorefrontConfig(JSON.stringify({
    v: 1,
    structure: {
      sections: stored,
      banners: [{ key: "pasif", image: "/p.jpg", enabled: false }, { key: "gorselsiz", image: null }, { key: "guvensiz", image: "javascript:alert(1)" }],
    },
    texts: { "x.banner.pasif.title": "Görünmemeli" },
  }))!;
  const view = resolveV80({ locale: "de", config: cfg, home: null, products: [], categories: [], livePages: new Set() });
  assert.deepEqual(view.sections.slice(0, 3), ["hero", "banners", "ticker"]);
  assert.deepEqual(view.banners, []);
  const html = renderPage(view);
  const without = renderPage({ ...view, sections: view.sections.filter((id) => id !== "banners") });
  assert.equal(html, without, "banners bölümü DOM'a hiçbir iz bırakmaz");
  assert.ok(!/banner|Görünmemeli/i.test(html), "banner sınıfı/metni yok");
  assert.match(html, /^<main id="main-content" lang="de" dir="ltr"><section data-stub="V80Hero"><\/section><section data-stub="V80Ticker"><\/section>/, "hero'dan hemen sonra ticker; araya boş öğe girmez");
  // Pozitif kontrol: aynı belge + aktif görselli banner → hero'nun HEMEN ardında basılır.
  cfg.structure.banners = parseBanners([{ key: "yaz", image: "/yaz.jpg", target: { kind: "anchor", id: "shop" } }]);
  const withBanner = renderPage(resolveV80({ locale: "de", config: cfg, home: null, products: [], categories: [], livePages: new Set() }));
  assert.match(withBanner, /<section data-stub="V80Hero"><\/section><section id="banners" class="v80-banners">/);
  assert.match(withBanner, /data-banner-key="yaz"/);
});

// ── UX-10: banner bağlantısının erişilebilir adı (başlık/alt/CTA boşken adsız <a> yok) ─────────────────
const LINK_LABELS = bannersModule.V80_BANNER_LINK_LABEL as Record<string, string>;
const openTag = (html: string, key: string) => html.match(new RegExp(`<a [^>]*data-banner-key="${key}"[^>]*>`))?.[0] ?? "";

test("UX-10: yedek bağlantı adı 13 dilin tamamında dolu ve o dile özgü (ham anahtar/İngilizce kopya yok)", () => {
  assert.deepEqual(Object.keys(LINK_LABELS).sort(), [...GLOBAL_LOCALES].sort());
  for (const l of GLOBAL_LOCALES) {
    const v = LINK_LABELS[l];
    assert.ok(typeof v === "string" && v.trim() === v && v.length > 0, `${l}: boş/boşluklu değil`);
    assert.ok(!/^x\.|banner|\{/.test(v), `${l}: ham anahtar/yer tutucu değil`);
    if (l !== "en") assert.notEqual(v, LINK_LABELS.en, `${l}: İngilizce kopya değil`);
  }
  assert.equal(new Set(Object.values(LINK_LABELS)).size, GLOBAL_LOCALES.length);
});

test("UX-10 (hata senaryosu): görsel + hedef var, EN metinleri boş → /en bağlantısı adsız DEĞİL (aria-label yerelleştirilmiş), görsel dekoratif kalır", () => {
  // Operatör banner'ı ekler, metinleri yalnız DE'de doldurur; EN satırının texts'i boştur.
  const cfg = defaultConfig();
  cfg.structure.banners = parseBanners([{ key: "kis", image: "/kis.jpg", target: { kind: "category", ref: { id: 1, tr_slug: "guller", slugs: { en: "roses", de: "rosen" } } } }]);
  const en = resolveV80({ locale: "en", config: { ...cfg, texts: {} }, home: null, products: [], categories: [C("roses", 3)], livePages: new Set() });
  assert.deepEqual(en.banners.map((b) => [b.href, b.title, b.alt, b.cta]), [["/en/category/roses", "", "", ""]]);
  const html = renderBanners(en);
  const a = openTag(html, "kis");
  assert.ok(a, "bağlantı basıldı");
  assert.match(a, /^<a href="\/en\/category\/roses" class="v80-banner is-single v80-card" aria-label="View campaign" data-banner-key="kis">$/);
  assert.match(html, /<img src="\/kis\.jpg" alt=""/, "adı bağlantı taşır; görsel dekoratif (alt boş)");
  // Aynı belge DE'de metinli → yedek ad yok, ad metinden gelir.
  const de = resolveV80({ locale: "de", config: { ...cfg, texts: { "x.banner.kis.title": "Winterzauber" } }, home: null, products: [], categories: [C("rosen", 3)], livePages: new Set() });
  const deHtml = renderBanners(de);
  assert.ok(!/aria-label=/.test(deHtml), "başlıklı kartta aria-label yok (görünür metin adı verir)");
  assert.ok(deHtml.includes("Winterzauber"));
});

test("UX-10: aria-label yalnız başlık, alt ve CTA'nın HEPSİ boşken; alt ya da CTA varsa ad görselden; bağlantısız kartta yok; dış bağlantıda da uygulanır", () => {
  // Harici (mutlak) hedef → düz <a>, dil: FR.
  const ext = renderBanners({ locale: "fr", banners: [BV("ext", "/e.jpg", { href: "https://example.com/offre" })] });
  assert.match(openTag(ext, "ext"), /^<a href="https:\/\/example\.com\/offre" class="v80-banner is-single v80-card" aria-label="Voir l&#x27;offre" data-banner-key="ext">$/);
  // Şerit: adsız kartlar sıra ile ayrışır; alt'lı ve yalnız CTA'lı kartlar görsel alt'ından ad alır.
  const strip = renderBanners({
    locale: "de",
    banners: [BV("a", "/a.jpg"), BV("b", "/b.jpg", { alt: "Sommerstrauß" }), BV("c", "/c.jpg", { cta: "Entdecken" }), BV("d", "/d.jpg", { href: "/de/kategorie/rosen" })],
  });
  assert.match(openTag(strip, "a"), /aria-label="Aktion ansehen \(1\/4\)"/);
  assert.ok(!/aria-label=/.test(openTag(strip, "b")), "alt varsa aria-label yok");
  assert.match(strip, /<img src="\/b\.jpg" alt="Sommerstrauß"/);
  assert.ok(!/aria-label=/.test(openTag(strip, "c")), "yalnız CTA → ad görsel alt'ından");
  assert.match(strip, /<img src="\/c\.jpg" alt="Entdecken"/);
  assert.match(openTag(strip, "d"), /aria-label="Aktion ansehen \(4\/4\)"/);
  // Bağlantısız kart (<div>): ad gerekmez, aria-label basılmaz.
  const plain = renderBanners({ locale: "de", banners: [BV("p", "/p.jpg", { href: null })] });
  assert.match(plain, /<div class="v80-banner is-single"><div class="v80-banner-media">/);
  assert.ok(!/aria-label=|<a /.test(plain));
  // Görünümde dil yoksa (eski çağıran) İngilizce yedek.
  assert.match(renderBanners({ banners: [BV("x", "/x.jpg")] }), /aria-label="View campaign"/);
  // Her <a> ya görünür metin (başlık), ya boş olmayan alt, ya da aria-label taşır.
  for (const html of [ext, strip]) {
    for (const m of html.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)) {
      const named = /aria-label="[^"]+"/.test(m[0]) || /<img [^>]*alt="[^"]+"/.test(m[1]) || /v80-banner-title">[^<]+</.test(m[1]);
      assert.ok(named, `adsız bağlantı: ${m[0].slice(0, 120)}`);
    }
  }
});

// ── UX-11: telefonda banner metni kesilmez ───────────────────────────────────────────────────────
const CSS = read("./global/v80/v80.css");
const cssRule = (selector: string) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CSS.match(new RegExp(`${esc} \\{([^}]*)\\}`))?.[1] ?? "";
};
const mobileBlock = (() => {
  const at = CSS.indexOf("@media (max-width: 767px) {\n  .v80 .v80-banners");
  assert.ok(at > 0, "banner mobil bloğu bulunur");
  return CSS.slice(at, CSS.indexOf("\n}\n", at));
})();

test("UX-11: metinli banner medyasına has-text sınıfı; başlıksız kartta yok; mobil görselle birlikte iki sınıf", () => {
  const withText = renderBanners({ locale: "de", banners: [BV("t", "/t.jpg", { title: "Winterzauber", body: "Frische Rosen", cta: "Entdecken" })] });
  assert.match(withText, /<div class="v80-banner-media has-text">/);
  const noText = renderBanners({ locale: "de", banners: [BV("n", "/n.jpg", { body: "Gövde tek başına basılmaz" })] });
  assert.match(noText, /<div class="v80-banner-media">/);
  assert.ok(!noText.includes("has-text"));
  const both = renderBanners({ locale: "de", banners: [BV("m", "/m.jpg", { imageMobile: "/m-m.jpg", title: "Titel" })] });
  assert.match(both, /<div class="v80-banner-media has-mobile has-text">/);
  const src = read("../components/global/v80/V80Banners.tsx");
  assert.match(src, /hasText \? "has-text" : ""/);
});

test("UX-11: CSS koruması — mobilde metinli kart 4/3 (mobil görselli 4/5 sonra gelir), gövde satır sınırlı ve küçülen tek öğe; başlık/CTA küçülmez, başlıkta overflow yok", () => {
  assert.match(mobileBlock, /\.v80 \.v80-banner-media\.has-text, \.v80 \.v80-banner\.is-single \.v80-banner-media\.has-text \{ aspect-ratio: 4 \/ 3; \}/);
  const textRuleAt = mobileBlock.indexOf(".v80 .v80-banner-media.has-text,");
  const mobileRuleAt = mobileBlock.indexOf(".v80 .v80-banner-media.has-mobile,");
  assert.ok(textRuleAt > 0 && mobileRuleAt > textRuleAt, "eşit özgüllükte has-mobile (4/5) has-text'ten SONRA → mobil görselli kart 4/5 kalır");
  assert.match(mobileBlock, /\.v80 \.v80-banner-media\.has-mobile, \.v80 \.v80-banner\.is-single \.v80-banner-media\.has-mobile \{ aspect-ratio: 4 \/ 5; \}/);
  assert.match(mobileBlock, /\.v80 \.v80-banner-body \{ -webkit-line-clamp: 2; \}/);
  // Mobil bloğun DIŞINDAKİ (tüm genişlikler) kurallar.
  const baseCss = CSS.slice(0, CSS.indexOf(mobileBlock));
  const rulesOf = (sel: string) => [...baseCss.matchAll(new RegExp(`\\.v80 \\.${sel} \\{([^}]*)\\}`, "g"))].map((m) => m[1]).join(";");
  const body = rulesOf("v80-banner-body");
  assert.match(body, /display: -webkit-box;/);
  assert.match(body, /-webkit-box-orient: vertical;/);
  assert.match(body, /-webkit-line-clamp: 4;/, "masaüstünde de sınırsız paragraf yok");
  assert.match(body, /overflow: hidden;/, "overflow:hidden → flex min-height 0: yer yetmezse gövde kısalır");
  const titleRules = [...CSS.matchAll(/\.v80 \.v80-banner-title \{([^}]*)\}/g)].map((m) => m[1]).join(";");
  assert.match(titleRules, /flex-shrink: 0;/);
  assert.ok(!/overflow:\s*hidden|line-clamp/.test(titleRules), "başlıkta kırpma yok (serif alt uzantıları korunur)");
  const ctaRules = rulesOf("v80-banner-cta");
  assert.match(ctaRules, /flex-shrink: 0;/);
  assert.match(cssRule(".v80 .v80-banner-text"), /justify-content: flex-end;/, "alt hizalama (taşma yukarı gider) — koruma bu yüzden gerekli");
});

test("UX-11 (hata senaryosu hesabı): 360px'te 2 bannerlı şerit, 2 satır başlık + ~120 karakter gövde — eski kural taşar, yeni kural 320/360/375px'te sığar", () => {
  const num = (re: RegExp, src = CSS) => {
    const m = src.match(re);
    assert.ok(m, `CSS değeri bulunamadı: ${re}`);
    return Number(m![1]);
  };
  const gutter = num(/@media \(max-width: 768px\) \{\s*\.v80 \{ --v80-gutter: (\d+)px;/);
  const stripCol = num(/\.v80 \.v80-banner-strip \{ grid-auto-columns: (\d+)%;/, mobileBlock) / 100;
  const padY = num(/\.v80 \.v80-banner-text \{ padding: (\d+)px \d+px; \}/, mobileBlock);
  const [rw, rh] = (mobileBlock.match(/\.has-text \{ aspect-ratio: (\d+) \/ (\d+); \}/) ?? []).slice(1).map(Number);
  const [oldW, oldH] = (mobileBlock.match(/\.v80 \.v80-banner-media, \.v80 \.v80-banner\.is-single \.v80-banner-media \{ aspect-ratio: (\d+) \/ (\d+); \}/) ?? []).slice(1).map(Number);
  const title = CSS.match(/\.v80 \.v80-banner-title \{ font-weight: 200; font-size: clamp\(([\d.]+)rem, ([\d.]+)vw, [\d.]+rem\); line-height: ([\d.]+);/);
  assert.ok(title, "başlık yazı ölçüsü");
  const [titleMinPx, titleVw, titleLh] = [Number(title![1]) * 16, Number(title![2]), Number(title![3])];
  const bodyM = CSS.match(/\.v80 \.v80-banner-body \{ font-size: ([\d.]+)rem; line-height: ([\d.]+);/)!;
  const [bodyPx, bodyLh] = [Number(bodyM[1]) * 16, Number(bodyM[2])];
  const bodyClamp = num(/\.v80 \.v80-banner-body \{ -webkit-line-clamp: (\d+); \}/, mobileBlock);
  const ctaM = CSS.match(/\.v80 \.v80-banner-cta \{[^}]*margin-top: (\d+)px; font-size: ([\d.]+)rem;/)!;
  const [ctaMargin, ctaPx] = [Number(ctaM[1]), Number(ctaM[2]) * 16];
  const inheritedLh = num(/\.v80 \{[^}]*line-height: ([\d.]+);/);
  const gap = num(/\.v80 \.v80-banner-text \{[^}]*gap: (\d+)px;/);

  const inner = (vw: number, strip: boolean, ratio: [number, number]) => {
    const w = (vw - 2 * gutter) * (strip ? stripCol : 1);
    return (w * ratio[1]) / ratio[0] - 2 * padY;
  };
  const need = (vw: number, titleLines: number, bodyLines: number, ctaLines: number) =>
    Math.max(titleMinPx, (vw * titleVw) / 100) * titleLh * titleLines + bodyPx * bodyLh * bodyLines + (ctaPx * inheritedLh * ctaLines + ctaMargin) + 2 * gap;

  // Eski kural (16/9, gövde sınırsız: 120 karakter ≈ 4 satır) bulgudaki gibi taşar → başlık üstten kesilirdi.
  assert.deepEqual([oldW, oldH], [16, 9], "metinsiz kart oranı değişmedi");
  assert.ok(need(360, 2, 4, 1) > inner(360, true, [oldW, oldH]) + 30, `eski: ${need(360, 2, 4, 1).toFixed(1)} > ${inner(360, true, [16, 9]).toFixed(1)}`);
  // Yeni kural: metinli kart 4/3, gövde en çok 2 satır.
  assert.deepEqual([rw, rh], [4, 3]);
  assert.equal(bodyClamp, 2);
  for (const strip of [true, false]) {
    for (const vw of [360, 375]) {
      const n = need(vw, 3, bodyClamp, 2);
      const room = inner(vw, strip, [rw, rh]);
      assert.ok(n <= room, `${vw}px ${strip ? "şerit" : "tek"}: 3 satır başlık + 2 gövde + 2 CTA ${n.toFixed(1)} ≤ ${room.toFixed(1)}`);
    }
    const n320 = need(320, 2, bodyClamp, 2);
    assert.ok(n320 <= inner(320, strip, [rw, rh]), `320px ${strip ? "şerit" : "tek"}: 2 satır başlık + 2 gövde + 2 CTA ${n320.toFixed(1)} ≤ ${inner(320, strip, [rw, rh]).toFixed(1)}`);
  }
  // Bulgudaki senaryo (360px şerit, 2 satır başlık + 120 karakterlik gövde + CTA) yeni kuralla bol payla sığar.
  assert.ok(need(360, 2, bodyClamp, 1) + 40 <= inner(360, true, [rw, rh]));
});

// ── Kaynak korumaları ──

test("V80Page 'banners' bölümünü yalnız banner varsa V80Banners ile basar; yoksa null (sarmalayıcı yok)", () => {
  const page = read("../components/global/v80/V80Page.tsx");
  assert.match(page, /import \{ V80Banners \} from "\.\/V80Banners";/);
  assert.match(page, /case "banners": return view\.banners\?\.length \? <V80Banners key=\{id\} view=\{view\} \/> : null;/);
  assert.match(page, /<main id="main-content" lang=\{view\.locale\} dir=\{view\.dir\}>\s*\{view\.sections\.map\(render\)\}\s*<\/main>/, "bölümler ek sarmalayıcı olmadan doğrudan main içinde");
  const banners = read("../components/global/v80/V80Banners.tsx");
  const fn = banners.slice(banners.indexOf("export function V80Banners"));
  assert.match(fn, /const items = \(view\.banners \?\? \[\]\)\.filter\(\(b\) => !!b\.image\);\s*(\/\/[^\n]*\s*)*if \(!items\.length\) return null;/);
  const wrapperAt = fn.indexOf('<section id="banners"');
  assert.ok(wrapperAt > 0 && fn.indexOf("return null;") < wrapperAt, "null dönüşü <section> sarmalayıcısından ÖNCE");
});

test("V80Banners: kütüphane yok, satır içi <style> yok; 1 → tam genişlik kart, >1 → scroll-snap şerit (CSS v80.css'te)", () => {
  const src = read("../components/global/v80/V80Banners.tsx");
  const imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ["@/lib/global/v80/schema", "@/lib/global/v80/view", "next/image", "next/link", "react"].sort());
  assert.ok(!/<style[^>]*>\{/.test(src), "satır içi <style>{…} yok");
  assert.ok(!src.includes('"use client"'), "sunucu bileşeni (istemci JS yok)");
  assert.match(src, /const single = items\.length === 1;/);
  assert.match(src, /if \(!items\.length\) return null;/);
  assert.match(src, /className="v80-banner-strip"/);
  assert.match(src, /export const V80_MOBILE_MEDIA = "\(max-width: 767px\)";/);
  assert.match(src, /alt=\{alt\}/);
  const card = src.slice(src.indexOf("function BannerCard"), src.indexOf("export function V80Banners"));
  assert.ok(card.includes("<V80ArtImage "));
  assert.ok(!/priority/.test(card), "banner görselleri öncelikli değil (LCP için tek öncelikli görsel hero'da)");
  const css = read("./global/v80/v80.css");
  assert.match(css, /\.v80 \.v80-banner-strip \{[^}]*scroll-snap-type: x mandatory;[^}]*\}/);
  assert.match(css, /\.v80 \.v80-banner-strip > li \{ scroll-snap-align: start;/);
  assert.match(css, /@media \(max-width: 767px\) \{\s*\.v80 \.v80-banners/);
});

test("görsel optimizasyon kuralı tek yardımcıdan: hero/vitrin/duygu/bölümler/banner '/r2/' ve mutlak URL'yi optimize etmez", () => {
  for (const f of ["V80Hero.tsx", "V80Shop.tsx", "V80Mood.tsx", "V80Sections.tsx", "V80Banners.tsx"]) {
    const src = read(`../components/global/v80/${f}`);
    assert.ok(!/unoptimized=\{!\S+\.startsWith\("\/"\)\}/.test(src), `${f}: eski startsWith("/") kuralı kalmamalı`);
  }
  for (const f of ["V80Shop.tsx", "V80Mood.tsx", "V80Sections.tsx"]) {
    assert.match(read(`../components/global/v80/${f}`), /unoptimized=\{v80ImageUnoptimized\(/, `${f}: v80ImageUnoptimized kullanılmalı`);
  }
});

test("hero: mobil görsel V80ArtImage ile (<768px), tek öncelikli görsel; <picture> içinde çift önyükleme yok", () => {
  const hero = read("../components/global/v80/V80Hero.tsx");
  assert.match(hero, /<V80ArtImage src=\{view\.heroImage\} srcMobile=\{view\.heroImageMobile\} alt="" priority /);
  assert.equal((hero.match(/<V80ArtImage /g) ?? []).length, 1, "hero'da tek görsel bileşeni");
  assert.ok(!/<Image /.test(hero), "hero'da ikinci next/image yok");
  const art = read("../components/global/v80/V80Banners.tsx");
  assert.match(art, /<source media=\{V80_MOBILE_MEDIA\} srcSet=\{mobile\.srcSet \?\? mobile\.src\}/);
  assert.match(art, /if \(src && !srcMobile\) \{\s*return <Image src=\{src\} alt=\{alt\} fill priority=\{priority\}/, "mobil görsel yoksa bugünkü tek next/image");
});

test("data.ts: yapılandırma görselleri iki yolda da (API paketi + eski API yedeği) mediaUrlOrNull ile normalize edilir", () => {
  const data = read("./global/v80/data.ts");
  assert.match(data, /mapStructureImages\(config\.structure, mediaUrlOrNull\)/);
  assert.equal((data.match(/normalizeConfig\(parseStorefrontConfig\(/g) ?? []).length, 2);
  assert.ok(!/=\s*parseStorefrontConfig\(/.test(data), "normalize edilmemiş ayrıştırma ataması kalmamalı");
  assert.match(data, /activeProductRefs\(config\.structure\)/, "manuel vitrin yalnız aktif satırlar");
});
