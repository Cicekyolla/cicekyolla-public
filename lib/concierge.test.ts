// concierge.test.ts — Web AI Satış Danışmanı (sohbet paneli, PR 2) saf mantık + kaynak kilidi testleri.
// Ağ / tarayıcı / model YOK. Çalıştırma: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  buildRequestBody, canSend, cardPath, chatReducer, CONCIERGE_DICT_KEYS, tokenToSend, CONCIERGE_HIDDEN_PREFIXES, conciergeVisibleOnPath, conciergeWhatsappUrl,
  INITIAL_CHAT, isSessionToken, LAUNCHER_SLOT_PX, launcherSlot, MAX_MESSAGE_CHARS, parseCards, parseTurn, readStatusCache, safeImageUrl,
  STATUS_TTL_MS, TR_WHATSAPP_URL, writeStatusCache, type ChatState, type TurnOutcome,
} from "./concierge.ts";
import { GLOBAL_WHATSAPP_URL } from "./telegramContact.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const LANGS = ["tr", "en", "de", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko"] as const;
const TOKEN = "A".repeat(43);
const card = (over: Record<string, unknown> = {}) => ({
  product_id: 7, tier: "recommended", name: "11 Kırmızı Gül", price_minor: 189900, currency: "TRY",
  url: "https://www.cicekyolla.com.tr/urun/11-kirmizi-gul", image_url: "https://pub-x.r2.dev/gul.webp", ...over,
});
const okBody = (over: Record<string, unknown> = {}) => ({
  data: { status: "ok", session_token: TOKEN, reply: "Üç seçenek hazırladım. Hangisini seversiniz?", lang: "tr", cards: [card()], handoff: null, remaining_messages: 19, ...over },
});

// ============================================================================
// Görünürlük ve yerleşim
// ============================================================================
test("görünürlük: sepet / ödeme / sipariş / üyelik yollarında başlatıcı YOK; diğer her yerde var", () => {
  for (const p of ["/sepet", "/checkout", "/checkout/sonuc", "/odeme", "/siparis-takip", "/siparis/x", "/hizli-siparis", "/e-posta-tercihleri", "/giris", "/hesabim/siparisler", "/sifre-belirle", "/sifremi-unuttum"]) {
    // /siparis-takip pazarlama engelli öneke (/siparis) ConsentManager'da da takılır; burada yalnız tam önek/alt yol gizlenir.
    if (p === "/siparis-takip") continue;
    assert.equal(conciergeVisibleOnPath(p), false, p);
  }
  for (const p of ["/", "/kategori/guller", "/urun/11-kirmizi-gul", "/en", "/de/produkt/rote-rosen", "/ar/category/baakat-zuhur", "/blog/x", "/kadikoy-cicek-siparisi", "/sepetim-degil", "/siparis-takip", null, undefined, ""]) {
    assert.equal(conciergeVisibleOnPath(p as never), true, String(p));
  }
});

