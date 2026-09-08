// GLOBAL VERSION 80 — hydration koruması: bileşen içi <style>{`…`}</style> metni ">" veya "&"
// içeremez. React sunucuda bu karakterleri "&gt;"/"&amp;" olarak kaçar; tarayıcı <style> (ham metin
// elemanı) içinde varlıkları ÇÖZMEZ → istemci metni ≠ DOM metni → React #425 → #418 → #423
// (bölüm istemcide yeniden çizilir). Tespit: 8 Eyl 2026, /en vitrin tanıtım kutusu (.v80-promo>div).
// Çalıştır: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "components", "global", "v80");

test("V80 bileşenlerinde satır içi <style> metni '>' veya '&' içermez (hydration uyuşmazlığı)", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".tsx"));
  assert.ok(files.length > 10, "V80 bileşenleri bulunmalı");
  for (const f of files) {
    const src = readFileSync(join(DIR, f), "utf8");
    for (const m of src.matchAll(/<style[^>]*>\{`([\s\S]*?)`\}<\/style>/g)) {
      const css = m[1];
      assert.ok(!/[>&]/.test(css), `${f}: satır içi <style> '>' veya '&' içeriyor — kuralı v80.css'e taşı → ${css.slice(0, 80)}`);
    }
  }
});

test("tanıtım kutusu (.v80-promo) kuralları v80.css'te, bileşende satır içi <style> yok", () => {
  const css = readFileSync(join(process.cwd(), "lib", "global", "v80", "v80.css"), "utf8");
  assert.match(css, /\.v80 \.v80-promo > div \{ min-width: 0; \}/);
  assert.match(css, /\.v80 \.v80-promo \{ grid-template-columns: 1fr !important; \}/);
  const shop = readFileSync(join(DIR, "V80Shop.tsx"), "utf8");
  assert.ok(!/<style[^>]*>\{/.test(shop), "V80Shop.tsx satır içi <style>{…} elemanı içermemeli");
});
