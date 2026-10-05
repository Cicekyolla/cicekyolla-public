// JSON-LD güvenli serileştirme — davranış + kaynak taraması.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { escapeJsonLdText, safeJsonLd } from "./jsonLdSafe.ts";

const ROOT = join(import.meta.dirname, "..");

/** Tarayıcının script gövdesini nerede bitireceğini taklit eder: ilk `</script` dizisi. */
function scriptBodySeenByParser(html: string): string {
  const i = html.toLowerCase().indexOf("</script");
  return i === -1 ? html : html.slice(0, i);
}

test("safeJsonLd: </script> içeren metin script gövdesini erken kapatamaz ve içerik birebir korunur", () => {
  const value = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{ "@type": "Question", name: "Soru </script><img src=x onerror=alert(1)>", acceptedAnswer: { "@type": "Answer", text: "Cevap <!-- yorum --> </SCRIPT > son" } }],
  };
  const out = safeJsonLd(value);
  assert.equal(out.includes("<"), false, "çıktıda ham < kalmamalı");
  assert.equal(scriptBodySeenByParser(out), out, "ayrıştırıcı gövdeyi erken bitirmemeli");
  assert.deepEqual(JSON.parse(out), value, "şema içeriği değişmemeli");
});

test("safeJsonLd: normal Türkçe içerik, tırnak, kesme işareti ve Unicode aynen korunur", () => {
  const value = {
    name: "Çiçek \"Özel\" Buket — İstanbul'a aynı gün; ğüşiöç ĞÜŞİÖÇ",
    description: "Fiyat: 1.249,50 ₺ · 花 · زهور · 💐 · satır\nsonu \\ ters eğik",
    nested: { list: ["a", "b'c", 'd"e'], n: 12.5, ok: true, none: null },
  };
  const out = safeJsonLd(value);
  assert.deepEqual(JSON.parse(out), value);
  // `<` yoksa çıktı düz JSON.stringify ile BİREBİR aynıdır (mevcut şema metni değişmez).
  assert.equal(out, JSON.stringify(value));
});

test("escapeJsonLdText: önceden serileştirilmiş metinde de aynı koruma; idempotent", () => {
  const raw = JSON.stringify({ a: "x </script> y", b: "<b>kalın</b>" });
  assert.equal(scriptBodySeenByParser(raw) === raw, false, "ön koşul: ham metin gövdeyi erken kapatır");
  const once = escapeJsonLdText(raw);
  assert.equal(scriptBodySeenByParser(once), once);
  assert.deepEqual(JSON.parse(once), JSON.parse(raw));
  assert.equal(escapeJsonLdText(once), once, "iki kez uygulanınca değişmemeli");
});

// ── Kaynak taraması: JSON-LD basan HER script etiketi güvenli serileştiriciden geçmeli ──────────────
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

test("kaynak: application/ld+json basan her etiket güvenli serileştirici kullanır (ham JSON.stringify / ham değişken yok)", () => {
  const SAFE = /^(safeJsonLd|escapeJsonLdText|serializeJsonLd)\(/;
  const offenders: string[] = [];
  let emitters = 0;
  for (const file of [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components")), ...walk(join(ROOT, "lib"))]) {
    const src = readFileSync(file, "utf8");
    // <script … type="application/ld+json" … dangerouslySetInnerHTML={{ __html: <ifade> }}
    const tag = /<script\b(?:(?!\/>)[\s\S]){0,400}?type="application\/ld\+json"(?:(?!\/>)[\s\S]){0,400}?__html:\s*/g;
    while (tag.exec(src)) {
      emitters++;
      const expr = src.slice(tag.lastIndex, tag.lastIndex + 40);
      if (!SAFE.test(expr)) offenders.push(`${file.slice(ROOT.length + 1).replace(/\\/g, "/")}: __html: ${expr.split("\n")[0]}`);
    }
  }
  assert.ok(emitters >= 15, `taranan JSON-LD çıkışı beklenenden az: ${emitters}`);
  assert.deepEqual(offenders, [], "güvenli serileştiriciden geçmeyen JSON-LD çıkışı var");
});