test("görünürlük: kritik akış listesi ConsentManager'daki pazarlama engelli yollarla AYNI (tek kaynakla eşit)", () => {
  const cm = src("../components/consent/ConsentManager.tsx");
  const block = /export const MARKETING_BLOCKED_PATHS = \[([\s\S]*?)\];/.exec(cm);
  assert.ok(block, "MARKETING_BLOCKED_PATHS bulunamadı");
  const blocked = [...block![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(blocked.length >= 6);
  for (const b of blocked) assert.ok((CONCIERGE_HIDDEN_PREFIXES as readonly string[]).includes(b), `eksik: ${b}`);
  const teaser = src("./welcomeTeaser.ts");
  const hidden = [.../WELCOME_TEASER_HIDDEN_PREFIXES = \[([\s\S]*?)\]/.exec(teaser)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const h of hidden) assert.ok((CONCIERGE_HIDDEN_PREFIXES as readonly string[]).includes(h), `eksik: ${h}`);
});

test("yerleşim: yuva dile ve sayfa türüne göre seçilir (TR / 13 dil × ürün sayfası / diğer)", () => {
  assert.equal(launcherSlot("/"), "tr");
  assert.equal(launcherSlot("/kategori/guller"), "tr");
  assert.equal(launcherSlot("/urun/11-kirmizi-gul"), "tr-product");
  assert.equal(launcherSlot(null), "tr");
  assert.equal(GLOBAL_LOCALES.length, 13);
  for (const l of GLOBAL_LOCALES) {
    assert.equal(launcherSlot(`/${l}`), "global", l);
    assert.equal(launcherSlot(`/${l}/flower-delivery-istanbul`), "global", l);
  }
  assert.equal(launcherSlot("/en/product/red-roses"), "global-product");
  assert.equal(launcherSlot("/de/produkt/rote-rosen"), "global-product");
  assert.equal(launcherSlot("/ru/product/rozy"), "global-product");
});

test("yerleşim: başlatıcı sol alttaki mevcut öğelerle ÇAKIŞMAZ (teklif, mobil satın alma çubuğu)", () => {
  // Hoş geldin teklifi: mobil 16 px'ten başlar, ~52 px yüksek (16–68); masaüstü 24–76. TR ürün sayfasında 92–144.
  const TEASER = { mobile: [16, 68], desktop: [24, 76], aboveBuyBar: [92, 144] };
  const BUY_BAR_TOP = 72; // mobil "Sipariş Ver" çubuğu 0–~72 px
  const GAP = 8;
  assert.ok(LAUNCHER_SLOT_PX.tr.mobile >= TEASER.mobile[1] + GAP);
  assert.ok(LAUNCHER_SLOT_PX.tr.desktop >= TEASER.desktop[1] + GAP);
  assert.ok(LAUNCHER_SLOT_PX["tr-product"].mobile >= TEASER.aboveBuyBar[1] + GAP);
  assert.ok(LAUNCHER_SLOT_PX["tr-product"].desktop >= TEASER.desktop[1] + GAP);
  assert.ok(LAUNCHER_SLOT_PX["global-product"].mobile >= BUY_BAR_TOP + GAP);
  assert.ok(LAUNCHER_SLOT_PX.global.mobile >= 16 && LAUNCHER_SLOT_PX.global.desktop >= 24);
  // Teklifin gerçek sınıfları değişirse bu test uyarır.
  const popup = src("../components/consent/NewMemberPopup.tsx");
  assert.match(popup, /fixed left-4 z-50 flex items-center sm:left-6/);
  assert.match(popup, /bottom-\[calc\(92px\+env\(safe-area-inset-bottom\)\)\] lg:bottom-6/);
  assert.match(popup, /bottom-\[calc\(16px\+env\(safe-area-inset-bottom\)\)\] sm:bottom-6/);
});

test("yerleşim: bileşendeki sınıflar LAUNCHER_SLOT_PX ile aynı ofsetleri taşır; konum fiziksel SOL", () => {
  const l = src("../components/concierge/ConciergeLauncher.tsx");
  const px = LAUNCHER_SLOT_PX;
  assert.ok(l.includes(`tr: "bottom-[calc(${px.tr.mobile}px+env(safe-area-inset-bottom))] sm:bottom-[${px.tr.desktop}px]"`));
  assert.ok(l.includes(`"tr-product": "bottom-[calc(${px["tr-product"].mobile}px+env(safe-area-inset-bottom))] lg:bottom-[${px["tr-product"].desktop}px]"`));
  assert.ok(l.includes(`global: "bottom-[calc(${px.global.mobile}px+env(safe-area-inset-bottom))] sm:bottom-6"`));
  assert.ok(l.includes(`"global-product": "bottom-[calc(${px["global-product"].mobile}px+env(safe-area-inset-bottom))] lg:bottom-6"`));
  assert.equal(px.global.desktop, 24);
  assert.match(l, /fixed left-4 z-50[^"`]*sm:left-6/);
  // RTL'de sağa geçmemeli: mantıksal (start/end) ya da right konumu kullanılmaz.
  assert.ok(!/\b(right-\d|start-\d|end-\d|inset-inline)/.test(l));
});

// ============================================================================
// WhatsApp devri, oturum, durum önbelleği
// ============================================================================
test("WhatsApp devri: TR ve Global mevcut bağlantıları kullanılır (yeni numara / akış yok)", () => {
  const btn = src("../components/WhatsAppButton.tsx");
  assert.ok(btn.includes(`"${TR_WHATSAPP_URL}"`), "TR bağlantısı yüzen düğmeyle birebir aynı olmalı");
  assert.equal(conciergeWhatsappUrl("tr"), TR_WHATSAPP_URL);
  assert.equal(conciergeWhatsappUrl(null), TR_WHATSAPP_URL);
  for (const l of GLOBAL_LOCALES) assert.equal(conciergeWhatsappUrl(l), GLOBAL_WHATSAPP_URL, l);
  assert.match(TR_WHATSAPP_URL, /^https:\/\/wa\.me\/\d+/);
});

test("oturum belirteci: yalnız API biçimi (43 karakter base64url) kabul edilir", () => {
  assert.equal(isSessionToken(TOKEN), true);
  assert.equal(isSessionToken("a_b-C".repeat(8) + "abc"), true);
  for (const bad of ["", "1", "A".repeat(42), "A".repeat(44), "A".repeat(42) + "=", "A".repeat(42) + " ", null, undefined, 1, {}]) assert.equal(isSessionToken(bad), false, String(bad));
});

test("durum önbelleği: 10 dk geçerli; bozuk / süresi dolmuş / gelecekten değer yeniden sordurur", () => {
  const now = 1_800_000_000_000;
  assert.equal(readStatusCache(writeStatusCache(true, now), now), true);
  assert.equal(readStatusCache(writeStatusCache(false, now), now + STATUS_TTL_MS), false);
  assert.equal(readStatusCache(writeStatusCache(true, now), now + STATUS_TTL_MS + 1), null);
  assert.equal(readStatusCache(writeStatusCache(true, now + 5 * 60_000), now), null);
  for (const bad of [null, undefined, "", "1", "true", "2:1800000000000", "1:abc", "1:1800000000000:x"]) assert.equal(readStatusCache(bad as never, now), null, String(bad));
});

// ============================================================================
// İstek
// ============================================================================
test("istek gövdesi: metin kırpılır ve 600 karakterle sınırlanır; yol sorgu dizesi / parça TAŞIMAZ", () => {
  const b = buildRequestBody("  merhaba  ", "en", "/en/product/red-roses?gclid=abc&utm_source=x#top", TOKEN);
  assert.deepEqual(b, { text: "merhaba", lang: "en", path: "/en/product/red-roses", session_token: TOKEN });
  assert.equal(buildRequestBody("x".repeat(900), "tr", "/", null).text.length, MAX_MESSAGE_CHARS);
  assert.equal("session_token" in buildRequestBody("a", "tr", "/", "uydurma"), false, "geçersiz belirteç gönderilmez");
  assert.equal(buildRequestBody("a", "tr", null, null).path, "/");
  assert.deepEqual(Object.keys(buildRequestBody("a", "tr", "/", TOKEN)).sort(), ["lang", "path", "session_token", "text"]);
});

test("gönderim kapısı: boş, çok uzun, bekleyen ya da kapalı oturumda gönderilmez", () => {
  assert.equal(canSend("merhaba", false, false), true);
  assert.equal(canSend("   ", false, false), false);
  assert.equal(canSend("x".repeat(MAX_MESSAGE_CHARS), false, false), true);
  assert.equal(canSend("x".repeat(MAX_MESSAGE_CHARS + 1), false, false), false);
  assert.equal(canSend("merhaba", true, false), false);
  assert.equal(canSend("merhaba", false, true), false);
});

// ============================================================================
// Yanıt doğrulama
// ============================================================================
test("kart bağlantısı: yalnız site içi yol; başka alan adı, http, //, javascript:, data: REDDEDİLİR", () => {
  assert.equal(cardPath("https://www.cicekyolla.com.tr/urun/11-kirmizi-gul"), "/urun/11-kirmizi-gul");
  assert.equal(cardPath("https://cicekyolla.com.tr/en/product/red-roses?x=1#y"), "/en/product/red-roses");
  assert.equal(cardPath("/de/produkt/rote-rosen"), "/de/produkt/rote-rosen");
  assert.equal(cardPath("https://www.cicekyolla.com.tr/ar/product/%D9%88%D8%B1%D8%AF"), "/ar/product/%D9%88%D8%B1%D8%AF");
  for (const bad of [
    "http://www.cicekyolla.com.tr/urun/a", "https://evil.example/urun/a", "https://www.cicekyolla.com.tr.evil.example/urun/a",
    "https://www.cicekyolla.com.tr@evil.example/urun/a", "https://user:pass@www.cicekyolla.com.tr/urun/a", "https://www.cicekyolla.com.tr:8443/urun/a",
    "//evil.example/urun/a", "javascript:alert(1)", "data:text/html,<script>1</script>", "/\\evil.example", "\\\\evil.example\\a", "/urun/a\nb",
    "/", "", "urun/a", "/urun/<script>", "/urun/a b", null, undefined, 5, {}, "x".repeat(600),
  ]) assert.equal(cardPath(bad as never), null, String(bad));
});

test("fotoğraf adresi: yalnız https ya da site içi yol", () => {
  assert.equal(safeImageUrl("https://pub-x.r2.dev/gul.webp"), "https://pub-x.r2.dev/gul.webp");
  assert.equal(safeImageUrl("/studio/gul.webp"), "/studio/gul.webp");
  for (const bad of ["http://pub-x.r2.dev/gul.webp", "//pub-x.r2.dev/gul.webp", "javascript:alert(1)", "data:image/png;base64,AAAA", "https://u:p@x.dev/a.webp", "", "gul.webp", "/\\x", null, 1]) {
    assert.equal(safeImageUrl(bad as never), null, String(bad));
  }
});

test("kartlar: eksik / geçersiz alanlı kart HİÇ gösterilmez; fiyat, ad, fotoğraf ve bağlantı yalnız API'den", () => {
  const good = parseCards([card(), card({ product_id: 8, tier: "economy", url: "/en/product/white-roses" }), card({ product_id: 9, tier: "premium" })]);
  assert.deepEqual(good.map((c) => [c.productId, c.tier, c.path]), [[7, "recommended", "/urun/11-kirmizi-gul"], [8, "economy", "/en/product/white-roses"], [9, "premium", "/urun/11-kirmizi-gul"]]);
  assert.deepEqual(good[0], { productId: 7, tier: "recommended", name: "11 Kırmızı Gül", priceMinor: 189900, path: "/urun/11-kirmizi-gul", imageUrl: "https://pub-x.r2.dev/gul.webp" });
  const bads = [
    card({ price_minor: 0 }), card({ price_minor: -1 }), card({ price_minor: "abc" }), card({ price_minor: 1899.5 }), card({ price_minor: null }),
    card({ url: "https://evil.example/urun/a" }), card({ url: "javascript:alert(1)" }), card({ url: null }),
    card({ image_url: "http://x/a.webp" }), card({ image_url: null }), card({ name: "" }), card({ name: "   " }), card({ name: null }),
    card({ product_id: 0 }), card({ product_id: "x" }), card({ product_id: 1.5 }), card({ currency: "EUR" }), card({ currency: "USD" }),
    null, "kart", 5, [],
  ];
  for (const b of bads) assert.deepEqual(parseCards([b]), [], JSON.stringify(b));
  assert.equal(parseCards([card({ tier: "ucuz" })])[0].tier, null, "tanınmayan dilim etiketsiz gösterilir");
  assert.equal(parseCards([card(), card()]).length, 1, "aynı ürün iki kez gösterilmez");
  assert.equal(parseCards(Array.from({ length: 30 }, (_, i) => card({ product_id: i + 1 }))).length, 10);
  for (const notList of [null, undefined, {}, "x", 5]) assert.deepEqual(parseCards(notList), []);
});

test("yanıt: başarılı tur — metin, dil, kartlar, oturum belirteci", () => {
  const o = parseTurn(200, okBody());
  assert.equal(o.kind, "reply");
  if (o.kind !== "reply") return;
  assert.equal(o.reply, "Üç seçenek hazırladım. Hangisini seversiniz?");
  assert.equal(o.lang, "tr");
  assert.equal(o.cards.length, 1);
  assert.equal(o.handoff, false);
  assert.equal(o.closed, false);
  assert.equal(o.sessionToken, TOKEN);
});

test("yanıt: 14 dilin hepsi tanınır; tanınmayan dil TR'ye düşer", () => {
  for (const l of LANGS) {
    const o = parseTurn(200, okBody({ lang: l }));
    assert.ok(o.kind === "reply" && o.lang === l, l);
  }
  for (const l of ["xx", "", null, 5, "EN"]) {
    const o = parseTurn(200, okBody({ lang: l }));
    assert.ok(o.kind === "reply" && o.lang === "tr", String(l));
  }
});

test("yanıt: WhatsApp devri, oturum sınırı ve günlük tavan durumları", () => {
  const handoff = parseTurn(200, okBody({ handoff: { reason: "customer_requested_human" }, cards: [] }));
  assert.ok(handoff.kind === "reply" && handoff.handoff === true && handoff.closed === false);
  const last = parseTurn(200, okBody({ remaining_messages: 0 }));
  assert.ok(last.kind === "reply" && last.closed === true, "son mesajdan sonra giriş kapanır");
  for (const status of ["limit", "unavailable"]) {
    const o = parseTurn(200, okBody({ status, cards: [card()], handoff: { reason: "x" }, remaining_messages: 0 }));
    assert.ok(o.kind === "reply" && o.closed === true && o.handoff === true, status);
    assert.ok(o.kind === "reply" && o.cards.length === 0, "sabit yanıtta kart gösterilmez");
  }
});

test("yanıt: meşgul, hız sınırı, kapalı bayrak ve hatalar ayrı sonuçlara çevrilir", () => {
  assert.deepEqual(parseTurn(409, { data: { status: "busy", session_token: TOKEN } }), { kind: "busy", sessionToken: TOKEN });
  assert.deepEqual(parseTurn(200, { data: { status: "busy", session_token: "kötü" } }), { kind: "busy", sessionToken: null });
  assert.deepEqual(parseTurn(429, { ok: false, error: "Çok fazla istek" }, "42"), { kind: "rate", retryAfterSeconds: 42 });
  assert.deepEqual(parseTurn(429, null, null), { kind: "rate", retryAfterSeconds: 60 });
  assert.deepEqual(parseTurn(429, null, "99999"), { kind: "rate", retryAfterSeconds: 3600 });
  assert.deepEqual(parseTurn(404, { error: "Not found" }), { kind: "off" });
  for (const [status, body] of [[500, null], [502, { error: "proxy_error" }], [503, { ok: false }], [422, { data: { status: "invalid", reason: "empty" } }], [200, null], [200, {}], [200, { data: null }], [200, "metin"], [200, { data: { status: "tuhaf", reply: "x" } }], [200, okBody({ reply: "" })], [200, okBody({ reply: "   " })], [200, okBody({ reply: 5 })]] as const) {
    assert.deepEqual(parseTurn(status, body), { kind: "error" }, `${status} ${JSON.stringify(body)}`);
  }
});

test("yanıt: tanınmayan / bozuk gövdeden ASLA metin üretilmez (uydurma yanıt gösterilmez)", () => {
  for (const body of [{ reply: "doğrudan kökte" }, { data: { reply: "durumsuz" } }, { data: { status: "ok" } }, { message: "x" }]) {
    assert.equal(parseTurn(200, body).kind, "error", JSON.stringify(body));
  }
  // Yanıt metni olduğu gibi (düz metin) taşınır; HTML ayrıştırılmaz, yalnız uzunluk sınırlanır.
  const html = parseTurn(200, okBody({ reply: '<img src=x onerror="alert(1)"><a href="https://evil.example">tıkla</a>' }));
  assert.ok(html.kind === "reply" && html.reply.includes("<img src=x"));
  const long = parseTurn(200, okBody({ reply: "a".repeat(5000) }));
  assert.ok(long.kind === "reply" && long.reply.length === 2000);
});

// ============================================================================
// Panel durumu
// ============================================================================
const reply = (over: Partial<Extract<TurnOutcome, { kind: "reply" }>> = {}): TurnOutcome => ({ kind: "reply", reply: "yanıt", lang: "tr", cards: [], handoff: false, closed: false, sessionToken: TOKEN, ...over });
const run = (actions: Parameters<typeof chatReducer>[1][], start: ChatState = INITIAL_CHAT) => actions.reduce(chatReducer, start);

test("durum: gönder → bekle → yanıt; mesajlar sırayla ve tekil kimlikle", () => {
  let s = run([{ type: "send", text: "  merhaba " }]);
  assert.equal(s.pending, true);
  assert.deepEqual(s.messages.map((m) => [m.role, m.text]), [["user", "merhaba"]]);
  s = chatReducer(s, { type: "outcome", outcome: reply({ reply: "Kime göndermek istersiniz?" }) });
  assert.equal(s.pending, false);
  assert.deepEqual(s.messages.map((m) => [m.role, m.text]), [["user", "merhaba"], ["assistant", "Kime göndermek istersiniz?"]]);
  assert.equal(new Set(s.messages.map((m) => m.id)).size, 2);
  assert.equal(s.error, null);
});

test("durum: yanıt beklenirken ikinci mesaj gönderilemez; boş mesaj yok sayılır", () => {
  const s = run([{ type: "send", text: "bir" }, { type: "send", text: "iki" }, { type: "send", text: "   " }]);
  assert.deepEqual(s.messages.map((m) => m.text), ["bir"]);
  assert.equal(run([{ type: "send", text: "   " }]), INITIAL_CHAT);
});

test("durum: hata → yeniden gönderilebilir metin saklanır; yeniden gönderim mesajı ÇİFTLEMEZ", () => {
  for (const [outcome, error] of [[{ kind: "error" }, "network"], [{ kind: "rate", retryAfterSeconds: 30 }, "rate"], [{ kind: "busy", sessionToken: null }, "busy"]] as const) {
    let s = run([{ type: "send", text: "gül istiyorum" }, { type: "outcome", outcome }]);
    assert.equal(s.pending, false);
    assert.equal(s.error, error);
    assert.equal(s.failedText, "gül istiyorum");
    assert.equal(s.messages.length, 1);
    s = run([{ type: "send", text: "gül istiyorum" }, { type: "outcome", outcome: reply() }], s);
    assert.deepEqual(s.messages.map((m) => [m.role, m.text]), [["user", "gül istiyorum"], ["assistant", "yanıt"]]);
    assert.equal(s.error, null);
    assert.equal(s.failedText, null);
  }
});

test("durum: oturum kapandıysa (sınır / günlük tavan) yeni mesaj yazılamaz ve WhatsApp düğmesi çıkar", () => {
  let s = run([{ type: "send", text: "merhaba" }, { type: "outcome", outcome: reply({ closed: true, reply: "Sınıra ulaştık." }) }]);
  assert.equal(s.closed, true);
  assert.equal(s.messages[1].handoff, true);
  const before = s;
  s = chatReducer(s, { type: "send", text: "bir daha" });
  assert.equal(s, before);
});

test("durum: bayrak kapandıysa panel kapanmak üzere işaretlenir; beklenmeyen yanıt yok sayılır", () => {
  const off = run([{ type: "send", text: "merhaba" }, { type: "outcome", outcome: { kind: "off" } }]);
  assert.equal(off.off, true);
  assert.equal(off.pending, false);
  assert.equal(chatReducer(INITIAL_CHAT, { type: "outcome", outcome: reply() }), INITIAL_CHAT, "gönderim yokken gelen yanıt eklenmez");
  const dismissed = chatReducer(run([{ type: "send", text: "a" }, { type: "outcome", outcome: { kind: "error" } }]), { type: "dismissError" });
  assert.equal(dismissed.error, null);
});

test("durum: kartlar ve devir bilgisi asistan mesajına bağlanır", () => {
  const cards = parseCards([card(), card({ product_id: 8 })]);
  const s = run([{ type: "send", text: "gül" }, { type: "outcome", outcome: reply({ cards, handoff: true, lang: "en" }) }]);
  assert.equal(s.messages[1].cards?.length, 2);
  assert.equal(s.messages[1].handoff, true);
  assert.equal(s.messages[1].lang, "en");
});

// ============================================================================
// 14 dil sözlüğü
// ============================================================================
test("14 dil: sohbet anahtarlarının tamamı her sözlükte dolu; değerler dile özgü", async () => {
  assert.equal(CONCIERGE_DICT_KEYS.length, 21);
  const dicts: Record<string, Record<string, string>> = {};
  for (const l of LANGS) dicts[l] = (await import(`./i18n/dict/${l}.ts`)).default as Record<string, string>;
  for (const l of LANGS) {
    for (const k of CONCIERGE_DICT_KEYS) {
      const v = dicts[l][k];
      assert.ok(typeof v === "string" && v.trim().length > 0, `${l}:${k}`);
      assert.ok(!/[<>]/.test(v), `${l}:${k} HTML içermemeli`);
      assert.ok(!/https?:\/\//.test(v), `${l}:${k} bağlantı içermemeli`);
      assert.ok(!/\d{3,}|₺|\bTL\b|€|\$/.test(v), `${l}:${k} fiyat / tutar içermemeli`);
    }
    assert.equal(Object.keys(dicts[l]).filter((k) => k.startsWith("concierge.")).length, CONCIERGE_DICT_KEYS.length, `${l}: fazla / eksik anahtar`);
  }
  // Çeviri gerçekten yapılmış: TR dışındaki dillerde uzun metinler TR ile aynı değil.
  for (const l of LANGS.filter((x) => x !== "tr")) {
    for (const k of ["concierge.greeting", "concierge.privacy", "concierge.errorNetwork", "concierge.quick1"] as const) {
      assert.notEqual(dicts[l][k], dicts.tr[k], `${l}:${k} çevrilmemiş`);
    }
  }
  // Yazı sistemi: Arapça, Rusça, Çince, Japonca, Korece karşılama kendi alfabesinde.
  assert.match(dicts.ar["concierge.greeting"], /[؀-ۿ]/);
  assert.match(dicts.ru["concierge.greeting"], /[Ѐ-ӿ]/);
  assert.match(dicts.zh["concierge.greeting"], /[一-鿿]/);
  assert.match(dicts.ja["concierge.greeting"], /[぀-ヿ]/);
  assert.match(dicts.ko["concierge.greeting"], /[가-힯]/);
  // Gizlilik notu her dilde kart uyarısı taşır (karşılama ve hızlı yanıtlar vaat / süre içermez).
  for (const l of LANGS) assert.ok(dicts[l]["concierge.privacy"].length > 30, l);
});

// ============================================================================
// Kaynak kilitleri — layout, rotalar, bileşenler
// ============================================================================
test("layout: başlatıcı TEK kez ve yüzen düğmelerden SONRA; mevcut düğme satırları değişmedi", () => {
  const layout = src("../app/layout.tsx");
  assert.equal((layout.match(/<ConciergeLauncher \/>/g) ?? []).length, 1);
  assert.equal((layout.match(/import \{ ConciergeLauncher \} from "@\/components\/concierge\/ConciergeLauncher";/g) ?? []).length, 1);
  assert.match(layout, /\n\s*<WhatsAppButton \/>\n\s*<TelegramButton \{\.\.\.telegram\} \/>\n/);
  assert.match(layout, /\n\s*<ScrollToTopButton \/>\n[^\n]*\n\s*<ConciergeLauncher \/>\n/);
  assert.ok(layout.indexOf("<ConciergeLauncher />") > layout.indexOf("<ScrollToTopButton />"));
  // Sağlayıcıların içinde (dil + para birimi), ConsentManager'dan önce.
  assert.ok(layout.indexOf("<ConciergeLauncher />") < layout.indexOf("</CurrencyProvider>"));
  assert.ok(layout.indexOf("<ConciergeLauncher />") < layout.indexOf("</I18nProvider>"));
});

test("mevcut yüzen düğmelere DOKUNULMADI (konum sınıfları aynen)", () => {
  assert.match(src("../components/WhatsAppButton.tsx"), /className=\{`fixed bottom-6 right-6 z-50 \$\{productPage \? "hidden lg:flex" : "flex"\}/);
  assert.match(src("../components/TelegramButton.tsx"), /right-6 z-50 w-12 h-12 lg:w-14 lg:h-14/);
  assert.match(src("../components/ScrollToTopButton.tsx"), /fixed right-6 bottom-\[calc\(152px\+env\(safe-area-inset-bottom\)\)\] lg:bottom-\[calc\(168px\+env\(safe-area-inset-bottom\)\)\] z-50/);
});

test("rotalar: bayrak kapalıyken API'ye GİDİLMEZ (önce env, sonra iletim); yalnız API'nin web asistanı uçlarına iletir", () => {
  for (const [file, apiPath] of [["../app/api/concierge/status/route.ts", "/api/public/concierge/status"], ["../app/api/concierge/message/route.ts", "/api/public/concierge/message"]] as const) {
    const s = src(file);
    const flag = s.indexOf('process.env.CONCIERGE_ENABLED !== "true"');
    const forward = s.indexOf("forwardToApi(request");
    assert.ok(flag > 0 && forward > flag, `${file}: bayrak denetimi iletimden önce olmalı`);
    assert.ok(s.includes(`path: "${apiPath}"`), file);
    assert.equal((s.match(/forwardToApi\(request/g) ?? []).length, 1);
    assert.ok(!/cookie: true|passSetCookie/.test(s), `${file}: üye çerezi iletilmez`);
    assert.ok(!/NEXT_PUBLIC_/.test(s), `${file}: bayrak tarayıcıya gömülmez`);
    assert.match(s, /status: 404|json\(404/);
  }
  const msg = src("../app/api/concierge/message/route.ts");
  assert.ok(msg.indexOf("MAX_BODY_BYTES") > 0 && msg.indexOf("> MAX_BODY_BYTES") < msg.indexOf("forwardToApi(request"), "gövde sınırı iletimden önce");
});

test("bileşenler: HTML enjeksiyonu yok; tarayıcı API'ye doğrudan gitmez; sepete / siparişe dokunmaz", () => {
  for (const f of ["../components/concierge/ConciergeLauncher.tsx", "../components/concierge/ConciergePanel.tsx"]) {
    const s = src(f);
    assert.ok(!/dangerouslySetInnerHTML|innerHTML|document\.write|eval\(/.test(s), `${f}: HTML enjeksiyonu`);
    assert.ok(!/useCart|addItem|@\/lib\/cart|\/api\/orders|\/api\/payment|checkout/i.test(s), `${f}: sepet / sipariş / ödeme kullanılmaz`);
    assert.ok(!/NEXT_PUBLIC_API_ORIGIN|skyversal|localStorage|document\.cookie/.test(s), `${f}: doğrudan API / kalıcı depolama / çerez yok`);
    for (const m of s.matchAll(/fetch\(\s*"([^"]+)"/g)) assert.match(m[1], /^\/api\/concierge\/(status|message)$/, `${f}: ${m[1]}`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(s), `${f}: sabit renk yok (yalnız tasarım tokenları)`);
  }
  const panel = src("../components/concierge/ConciergePanel.tsx");
  assert.match(panel, /href=\{card\.path\}/, "kart yalnız doğrulanmış site içi yola gider");
  assert.match(panel, /rel="nofollow noopener noreferrer"/);
  assert.match(panel, /maxLength=\{MAX_MESSAGE_CHARS\}/);
  assert.match(panel, /role="dialog"/);
  assert.match(panel, /aria-live="polite"/);
  const launcher = src("../components/concierge/ConciergeLauncher.tsx");
  assert.match(launcher, /lazy\(\(\) => import\("\.\/ConciergePanel"\)\)/, "panel ilk tıklamada yüklenir");
  assert.match(launcher, /if \(!enabled \|\| !ready \|\| !visibleHere\) return null;/, "bayrak kapalıyken hiçbir şey çizilmez");
  assert.match(launcher, /useState\(false\)/);
});

// ---------------------------------------------------------------------------
// Son inceleme (PR #318): 14 dilde gizli yollar · kapat/aç'ta geçmiş · sözleşme
// ---------------------------------------------------------------------------

test("görünürlük: sepet / ödeme / giriş / üyelik 14 dilin HEPSİNDE gizli (yollar öneksiz ve ortak; önekli biçim de gizli)", () => {
  const critical = ["/sepet", "/checkout", "/checkout/sonuc", "/odeme", "/hizli-siparis", "/giris", "/hesabim", "/hesabim/siparisler", "/sifre-belirle", "/sifremi-unuttum"];
  // Görünürlük yalnız yola bakar (dil parametresi yok) → dil çerezi ne olursa olsun sonuç aynıdır.
  assert.equal(conciergeVisibleOnPath.length, 1);
  for (const p of critical) assert.equal(conciergeVisibleOnPath(p), false, p);
  // Bu sayfalar dil öneki altında YOK: app/<dil>/ yalnız [[...path]] içerir; kritik rotalar kökte tek kopyadır.
  for (const l of GLOBAL_LOCALES) {
    assert.deepEqual(readdirSync(new URL(`../app/${l}`, import.meta.url)), ["[[...path]]"], `app/${l}`);
  }
  for (const d of ["sepet", "checkout", "giris", "hesabim", "sifre-belirle", "sifremi-unuttum", "hizli-siparis"]) {
    assert.ok(existsSync(new URL(`../app/${d}`, import.meta.url)), `app/${d}`);
  }
  // Savunma: önekli biçim bir gün eklenirse de gizli; dilin kendi vitrin sayfaları görünür kalır.
  for (const l of ["tr", ...GLOBAL_LOCALES]) {
    for (const p of critical) assert.equal(conciergeVisibleOnPath(`/${l}${p}`), false, `/${l}${p}`);
    assert.equal(conciergeVisibleOnPath(`/${l}`), true, `/${l}`);
    assert.equal(conciergeVisibleOnPath(`/${l}/category/roses`), true);
  }
  assert.equal(conciergeVisibleOnPath("/english-roses"), true, "dil koduyla başlayan sıradan yol etkilenmez");
});

test("geçmiş: sohbet durumu başlatıcıda tutulur → panel kapanıp açılınca mesajlar ve kartlar durur", () => {
  const launcher = src("../components/concierge/ConciergeLauncher.tsx");
  const panel = src("../components/concierge/ConciergePanel.tsx");
  assert.match(launcher, /useReducer\(chatReducer, INITIAL_CHAT\)/, "durum kök layout'ta yaşayan başlatıcıda");
  assert.match(launcher, /state=\{chat\} dispatch=\{dispatch\}/);
  assert.ok(!/useReducer/.test(panel), "panel kendi durumunu tutmaz (kapanınca silinmesin)");
  assert.ok(!/setItem\([^)]*messages/.test(launcher + panel), "mesaj metni depolamaya yazılmaz");
  // Panel kapalıyken gelen yanıt da işlenir: durum aynı reducer'da, panelden bağımsız.
  let s = chatReducer(INITIAL_CHAT, { type: "send", text: "Merhaba" });
  s = chatReducer(s, { type: "outcome", outcome: { kind: "reply", reply: "Üç seçenek", lang: "tr", cards: [], handoff: false, closed: false, sessionToken: null } });
  assert.deepEqual(s.messages.map((m) => m.role), ["user", "assistant"]);
  assert.equal(s.pending, false);
  // Yanıt beklenirken yeniden açılan panel ikinci isteği göndermez.
  assert.match(panel, /busyRef\.current \|\| pendingRef\.current/);
  assert.equal(chatReducer(chatReducer(INITIAL_CHAT, { type: "send", text: "a" }), { type: "send", text: "b" }).messages.length, 1);
  // Karta tıklanınca panel kapanır (ürün sayfasını örtmez); değiştirici tuşlu tıklamada açık kalır.
  assert.match(panel, /onClick=\{onClick\}/);
  assert.match(panel, /e\.button === 0 && !e\.metaKey && !e\.ctrlKey/);
});

test("sözleşme: Public istek / yanıt alanları API'ninkiyle aynı (webConcierge controller + coordinator)", () => {
  // İstek: API şeması .strict() → yalnız bu dört alan; fazlası 422.
  const body = buildRequestBody("x".repeat(900), "de", "/de/produkt/a?gclid=1#x", "A".repeat(43));
  assert.deepEqual(Object.keys(body).sort(), ["lang", "path", "session_token", "text"]);
  assert.ok(body.text.length <= 4000 && body.lang.length <= 8 && body.path.length <= 400 && body.session_token!.length <= 64);
  assert.deepEqual(Object.keys(buildRequestBody("a", "tr", "/", null)).sort(), ["lang", "path", "text"]);
  // Yanıt: API'nin döndürdüğü her durum arayüzde karşılanır.
  const ok = { session_token: "B".repeat(43), reply: "Merhaba", lang: "en", handoff: null, remaining_messages: 5,
    cards: [{ product_id: 7, tier: "recommended", name: "Rose", price_minor: 125000, currency: "TRY", url: "https://www.cicekyolla.com.tr/en/product/rose", image_url: "https://img.example/a.webp" }] };
  const r = parseTurn(200, { data: { status: "ok", ...ok } });
  assert.equal(r.kind, "reply");
  if (r.kind === "reply") { assert.equal(r.cards[0].path, "/en/product/rose"); assert.equal(r.cards[0].priceMinor, 125000); assert.equal(r.closed, false); }
  assert.equal(parseTurn(200, { data: { status: "limit", ...ok, cards: [], handoff: { reason: "session_limit" }, remaining_messages: 0 } }).kind, "reply");
  assert.equal(parseTurn(200, { data: { status: "unavailable", ...ok, cards: [], handoff: { reason: "budget" } } }).kind, "reply");
  assert.equal(parseTurn(409, { data: { status: "busy", session_token: "B".repeat(43) } }).kind, "busy");
  assert.equal(parseTurn(422, { data: { status: "invalid", reason: "too_long" } }).kind, "error");
  assert.equal(parseTurn(422, { ok: false, error: "Geçersiz istek." }).kind, "error");
  assert.equal(parseTurn(429, { ok: false }, "30").kind, "rate");
  assert.equal(parseTurn(503, { ok: false }).kind, "error");
  assert.equal(parseTurn(404, { error: "Not found" }).kind, "off");
  // İki bayrak: Public kapalıyken API'ye gidilmez; API kapalıyken 404 aynen iletilir → başlatıcı çizilmez.
  for (const f of ["status", "message"]) {
    const route = src(`../app/api/concierge/${f}/route.ts`);
    const gate = route.indexOf('process.env.CONCIERGE_ENABLED !== "true"');
    assert.ok(gate > 0 && gate < route.lastIndexOf("forwardToApi("), `${f}: bayrak kapısı iletmeden önce`);
  }
  assert.match(src("../components/concierge/ConciergeLauncher.tsx"), /on = res\.ok;/);
});

test("katman: panel ve arka planı site başlıklarının ÜSTÜNDE, çerez bandının ALTINDA çizilir (mobilde kapat düğmesi örtülmez)", () => {
  // Kaynak: 12 Kas 2026 canlı testi — 13 dil sayfasında mobilde çerez bandı açıkken panel yukarı itiliyor,
  // sabit üst başlık (V80Header, z-index 400) panelin kapat düğmesini ve arka planı örtüyordu (panel z-95 idi).
  const panel = src("../components/concierge/ConciergePanel.tsx");
  const z = (re: RegExp) => Number((re.exec(panel) ?? [])[1]);
  const panelZ = z(/fixed inset-x-0 bottom-0 z-\[(\d+)\]/);
  const backdropZ = z(/fixed inset-0 z-\[(\d+)\] bg-foreground/);
  const globalHeader = Number((/position: "sticky", top: 0, zIndex: (\d+)/.exec(src("../components/global/v80/V80Header.tsx")) ?? [])[1]);
  const trHeader = Number((/sticky top-0 z-(\d+)/.exec(src("../components/Header.tsx")) ?? [])[1]);
  const consent = src("../components/consent/ConsentManager.tsx");
  const bandZ = Math.min(...[...consent.matchAll(/data-cookie-banner=""\s*\n\s*className="[^"]*z-\[(\d+)\]/g)].map((m) => Number(m[1])));
  assert.ok(globalHeader > 0 && trHeader > 0 && Number.isFinite(bandZ), "başlık ve bant katmanları okunabildi");
  assert.ok(panelZ > globalHeader && panelZ > trHeader, `panel (${panelZ}) başlıkların üstünde`);
  assert.ok(backdropZ > globalHeader && backdropZ < panelZ, `arka plan (${backdropZ}) başlığın üstünde, panelin altında`);
  assert.ok(panelZ < bandZ, `panel (${panelZ}) çerez bandının (${bandZ}) altında; bant için ayrıca yukarı kayar`);
});


test("oturum: ekranda geçmiş yoksa (sayfa yenilendi / ilk mesaj) belirteç GÖNDERİLMEZ; geçmiş varken aynı oturum sürer", () => {
  const tok = "T".repeat(43);
  assert.equal(tokenToSend(0, tok), null, "yenileme sonrası boş ekran → yeni oturum");
  assert.equal(tokenToSend(2, tok), tok, "sayfa içi gezinmede geçmiş görünür → aynı oturum");
  assert.equal(tokenToSend(3, "bozuk"), null);
  assert.equal(tokenToSend(3, null), null);
  const panel = src("../components/concierge/ConciergePanel.tsx");
  assert.match(panel, /tokenToSend\(visibleRef\.current, readToken\(\)\)/, "panel belirteci yalnız bu kuralla gönderir");
  assert.ok(!/buildRequestBody\(raw, locale, pathname, readToken\(\)\)/.test(panel), "eski koşulsuz gönderim kalmadı");
});
