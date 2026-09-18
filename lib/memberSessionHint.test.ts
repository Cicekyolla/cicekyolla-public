// Üst bar hesap girişi (dalga 3 düzeltme 1) + önbellek/kişisel veri koruması
// (düzeltme 2). Saf eşlemeler + KAYNAK korumaları: bir sonraki düzenleme
// oturum durumunu SSR'a ya da kişisel bir alanı header'a taşırsa bu testler kırılır.
// Çalıştır: node --test lib/memberSessionHint.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MEMBER_SESSION_HINT_KEY,
  MEMBER_SESSION_HINT_TTL_MS,
  clearSessionHint,
  headerAccountEntry,
  memberStateFromStatus,
  parseHint,
  readSessionHint,
  serializeHint,
  writeSessionHint,
  type HintStorage,
} from "./memberSessionHint.ts";
import tr from "./i18n/dict/tr.ts";
import en from "./i18n/dict/en.ts";
import ar from "./i18n/dict/ar.ts";
import zh from "./i18n/dict/zh.ts";
import nl from "./i18n/dict/nl.ts";
import de from "./i18n/dict/de.ts";
import it from "./i18n/dict/it.ts";
import ja from "./i18n/dict/ja.ts";
import pt from "./i18n/dict/pt.ts";
import ko from "./i18n/dict/ko.ts";
import ru from "./i18n/dict/ru.ts";
import es from "./i18n/dict/es.ts";
import az from "./i18n/dict/az.ts";
import fr from "./i18n/dict/fr.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const HEADER = read("../components/Header.tsx");
const ACCOUNT_PAGE = read("../app/hesabim/page.tsx");
const LAYOUT = read("../app/layout.tsx");

/** Header'daki oturum effect'i (yalnız o blok üzerinde iddia kurulur). */
function sessionEffect(): string {
  const start = HEADER.indexOf('fetch("/api/account"');
  assert.ok(start > 0, "Header oturum probu bulunamadı");
  const end = HEADER.indexOf("}, []);", start);
  assert.ok(end > start, "effect sonu bulunamadı");
  return HEADER.slice(start, end);
}

/* ─────────────── Düzeltme 1: bağlantı hedefi ve etiketi ─────────────── */

test("oturum açmış üye /hesabim'e gider, etiket Hesabım anahtarıdır", () => {
  assert.deepEqual(headerAccountEntry("member"), {
    href: "/hesabim",
    labelKey: "header.account",
    shortLabelKey: "header.accountShort",
  });
  assert.equal(tr["header.account"], "Hesabım");
  assert.equal(tr["header.accountShort"], "Hesap");
});

test("misafir ve BİLİNMEYEN durum bugünkü görünümün AYNISI (/giris + header.login)", () => {
  const guest = { href: "/giris", labelKey: "header.login", shortLabelKey: "header.loginShort" };
  assert.deepEqual(headerAccountEntry("guest"), guest);
  // SSR daima "unknown" ile boyar: önbellekli HTML bugünküyle birebir aynı olmalı.
  assert.deepEqual(headerAccountEntry("unknown"), guest);
  assert.equal(tr["header.login"], "Giriş Yap / Üye Ol");
  assert.equal(tr["header.loginShort"], "Üyelik");
});

test("durum YALNIZ yanıt kodundan: 200 üye, 401/403 misafir, 5xx bilinmiyor", () => {
  assert.equal(memberStateFromStatus(200), "member");
  assert.equal(memberStateFromStatus(401), "guest");
  assert.equal(memberStateFromStatus(403), "guest");
  // 502 = proxy_error (apiProxyHeaders). Geçici hata üyeyi çıkmış GÖSTERMEZ.
  assert.equal(memberStateFromStatus(502), "unknown");
  assert.equal(memberStateFromStatus(500), "unknown");
  assert.equal(memberStateFromStatus(0), "unknown");
});

test("Header üst barında hesap bağlantısı sabit /giris DEĞİL, saf eşlemeden gelir", () => {
  assert.match(HEADER, /<Link href=\{accountEntry\.href\}/);
  assert.match(HEADER, /\{t\(accountEntry\.labelKey\)\}/);
  assert.match(HEADER, /\{t\(accountEntry\.shortLabelKey\)\}/);
  assert.match(HEADER, /const accountEntry = headerAccountEntry\(sessionState\);/);
  // Eski sabit bağlantı geri gelirse (oturum yok sayılırsa) kırılır.
  assert.ok(!/<Link href="\/giris"/.test(HEADER), "üst barda sabit /giris bağlantısı kalmamalı");
});

