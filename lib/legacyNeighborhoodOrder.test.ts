// lib/legacyNeighborhoodOrder.test.ts — middleware SIRA garantileri.
//
// NEDEN KAYNAK METNİ OKUNUYOR: middleware.ts "next/server" ve @/ alias'larını
// import ettiği için node --test altında doğrudan çalıştırılamaz. Buradaki
// riskler sıralamayla ilgili olduğundan kaynak metni üzerinde sabitlenir
// (managedRedirectGuard.test.ts ile aynı desen).
//
// Korunan davranışlar:
//   #183  SEO Dili döngü guard'ı (legacyMuaf) legacy mahalle kuralından ÖNCE
//   #184  "-cicekleri" kuralı ve gerçek kategori koruması ÖNCE
//   yeni  legacy mahalle 301'i, ilçeye düşüren resolveLegacyLocation'dan ÖNCE
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(import.meta.dirname, "..", "middleware.ts"), "utf8");

const yer = (parca: string): number => {
  const i = SRC.indexOf(parca);
  assert.notEqual(i, -1, `middleware.ts içinde bulunamadı: ${parca}`);
  return i;
};

test("#183 KORUNDU: döngü guard'ı (legacyMuaf) legacy mahalle kuralından ÖNCE hesaplanır", () => {
  assert.ok(
    yer("const legacyMuaf") < yer("resolveLegacyNeighborhoodRedirect(req.nextUrl.pathname)"),
    "legacyMuaf önce gelmeli, yoksa SEO Dili hedefleri yutulur",
  );
});

test("#183 KORUNDU: legacy mahalle kuralı legacyMuaf ile devre dışı bırakılabiliyor", () => {
  assert.match(
    SRC,
    /const legacyMahalle = legacyMuaf\s*\?\s*null\s*:\s*await resolveLegacyNeighborhoodRedirect/,
    "yönetilen 301 hedefleri legacy mahalle kuralına GİRMEMELİ",
  );
});

test("#184 KORUNDU: '-cicekleri' kuralı ve kategori kurtarma legacy mahalleden ÖNCE", () => {
  const mahalle = yer("resolveLegacyNeighborhoodRedirect(req.nextUrl.pathname)");
  assert.ok(yer("resolveCicekleriLegacy(req.nextUrl.pathname)") < mahalle, "-cicekleri önce");
  assert.ok(yer("resolveKategoriLegacy(req.nextUrl.pathname)") < mahalle, "kategori kurtarma önce");
  assert.ok(yer("resolveSayfaLegacy(req.nextUrl.pathname)") < mahalle, "sayfa kuralı önce");
});

test("YENİ: legacy mahalle 301'i, ilçeye düşüren resolveLegacyLocation'dan ÖNCE", () => {
  assert.ok(
    yer("resolveLegacyNeighborhoodRedirect(req.nextUrl.pathname)") <
      yer("resolveLegacyLocation(req.nextUrl.pathname)"),
    "sonra gelirse 28.133 URL yine ilçe sayfasına düşer",
  );
});

test("tek hop: legacy mahalle yönlendirmesi 301 ve tek adım", () => {
  const blok = SRC.slice(
    yer("const legacyMahalle"),
    yer("const legacyLocation: LegacyLocationResult"),
  );
  assert.match(blok, /NextResponse\.redirect\(new URL\(legacyMahalle, req\.nextUrl\.origin\), 301\)/);
  assert.ok(!/30[278]\s*\)/.test(blok), "301 dışında bir kod kullanılmamalı");
});

test("REGRESYON: mevcut kuralların hiçbiri silinmedi", () => {
  for (const kural of [
    "isManagedRedirectTarget",
    "resolveCicekleriLegacy",
    "resolveSayfaLegacy",
    "resolveKategoriLegacy",
    "resolveLegacyLocation",
    "resolveMidCicek",
    "guardedCategoryTarget",
    "locationFallback",
    "resolveManagedRedirect",
    "isGlobalLocalePath",
  ]) {
    assert.ok(SRC.includes(kural), `kural kayboldu: ${kural}`);
  }
});

test("REGRESYON: matcher DEĞİŞMEDİ (bu iş kapsamında genişletilmedi)", () => {
  // 331 noktalı legacy kaynak matcher dışında kalır — bilinçli kapsam dışı
  // ("351 dotted matcher" ayrı temizlik işi). Matcher'ı burada genişletmek
  // #184'te yaşanan önek regresyonu sınıfını geri getirebilirdi.
  assert.ok(SRC.includes('"/:slug([a-z-]+)-cicekleri"'), "#184 dar matcher girdisi duruyor");
  assert.ok(SRC.includes('"/:slug([a-z-]+)-cicekleri-:id(\\\\d+)"'), "#184 id varyantı duruyor");
  assert.ok(SRC.includes(".*\\\\..*"), "noktalı yol dışlaması bu PR'da değiştirilmedi");
});
