// Paket F — ilk temas (first-touch) saf yardımcıları.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIRST_TOUCH_FIELD_KEYS, FIRST_TOUCH_KEY, captureTouch, firstTouchFields, isProductPath, localePrefixOf,
  parseStoredTouch, rememberFirstTouch, resolveFirstTouch, sanitizeUtm, type StorageLike,
} from "./firstTouch.ts";

const HOST = "www.cicekyolla.com.tr";

function memStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

const loc = (pathname: string, search = "") => ({ pathname, search, hostname: HOST });

test("ilk temas yenileme / iç geçiş sonrası korunur (onaylı oturum)", () => {
  const s = memStorage();
  // 1) Google'dan /en/product/... girişi
  const first = resolveFirstTouch({ storage: s, consent: true, location: loc("/en/product/red-roses"), referrer: "https://www.google.com/" });
  assert.equal(first.r, "www.google.com");
  assert.equal(first.p, "/en/product/red-roses");
  assert.equal(first.ll, "en");
  // 2) Yenileme / tam sayfa geçiş: yönlendiren artık site içi, sayfa /sepet
  const again = resolveFirstTouch({ storage: s, consent: true, location: loc("/sepet"), referrer: `https://${HOST}/en/product/red-roses` });
  assert.deepEqual(again, first);
  const f = firstTouchFields(again);
  assert.equal(f.fr, "www.google.com");
  assert.equal(f.ll, "en");
  assert.equal(f.fp, "/en/product/red-roses");
});

test("ChatGPT utm ile giriş: sonraki sayfa yüklemesinde utm korunur", () => {
  const s = memStorage();
  resolveFirstTouch({ storage: s, consent: true, location: loc("/", "?utm_source=chatgpt.com"), referrer: "" });
  const later = resolveFirstTouch({ storage: s, consent: true, location: loc("/checkout"), referrer: "" });
  assert.equal(later.us, "chatgpt.com");
  assert.equal(later.ll, undefined);
});

test("onay YOKSA sessionStorage'a yazılmaz, var olan kayıt silinir (mevcut cy_vid kuralı)", () => {
  const s = memStorage();
  s.setItem(FIRST_TOUCH_KEY, JSON.stringify({ p: "/", r: "bing.com" }));
  const t = resolveFirstTouch({ storage: s, consent: false, location: loc("/kategori/gul", "?utm_source=google"), referrer: "https://www.google.com/" });
  assert.equal(s.data.size, 0);
  assert.equal(t.us, "google"); // yalnız bu sayfa belleğinde
  rememberFirstTouch(s, false, t);
  assert.equal(s.data.size, 0);
});

test("onay sonradan verilirse bellekteki ilk temas saklanır; ödeme dönüşü ilk temas olmaz", () => {
  const s = memStorage();
  const t = resolveFirstTouch({ storage: s, consent: false, location: loc("/de"), referrer: "https://www.bing.com/" });
  rememberFirstTouch(s, true, t);
  assert.equal(parseStoredTouch(s.getItem(FIRST_TOUCH_KEY))?.r, "www.bing.com");
  const s2 = memStorage();
  resolveFirstTouch({ storage: s2, consent: true, location: loc("/checkout/sonuc", "?oid=CY1"), referrer: "https://www.paytr.com/" });
  assert.equal(s2.data.size, 0);
});

test("storage erişimi fırlatırsa ölçüm bozulmaz", () => {
  const bad: StorageLike = {
    getItem: () => { throw new Error("SecurityError"); },
    setItem: () => { throw new Error("QuotaExceeded"); },
    removeItem: () => { throw new Error("SecurityError"); },
  };
  assert.doesNotThrow(() => resolveFirstTouch({ storage: bad, consent: true, location: loc("/"), referrer: "" }));
  assert.doesNotThrow(() => rememberFirstTouch(bad, true, { p: "/" }));
  assert.equal(resolveFirstTouch({ storage: null, consent: true, location: loc("/"), referrer: "" }).p, "/");
});

