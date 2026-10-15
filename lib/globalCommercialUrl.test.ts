// lib/globalCommercialUrl.test.ts — İSTANBUL TİCARİ URL (14 Eki 2026): tek kaynak (lib/global/commercialUrl.ts) ve
// 13.195 satırlık geçiş sözlüğüyle (docs/global-istanbul-url-gecis/istanbul-global-url-sozlugu.csv) birebir tutarlılık.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOBAL_LOCALES, parseLocalePath, SEGMENTS, INTENT_PAGE_KEYS, BLOG_SEGMENT, DESTINATION_ROOTS } from "./global/config.ts";
import {
  COMMERCIAL_URL_PATTERNS, commercialKeyFromSlug, commercialLocaleStatus, commercialRedirectTarget, commercialSlug,
  hierarchicalIstanbulKey, isCommercialSlugCandidate, localeLocationPath, parseCommercialLocales, rewriteLocaleLocationHrefs,
} from "./global/commercialUrl.ts";
import { locationHreflangFamily } from "./global/hreflangFamily.ts";
import { localeKirintiBasamaklari } from "./global/localeBreadcrumb.ts";

const oku = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
type Satir = { locale: string; key: string; current: string; proposed: string; action: string; tr: string };
const SOZLUK: Satir[] = oku("../docs/global-istanbul-url-gecis/istanbul-global-url-sozlugu.csv")
  .trim().split(/\r?\n/).slice(1).map((l) => {
    const [locale, key, current, proposed, action, tr] = l.split(",");
    return { locale, key, current, proposed, action, tr };
  });
const PILOT = new Set(["en", "de", "fr"]);
const TUMU = new Set(Object.keys(COMMERCIAL_URL_PATTERNS));
const BOS = new Set<string>();

test("sözlük: 13 dil × 1.015 = 13.195 satır; 8.120 değişecek (7 dil + RU), 5.075 değişmeyecek (5 dil)", () => {
  assert.equal(SOZLUK.length, 13_195);
  const byLocale = new Map<string, number>();
  for (const r of SOZLUK) byLocale.set(r.locale, (byLocale.get(r.locale) ?? 0) + 1);
  assert.deepEqual([...byLocale.keys()].sort(), [...GLOBAL_LOCALES].sort());
  for (const n of byLocale.values()) assert.equal(n, 1_015);
  assert.equal(SOZLUK.filter((r) => r.action.startsWith("301")).length, 8_120);
  assert.equal(SOZLUK.filter((r) => r.action.startsWith("değişmez")).length, 5_075);
  assert.deepEqual(Object.keys(COMMERCIAL_URL_PATTERNS).sort(), ["de", "en", "es", "fr", "it", "nl", "pt", "ru"]);
});

test("ileri eşleme sözlükle BİREBİR: her satırın önerilen adresi = localeLocationPath (tüm diller açıkken)", () => {
  for (const r of SOZLUK) {
    assert.equal(r.current, `/${r.locale}/${r.key}`, r.current);
    assert.equal(localeLocationPath(r.locale, r.key, TUMU), r.proposed, r.current);
  }
});

test("bayrak KAPALI: 13.195 adresin hepsi bugünkü adres (çıktı birebir aynı)", () => {
  for (const r of SOZLUK) assert.equal(localeLocationPath(r.locale, r.key, BOS), r.current);
  assert.equal(parseCommercialLocales(undefined).size, 0);
  assert.equal(parseCommercialLocales("").size, 0);
});

test("bayrak: yalnız kalıbı olan diller açılabilir; geçersiz / kanıtsız dil yok sayılır", () => {
  assert.deepEqual([...parseCommercialLocales(" en, DE ,fr ")].sort(), ["de", "en", "fr"]);
  assert.deepEqual([...parseCommercialLocales("ar,ja,ko,zh,az,tr,xx")], []);
  assert.deepEqual([...parseCommercialLocales("ru")], ["ru"]);
  assert.equal(commercialLocaleStatus("ar", PILOT), "pending-validation");
  assert.equal(commercialLocaleStatus("ru", PILOT), "ready");
  assert.equal(commercialLocaleStatus("en", PILOT), "active");
  assert.equal(commercialLocaleStatus("it", PILOT), "ready");
});