test("Hesabım kendi yanıtından header'ı besler (giriş/çıkış sonrası bayat etiket yok)", () => {
  assert.match(ACCOUNT_PAGE, /noteMemberSession\("member"\)/);
  assert.match(ACCOUNT_PAGE, /noteMemberSession\("guest"\)/);
  // İki çıkış yolu da ipucunu siler.
  assert.equal(ACCOUNT_PAGE.split("forgetMemberSession()").length - 1, 2);
  // İpucuna YALNIZ sabit durum yazılır; hesap gövdesinden bir alan geçirilmez.
  for (const call of ACCOUNT_PAGE.match(/noteMemberSession\([^)]*\)/g) ?? []) {
    assert.match(call, /^noteMemberSession\("(member|guest)"\)$/, call);
  }
});

/* ─────────── Düzeltme 2: önbellek güvenliği + kişisel veri sızmaz ─────────── */

test("oturum durumu SSR'a girmez: başlangıç unknown, okuma useEffect içinde", () => {
  assert.match(HEADER, /^"use client";/);
  assert.match(HEADER, /useState<MemberSessionState>\("unknown"\)/);
  const probeAt = HEADER.indexOf('fetch("/api/account"');
  const effectStart = HEADER.lastIndexOf("useEffect(() => {", probeAt);
  assert.ok(effectStart > 0, "prob bir useEffect içinde olmalı");
  assert.ok(sessionEffect().length > 0);
  // Header oturumu PROP olarak almaz (aksi halde sunucu render'ına girerdi).
  assert.match(HEADER, /export function Header\(\{ menu, nav, search, brand \}/);
  const propsBlock = HEADER.slice(HEADER.indexOf("export interface HeaderBrand"), HEADER.indexOf("export function Header"));
  assert.ok(!/session|account|member/i.test(propsBlock), "Header prop sözleşmesine oturum alanı eklenmemeli");
});

test("layout Header'a oturum/kişisel veri geçirmez (önbellekli HTML temiz kalır)", () => {
  const open = LAYOUT.indexOf("<Header ");
  assert.ok(open > 0, "<Header ... /> bulunamadı");
  const tag = LAYOUT.slice(open, LAYOUT.indexOf("/>", open));
  assert.ok(!/session|account|member|customer|email|phone/i.test(tag), `layout Header'a oturum verisi geçiriyor: ${tag}`);
});

test("prob önbelleklenmez, çerezi taşır ve GÖVDEYİ HİÇ okumaz", () => {
  const effect = sessionEffect();
  assert.match(effect, /cache: "no-store"/);
  assert.match(effect, /credentials: "include"/);
  assert.match(effect, /memberStateFromStatus\(response\.status\)/);
  // Gövde ayrıştırılmadığı için ad/e-posta/telefon header state'ine giremez.
  assert.ok(!/\.json\(/.test(effect), "hesap gövdesi header'da ayrıştırılmamalı");
  assert.ok(!/response\.(text|body)/.test(effect), "gövde okunmamalı");
});

test("Hesabım istemci ekranıdır: kişisel veri önbelleklenebilir HTML'e girmez", () => {
  assert.match(ACCOUNT_PAGE, /^"use client";/);
  assert.ok(!/export const revalidate\b/.test(ACCOUNT_PAGE), "revalidate export olmamalı");
  const at = ACCOUNT_PAGE.indexOf('fetch("/api/account"');
  assert.ok(at > 0, "Hesabım kendi verisini istemcide çeker");
  const fetchCall = ACCOUNT_PAGE.slice(at, at + 120);
  assert.match(fetchCall, /cache: "no-store"/);
  assert.match(fetchCall, /credentials: "include"/);
});

test("/api/account proxy'si tek upstream yolundan geçer → yanıt private, no-store", () => {
  // Header'ın probu ve Hesabım aynı ucu okur; başlığı forwardToApi koyar
  // (apiProxyHeaders: "cache-control: private, no-store"). Route kendi fetch'ini
  // kurarsa o başlık kaybolur ve üye yanıtı bir ara katmanda önbelleklenebilir.
  const route = read("../app/api/account/route.ts");
  assert.match(route, /forwardToApi\(/);
  assert.match(route, /cookie: true/);
  assert.ok(!/\bfetch\(/.test(route), "route kendi upstream fetch'ini kurmamalı");
  assert.match(read("./apiProxyHeaders.ts"), /"cache-control": "private, no-store"/);
});

test("ipucu kaydı YALNIZ durum + zaman damgası taşır (kişisel alan yok)", () => {
  const record = JSON.parse(serializeHint("member", 1_700_000_000_000)) as Record<string, unknown>;
  assert.deepEqual(Object.keys(record).sort(), ["at", "state"]);
  assert.equal(record.state, "member");
  const src = read("./memberSessionHint.ts");
  // Yazma yolu tek: serializeHint. Başka bir setItem eklenirse kırılır.
  assert.equal(src.split("setItem(").length - 1, 2);
  assert.match(src, /storage\.setItem\(MEMBER_SESSION_HINT_KEY, serializeHint\(state, now\)\)/);
});

/* ─────────────────────── İpucu: bayat/bozuk kayıt ─────────────────────── */

test("parseHint: taze kayıt okunur, bayat/bozuk/ileri tarihli kayıt yok sayılır", () => {
  const now = 1_700_000_000_000;
  assert.equal(parseHint(serializeHint("member", now), now), "member");
  assert.equal(parseHint(serializeHint("guest", now - 1000), now), "guest");
  assert.equal(parseHint(serializeHint("member", now - MEMBER_SESSION_HINT_TTL_MS - 1), now), "unknown");
  // Saat geri alınmış / ileri tarihli kayıt.
  assert.equal(parseHint(serializeHint("member", now + 5000), now), "unknown");
  assert.equal(parseHint("{bozuk", now), "unknown");
  assert.equal(parseHint(JSON.stringify({ state: "admin", at: now }), now), "unknown");
  assert.equal(parseHint(JSON.stringify({ state: "member" }), now), "unknown");
  assert.equal(parseHint(JSON.stringify({ state: "member", at: "dun" }), now), "unknown");
  assert.equal(parseHint(null, now), "unknown");
  assert.equal(parseHint("", now), "unknown");
});

test("storage yok / firlatiyorsa (gizli sekme) ekran calismaya devam eder", () => {
  const now = 1_700_000_000_000;
  const throwing: HintStorage = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("SecurityError"); },
    removeItem() { throw new Error("SecurityError"); },
  };
  assert.equal(readSessionHint(throwing, now), "unknown");
  assert.doesNotThrow(() => writeSessionHint(throwing, "member", now));
  assert.doesNotThrow(() => clearSessionHint(throwing));
  assert.equal(readSessionHint(null, now), "unknown");
  assert.doesNotThrow(() => writeSessionHint(undefined, "guest", now));
  assert.doesNotThrow(() => clearSessionHint(null));
});

test("ipucu turu: yaz, oku, sil", () => {
  const now = 1_700_000_000_000;
  const map = new Map<string, string>();
  const storage: HintStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
  writeSessionHint(storage, "member", now);
  assert.equal(readSessionHint(storage, now), "member");
  assert.equal(map.size, 1);
  assert.ok(map.has(MEMBER_SESSION_HINT_KEY));
  clearSessionHint(storage);
  assert.equal(readSessionHint(storage, now), "unknown");
});

/* ────────────────────────── 14 sözlük paritesi ────────────────────────── */

test("header.account + header.accountShort 14 sözlüğün HEPSİNDE dolu ve anahtar sızmıyor", () => {
  const DICTS: Record<string, Record<string, string>> = { tr, en, ar, zh, nl, de, it, ja, pt, ko, ru, es, az, fr };
  assert.equal(Object.keys(DICTS).length, 14);
  for (const [code, dict] of Object.entries(DICTS)) {
    for (const key of ["header.account", "header.accountShort"]) {
      const value = dict[key];
      assert.equal(typeof value, "string", `${code}: ${key} yok`);
      assert.ok(value.trim().length > 0, `${code}: ${key} bos`);
      assert.ok(!/^[a-z]+\.[a-zA-Z.]+$/.test(value), `${code}: ${key} ham anahtar`);
    }
    // Giriş etiketleri DEĞİŞMEDİ (oturum açmamış görünüm aynı kalır).
    assert.ok(dict["header.login"].trim().length > 0, `${code}: header.login`);
    assert.ok(dict["header.loginShort"].trim().length > 0, `${code}: header.loginShort`);
  }
});