test("utm temizliği: e-posta/telefon düşer, karakterler süzülür, uzunluk sınırı", () => {
  assert.equal(sanitizeUtm("chatgpt.com", 80), "chatgpt.com");
  assert.equal(sanitizeUtm("  Google  Ads ", 80), "Google Ads");
  assert.equal(sanitizeUtm("ayse@example.com", 80), undefined);
  assert.equal(sanitizeUtm("ayse%40example.com", 80), undefined);
  assert.equal(sanitizeUtm("+90 532 123 45 67", 80), undefined);
  assert.equal(sanitizeUtm("0532 123 45 67", 80), undefined);
  assert.equal(sanitizeUtm("5321234567", 80), undefined);
  assert.equal(sanitizeUtm("<script>x</script>", 80), "scriptxscript");
  assert.equal(sanitizeUtm("2026_11_ogretmenler-gunu", 120), "2026_11_ogretmenler-gunu");
  assert.equal(sanitizeUtm("a".repeat(200), 40)?.length, 40);
  assert.equal(sanitizeUtm("", 80), undefined);
  assert.equal(sanitizeUtm(null, 80), undefined);
});

test("PII yok: yalnız izinli anahtarlar; diğer sorgu parametreleri ve tam yönlendiren URL taşınmaz", () => {
  const t = captureTouch(
    loc("/urun/kirmizi-gul", "?utm_source=google&utm_medium=cpc&utm_campaign=x&gclid=SECRETCLICK&fbclid=FBSECRET&email=a%40b.com&tel=05321234567&name=Ayse&adres=Kadikoy"),
    "https://www.google.com/search?q=ayse+yilmaz+0532",
  );
  const f = firstTouchFields(t);
  for (const k of Object.keys(f)) assert.ok((FIRST_TOUCH_FIELD_KEYS as readonly string[]).includes(k), `izinsiz anahtar: ${k}`);
  const json = JSON.stringify(f);
  for (const bad of ["SECRETCLICK", "FBSECRET", "a@b.com", "a%40b.com", "0532", "Ayse", "ayse", "Kadikoy", "search", "?"]) {
    assert.ok(!json.includes(bad), `sızıntı: ${bad} → ${json}`);
  }
  assert.equal(f.fg, 1);
  assert.equal(f.ff, 1);
  assert.equal(f.fr, "www.google.com");
  assert.equal(f.fp, "/urun/kirmizi-gul");
  // Saklanan kayıt elle bozulursa yeniden temizlenir.
  const tampered = parseStoredTouch(JSON.stringify({ p: "/x?tel=0532", us: "a@b.com", r: "EVIL HOST/..", ll: "xx", email: "a@b.com" }));
  assert.deepEqual(tampered, { p: "/x" });
  assert.equal(parseStoredTouch("{bozuk"), null);
});

test("locale ürün yolu tespiti (13 dil SEGMENTS) + TR /urun/", () => {
  for (const p of [
    "/urun/kirmizi-gul", "/en/product/red-roses", "/de/produkt/rote-rosen", "/fr/produit/roses", "/nl/product/rozen",
    "/it/prodotto/rose", "/es/producto/rosas", "/pt/produto/rosas", "/az/mehsul/qizilgul", "/ru/product/roses",
    "/ar/product/roses", "/zh/product/roses", "/ja/product/roses", "/ko/product/roses",
  ]) assert.equal(isProductPath(p), true, p);
  for (const p of [
    "/", "/urun/", "/en", "/en/category/roses", "/de/product/x", "/en/product", "/en/product/a/b", "/xx/product/a",
    "/kategori/gul", "/sepet", "/checkout", "/en/product/Bad_Slug",
  ]) assert.equal(isProductPath(p), false, p);
  assert.equal(isProductPath(null), false);
});

test("giriş dili öneki: yalnız 13 yabancı locale", () => {
  assert.equal(localePrefixOf("/en/product/x"), "en");
  assert.equal(localePrefixOf("/ar"), "ar");
  assert.equal(localePrefixOf("/sepet"), undefined);
  assert.equal(localePrefixOf("/tr/x"), undefined);
  assert.equal(localePrefixOf("/entry"), undefined);
});