test("tekillik + çakışma yok: yeni adresler mükerrer değil; ürün/kategori/blog/şehir/niyet rotalarıyla çakışmıyor", () => {
  const seen = new Set<string>();
  for (const r of SOZLUK) {
    const p = localeLocationPath(r.locale, r.key, TUMU);
    assert.ok(!seen.has(p), p);
    seen.add(p);
    const seg = p.split("/")[2];
    if (r.action.startsWith("301")) {
      const reserved = new Set<string>([SEGMENTS[r.locale as "en"].product, SEGMENTS[r.locale as "en"].category, BLOG_SEGMENT, ...INTENT_PAGE_KEYS, ...DESTINATION_ROOTS]);
      assert.ok(!reserved.has(seg), p);
      assert.equal(parseLocalePath(r.locale as "en", [seg]).kind, "unknown", "ticari slug mevcut bir rotayı gölgelemez");
      assert.ok(p.length <= 80, p);
    }
  }
});

test("ters eşleme kayıpsız: her ticari slug yalnız kendi anahtarına çözülür (envanterle, tahminsiz)", () => {
  const keys = SOZLUK.filter((r) => r.locale === "en").map((r) => r.key);
  for (const r of SOZLUK.filter((x) => x.action.startsWith("301"))) {
    const slug = r.proposed.split("/")[2];
    assert.ok(isCommercialSlugCandidate(r.locale, slug), slug);
    assert.equal(commercialKeyFromSlug(r.locale, slug, keys), r.key, slug);
  }
  assert.equal(commercialKeyFromSlug("en", "flower-delivery-yok-istanbul", keys), null);
  assert.equal(commercialKeyFromSlug("ar", "flower-delivery-kadikoy-istanbul", keys), null, "kalıbı olmayan dil");
  assert.equal(commercialKeyFromSlug("ru", "flower-delivery-kadikoy-istanbul", keys), null, "RU başka dilin kalıbını kabul etmez");
  assert.equal(commercialKeyFromSlug("en", "blumen-verschicken-kadikoy-istanbul", keys), null, "başka dilin kalıbı");
});

test("301 kararı: açık dil eski → yeni; kapalı dil yeni → eski (geri alma); yayında olmayan / geçersiz → yok", () => {
  const live = new Set(["istanbul", "istanbul/kadikoy", "istanbul/kadikoy/caferaga-mah"]);
  assert.equal(commercialRedirectTarget("/en/istanbul", live, PILOT), "/en/flower-delivery-istanbul");
  assert.equal(commercialRedirectTarget("/en/istanbul/kadikoy/", live, PILOT), "/en/flower-delivery-kadikoy-istanbul");
  assert.equal(commercialRedirectTarget("/de/istanbul/kadikoy/caferaga-mah", live, PILOT), "/de/blumen-verschicken-caferaga-kadikoy-istanbul");
  assert.equal(commercialRedirectTarget("/fr/istanbul/kadikoy", live, PILOT), "/fr/livraison-fleurs-kadikoy-istanbul");
  assert.equal(commercialRedirectTarget("/en/istanbul/besiktas", live, PILOT), null, "yayında değil → 301→404 yok");
  assert.equal(commercialRedirectTarget("/en/flower-delivery-kadikoy-istanbul", live, PILOT), null, "yeni adres kendi sayfası (döngü yok)");
  assert.equal(commercialRedirectTarget("/ar/istanbul/kadikoy", live, PILOT), null, "kanıtsız dil değişmez");
  assert.equal(commercialRedirectTarget("/ru/istanbul/kadikoy", live, PILOT), null, "RU hazır ama kapalı: eski adreste kalır");
  assert.equal(commercialRedirectTarget("/it/istanbul/kadikoy", live, PILOT), null, "hazır ama kapalı dil eski adreste kalır");
  assert.equal(commercialRedirectTarget("/it/consegna-fiori-kadikoy-istanbul", live, PILOT), "/it/istanbul/kadikoy", "kapalı dilde ticari adres → eski (geri alma)");
  assert.equal(commercialRedirectTarget("/en/antalya/muratpasa", live, PILOT), null);
  assert.equal(commercialRedirectTarget("/en/product/gul", live, PILOT), null);
  assert.equal(commercialRedirectTarget("/en/istanbul/kadikoy", null, PILOT), null, "envanter okunamadı → yönlendirme yok (fail-open)");
  // Tek adım: hedef asla yeniden yönlendirilmez.
  for (const from of ["/en/istanbul", "/en/istanbul/kadikoy", "/de/istanbul/kadikoy/caferaga-mah"]) {
    const to = commercialRedirectTarget(from, live, PILOT)!;
    assert.equal(commercialRedirectTarget(to, live, PILOT), null, `${from} → ${to} zincir yok`);
  }
  const geri = commercialRedirectTarget("/it/consegna-fiori-kadikoy-istanbul", live, PILOT)!;
  assert.equal(commercialRedirectTarget(geri, live, PILOT), null, "geri alma hedefi tek adım");
});

