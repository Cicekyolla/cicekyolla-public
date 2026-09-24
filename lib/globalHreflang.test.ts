import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { withXDefault, X_DEFAULT_KEY, X_DEFAULT_LOCALE } from "./global/hreflang.ts";

/**
 * hreflang x-default (24 Eyl 2026) — canlı okumada 13 dilin hiçbir kümesinde x-default yoktu.
 * Kanun: x-default = kümedeki EN; EN yoksa alfabetik ilk; küme dışına işaret YOK; TR eklenmez.
 */

test("x-default: kümede EN varsa EN'e işaret eder; girdi değiştirilmez", () => {
  const input = { de: "https://www.cicekyolla.com.tr/de/istanbul", en: "https://www.cicekyolla.com.tr/en/istanbul" };
  const out = withXDefault(input);
  assert.equal(out[X_DEFAULT_KEY], input.en);
  assert.equal(X_DEFAULT_LOCALE, "en");
  assert.deepEqual(Object.keys(input), ["de", "en"], "girdi haritası mutasyona uğramaz");
  assert.equal(out.de, input.de);
});

test("x-default: EN kümede yoksa alfabetik ilk locale (küme dışına işaret edilmez)", () => {
  const out = withXDefault({ ru: "https://x/ru/p", de: "https://x/de/p", fr: "https://x/fr/p" });
  assert.equal(out[X_DEFAULT_KEY], "https://x/de/p");
});

test("x-default: boş küme dokunulmaz; mevcut x-default yeniden hesaplanır; TR asla eklenmez", () => {
  assert.deepEqual(withXDefault({}), {});
  const out = withXDefault({ "x-default": "https://x/eski", en: "https://x/en/p" });
  assert.equal(out[X_DEFAULT_KEY], "https://x/en/p");
  assert.equal("tr" in out, false);
});

test("kaynak nöbeti: lokasyon/ana sayfa, kategori ve ürün kümelerinin üçü de withXDefault'tan geçer", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  const n = src.split("withXDefault(languages)").length - 1;
  assert.equal(n, 3, "pageLanguages + kategori + ürün = 3 çağrı");
});
