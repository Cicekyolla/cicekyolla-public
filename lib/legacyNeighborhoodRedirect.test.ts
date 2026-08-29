// lib/legacyNeighborhoodRedirect.test.ts — legacy mahalle 301'lerinin
// davranış testleri. AĞ YOKTUR: fetch stub'lanır.
//
// Çalıştırma: node --test lib/legacyNeighborhoodRedirect.test.ts
//
// Kapsanan riskler:
//   - normal trafikte boşuna ağ isteği yapılmaması (ön eleme kapısı)
//   - normalizasyon (slash / sorgu / fragment / yüzde kodu / büyük harf)
//   - API erişilemezse BUGÜNKÜ davranışın korunması (fail-safe null)
//   - tahmin üretilmemesi (404 -> null)
//   - döngü koruması (hedef == kaynak)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const {
  looksLikeLegacyNeighborhood,
  resolveLegacyNeighborhoodRedirect,
} = await import("./legacy-neighborhood-redirect.ts");

/** Sahte sözlük — gerçek TSV API deposunda; burada davranış sınanır. */
const SOZLUK: Record<string, string> = {
  "/adiyaman-besni-cakmak-mahallesi-(akdurak-koyu)-cicekci":
    "/adiyaman/besni/cakmak-mah-akdurak-koyu",
  "/adana-ceyhan-cakaldere-mahallesi-cicekci": "/adana/ceyhan/cakaldere-mah",
};

let istekSayisi = 0;
let mod: "normal" | "hata" | "bos" | "dongu" = "normal";

function stub() {
  istekSayisi = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
    istekSayisi += 1;
    if (mod === "hata") throw new Error("ag hatasi");
    const u = new URL(String(input));
    const p = decodeURIComponent(u.searchParams.get("path") ?? "");
    if (mod === "dongu") return { ok: true, status: 200, json: async () => ({ data: { to: p } }) };
    if (mod === "bos") return { ok: true, status: 200, json: async () => ({ data: {} }) };
    const to = SOZLUK[p];
    if (!to) return { ok: false, status: 404, json: async () => ({ error: "not_found" }) };
    return { ok: true, status: 200, json: async () => ({ data: { to } }) };
  };
}

test("ön eleme kapısı: yalnız '-cicekci' ile biten yollar", () => {
  for (const evet of [
    "/adana-ceyhan-cakaldere-mahallesi-cicekci",
    "/adana-ceyhan-cakaldere-mahallesi-cicekci/",
    "/adana-ceyhan-cakaldere-mahallesi-cicekci?x=1",
    "/ADANA-CEYHAN-X-CICEKCI",
  ]) {
    assert.equal(looksLikeLegacyNeighborhood(evet), true, evet);
  }
  for (const hayir of [
    "/",
    "/istanbul",
    "/istanbul/kadikoy/moda-mah",
    "/kategori/guller",
    "/sepet",
    "/masa-cicekleri",
    "/istanbul-cicekleri",
    "-cicekci",
  ]) {
    assert.equal(looksLikeLegacyNeighborhood(hayir), false, hayir);
  }
});

test("normal trafikte HİÇ ağ isteği yapılmaz", async () => {
  stub();
  for (const p of ["/", "/sepet", "/checkout", "/kategori/guller", "/istanbul/kadikoy/moda-mah"]) {
    assert.equal(await resolveLegacyNeighborhoodRedirect(p), null, p);
  }
  assert.equal(istekSayisi, 0, "legacy olmayan yol için ağa çıkılmamalı");
});

test("bilinen eski URL birebir current hedefe çözülür", async () => {
  stub();
  mod = "normal";
  assert.equal(
    await resolveLegacyNeighborhoodRedirect("/adana-ceyhan-cakaldere-mahallesi-cicekci"),
    "/adana/ceyhan/cakaldere-mah",
  );
});