test("hreflang ailesi: açık dilde yeni adres, kapalı dilde eski adres; TR aynı; x-default EN'in kanonik adresi", () => {
  const all = GLOBAL_LOCALES.map((locale) => ({ locale, indexable: true }));
  const mutlak = (p: string) => `https://www.cicekyolla.com.tr${p}`;
  // Not: locationHreflangFamily modül bayrağını (NEXT_PUBLIC_…) kullanır; testte bayrak boş → bugünkü yollar.
  const fam = locationHreflangFamily("istanbul/kadikoy", "/kadikoy-cicek-siparisi", all, mutlak)!;
  assert.equal(fam.en, mutlak("/en/istanbul/kadikoy"));
  assert.equal(fam.tr, mutlak("/kadikoy-cicek-siparisi"));
  // Saf eşdeğeri (pilot açıkken üretilecek küme):
  const pilot = Object.fromEntries(GLOBAL_LOCALES.map((l) => [l, localeLocationPath(l, "istanbul/kadikoy", PILOT)]));
  assert.equal(pilot.en, "/en/flower-delivery-kadikoy-istanbul");
  assert.equal(pilot.de, "/de/blumen-verschicken-kadikoy-istanbul");
  assert.equal(pilot.fr, "/fr/livraison-fleurs-kadikoy-istanbul");
  assert.equal(pilot.ru, "/ru/istanbul/kadikoy");
  assert.equal(pilot.it, "/it/istanbul/kadikoy");
});

test("içerik HTML'i: açık dilde eski İstanbul bağlantısı kanonik yola; diğerleri bayt bayt aynı", () => {
  const html = `<a href="/en/istanbul/kadikoy">K</a> <a href='/en/istanbul/kadikoy/caferaga-mah?x=1#s'>C</a> <a href="/ru/istanbul/kadikoy">R</a> <a href="/en/product/gul">P</a> <a href="/en/antalya">A</a>`;
  assert.equal(
    rewriteLocaleLocationHrefs(html, PILOT),
    `<a href="/en/flower-delivery-kadikoy-istanbul">K</a> <a href='/en/flower-delivery-caferaga-kadikoy-istanbul?x=1#s'>C</a> <a href="/ru/istanbul/kadikoy">R</a> <a href="/en/product/gul">P</a> <a href="/en/antalya">A</a>`,
  );
  assert.equal(rewriteLocaleLocationHrefs(html, BOS), html);
});

test("kırıntı (BreadcrumbList) yolları kanonik çözücüden; bayrak kapalı → bugünkü yollar", () => {
  assert.deepEqual(localeKirintiBasamaklari("en", ["istanbul", "kadikoy"], ["Istanbul", "Kadıköy"]).map((b) => b.yol), ["/en/istanbul", "/en/istanbul/kadikoy"]);
  assert.equal(hierarchicalIstanbulKey(["istanbul", "kadikoy", "caferaga-mah"]), "istanbul/kadikoy/caferaga-mah");
  assert.equal(hierarchicalIstanbulKey(["istanbul", "a", "b", "c"]), null);
  assert.equal(hierarchicalIstanbulKey(["antalya"]), null);
  assert.equal(commercialSlug("en", "antalya/muratpasa"), null);
  assert.equal(commercialSlug("en", "hotel-delivery"), null);
});

