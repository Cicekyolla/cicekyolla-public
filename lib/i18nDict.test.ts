import test from "node:test";
import assert from "node:assert/strict";
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
import { LOCALES, parseLangCookie, DEFAULT_LOCALE } from "./i18n/config.ts";

const DICTS: Record<string, Record<string, string>> = { tr, en, ar, zh, nl, de, it, ja, pt, ko, ru, es, az, fr };

test("14 dil tanımlı ve Figma 117 sırası korunuyor", () => {
  assert.equal(LOCALES.length, 14);
  assert.deepEqual(LOCALES.map((l) => l.code), ["tr", "en", "ar", "zh", "nl", "de", "it", "ja", "pt", "ko", "ru", "es", "az", "fr"]);
  assert.equal(LOCALES.find((l) => l.code === "ar")?.dir, "rtl");
  assert.equal(LOCALES.filter((l) => l.dir === "rtl").length, 1);
});

test("her sözlükte TR'nin tüm anahtarları dolu (missing = 0)", () => {
  const keys = Object.keys(tr);
  for (const [code, d] of Object.entries(DICTS)) {
    const missing = keys.filter((k) => typeof d[k] !== "string" || d[k].trim().length === 0);
    assert.deepEqual(missing, [], `${code}: eksik ${missing.length}`);
    const extra = Object.keys(d).filter((k) => !(k in tr));
    assert.deepEqual(extra, [], `${code}: fazla anahtar`);
  }
});

test("placeholder değişkenleri her dilde TR ile aynı", () => {
  const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
  for (const [code, d] of Object.entries(DICTS)) {
    for (const k of Object.keys(tr)) {
      assert.deepEqual(vars(d[k]), vars(tr[k as keyof typeof tr]), `${code}:${k} placeholder uyuşmuyor`);
    }
  }
});

test("marka adı ÇiçekYolla hiçbir dilde çevrilmiyor; teknik anahtar metin olarak yok", () => {
  for (const [code, d] of Object.entries(DICTS)) {
    assert.ok(d["header.home"].includes("ÇiçekYolla"), `${code}: marka adı`);
    for (const [k, v] of Object.entries(d)) assert.ok(!/^[a-z]+\.[a-zA-Z.]+$/.test(v), `${code}:${k} anahtar sızdı`);
  }
});

test("parseLangCookie: geçerli/geçersiz/boş", () => {
  assert.equal(parseLangCookie("a=1; cy_lang=de; b=2"), "de");
  assert.equal(parseLangCookie("cy_lang=xx"), DEFAULT_LOCALE);
  assert.equal(parseLangCookie(""), DEFAULT_LOCALE);
  assert.equal(parseLangCookie(null), DEFAULT_LOCALE);
  assert.equal(parseLangCookie("mycy_lang=en"), DEFAULT_LOCALE);
});