test("normalizasyon varyantları aynı hedefe gider", async () => {
  stub();
  mod = "normal";
  const beklenen = "/adiyaman/besni/cakmak-mah-akdurak-koyu";
  for (const v of [
    "/adiyaman-besni-cakmak-mahallesi-(akdurak-koyu)-cicekci",
    "/adiyaman-besni-cakmak-mahallesi-(akdurak-koyu)-cicekci/",
    "/adiyaman-besni-cakmak-mahallesi-(akdurak-koyu)-cicekci?utm=1",
    "/adiyaman-besni-cakmak-mahallesi-(akdurak-koyu)-cicekci#a",
    "/adiyaman-besni-cakmak-mahallesi-%28akdurak-koyu%29-cicekci",
    "/ADIYAMAN-BESNI-CAKMAK-MAHALLESI-(AKDURAK-KOYU)-CICEKCI",
  ]) {
    assert.equal(await resolveLegacyNeighborhoodRedirect(v), beklenen, v);
  }
});

test("sözlükte olmayan legacy yol için TAHMİN ÜRETİLMEZ", async () => {
  stub();
  mod = "normal";
  assert.equal(await resolveLegacyNeighborhoodRedirect("/boyle-bir-yer-yok-mahallesi-cicekci"), null);
});

test("FAIL-SAFE: API hatasında null — bugünkü davranış korunur", async () => {
  stub();
  mod = "hata";
  assert.equal(await resolveLegacyNeighborhoodRedirect("/xyz-bir-yer-mahallesi-cicekci"), null);
  mod = "normal";
});

test("bozuk yanıt (hedef yok) null döner", async () => {
  stub();
  mod = "bos";
  assert.equal(await resolveLegacyNeighborhoodRedirect("/baska-bir-yer-mahallesi-cicekci"), null);
  mod = "normal";
});

test("DÖNGÜ KORUMASI: hedef kaynağın kendisiyse yönlendirme yok", async () => {
  stub();
  mod = "dongu";
  assert.equal(await resolveLegacyNeighborhoodRedirect("/dongu-testi-mahallesi-cicekci"), null);
  mod = "normal";
});

test("önbellek: aynı yol için ikinci kez ağa çıkılmaz", async () => {
  stub();
  mod = "normal";
  const p = "/adana-ceyhan-cakaldere-mahallesi-cicekci";
  await resolveLegacyNeighborhoodRedirect(p);
  const sonra = istekSayisi;
  await resolveLegacyNeighborhoodRedirect(p);
  await resolveLegacyNeighborhoodRedirect(p + "/");
  assert.equal(istekSayisi, sonra, "önbellek isabet etmeli");
});

test("REGRESYON: olumsuz sonuc KISA sureli onbelleklenir", () => {
  // Bir 'hedef yok' yaniti kalici gercek degildir: API'nin deploy/soguk
  // baslatma penceresinde donen gecici bir 404 uzun TTL ile saklanirsa, o
  // legacy URL bir gun boyunca ilceye dusmeye devam eder. Production'da
  // tam bu yasandi. Sabitler kaynak metninden dogrulanir.
  const src = readFileSync(
    path.join(import.meta.dirname, "legacy-neighborhood-redirect.ts"),
    "utf8",
  );
  const say = (ad: string): number => {
    const m = src.match(new RegExp("const " + ad + " = ([^;]+);"));
    assert.ok(m, ad + " bulunamadi");
    return Function("return (" + m[1] + ")")() as number;
  };
  const olumlu = say("TTL_MS"), olumsuz = say("NEGATIVE_TTL_MS");
  assert.ok(olumsuz < olumlu, "olumsuz TTL, olumlu TTL'den kisa olmali");
  assert.ok(olumsuz <= 15 * 60_000, "olumsuz TTL en fazla 15 dakika olmali");
  assert.ok(
    src.includes("expiresAt: Date.now() + (to ? TTL_MS : NEGATIVE_TTL_MS)"),
    "olumlu/olumsuz TTL ayrimi kaybolmus",
  );
});