test("KAYNAK: Global İstanbul lokasyon adresi üreten her yer tek çözücüden geçer (ikinci adres sistemi yok)", () => {
  const page = oku("./global/page.tsx");
  assert.ok(page.includes("const basePath = canonicalLocationPath(locale, row);"));
  assert.ok(page.includes("localeLocationPath(alt.locale, row.page_key)"), "pageLanguages");
  // EK (15 Eki 2026 — satış sayfaları): çözülmüş segmentler satış adresi çözümüne de verilir; çözüm yine tek ve iki yerde aynı.
  assert.equal(page.split("const segs = await resolveCommercialSegments(locale, path);").length - 1, 2, "metadata + sayfa aynı çözüm");
  assert.equal(page.split("const parsedPath = parseLocalePath(locale, segs);").length - 1, 2, "metadata + sayfa aynı ayrıştırma");
  assert.ok(!/`\/\$\{locale\}\/\$\{row\.page_key\}`/.test(page.replace("return row.indexable ? localeLocationPath(locale, row.page_key) : `/${locale}/${row.page_key}`;", "")), "ham /<dil>/<page_key> kalmadı");
  assert.ok(oku("./global/sitemap.ts").includes("localeLocationPath(locale, g.page_key)"));
  assert.ok(oku("./global/hreflangFamily.ts").includes("absolute(localeLocationPath(alt.locale, key))"));
  assert.ok(oku("./global/v80/footer.ts").includes("href: localeLocationPath(locale, c)"), "v80 footer Teslimat sütunu (pilotta bulunan 301 iç bağı)");
  assert.ok(oku("./global/locationNav.tsx").includes("localeLocationPath(locale, `${baseHref.slice(locale.length + 2)}/${it.slug}`)"));
  assert.ok(oku("../middleware.ts").includes("await resolveCommercialRedirect(req.nextUrl.pathname"));
  const mw = oku("../middleware.ts");
  assert.ok(mw.indexOf("resolveManagedLocaleRedirect(") < mw.indexOf("resolveCommercialRedirect(req"), "yönetilen 301 önce");
  assert.ok(mw.includes("return NextResponse.redirect(target, 301);"));
});

test("RU (14 Eki 2026): kalıp + 1.015 adres sözlükle birebir; bayrak kapalıyken /ru/istanbul/... aynen; açılınca tek adım 301", () => {
  const RU = new Set(["ru"]);
  const SEVEN = new Set(["en", "de", "fr", "it", "nl", "es", "pt"]);
  assert.equal(commercialSlug("ru", "istanbul"), "dostavka-tsvetov-stambul");
  assert.equal(commercialSlug("ru", "istanbul/maltepe"), "dostavka-tsvetov-maltepe-stambul");
  assert.equal(commercialSlug("ru", "istanbul/maltepe/cevizli-mah"), "dostavka-tsvetov-cevizli-maltepe-stambul");
  const ru = SOZLUK.filter((r) => r.locale === "ru");
  assert.equal(ru.length, 1_015);
  assert.equal(new Set(ru.map((r) => r.proposed)).size, 1_015, "mükerrer RU adresi yok");
  assert.equal(new Set(ru.map((r) => r.tr)).size, 1_015, "her RU adresi ayrı TR sayfasına bağlı");
  const keys = ru.map((r) => r.key);
  for (const r of ru) {
    assert.equal(localeLocationPath("ru", r.key, SEVEN), r.current, "production bayrağı (7 dil): RU değişmez");
    assert.equal(localeLocationPath("ru", r.key, RU), r.proposed);
    assert.equal(commercialKeyFromSlug("ru", r.proposed.split("/")[2], keys), r.key);
    assert.equal(commercialRedirectTarget(r.current, new Set(keys), RU), r.proposed, "eski → yeni");
    assert.equal(commercialRedirectTarget(r.proposed, new Set(keys), RU), null, "yeni adres döngüsüz");
    assert.equal(commercialRedirectTarget(r.proposed, new Set(keys), SEVEN), r.current, "RU kapalı: ticari → eski (geri alma)");
    assert.equal(commercialRedirectTarget(r.current, new Set(keys), SEVEN), null, "RU kapalı: eski adres sayfası");
  }
  assert.equal(commercialKeyFromSlug("ru", "dostavka-tsvetov-yok-stambul", keys), null, "uydurma slug → 404");
  assert.ok(!isCommercialSlugCandidate("ru", "dostavka-tsvetov-kadikoy-istanbul"), "şehir eki stambul");
  // Diğer 7 dilin adresleri RU kalıbından etkilenmez.
  for (const r of SOZLUK.filter((x) => SEVEN.has(x.locale))) assert.equal(localeLocationPath(r.locale, r.key, SEVEN), r.proposed);
});
