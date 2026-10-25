// lib/revalidateAuth.test.ts — yayın sonrası anında güncelleme (Tema & Sezon Adım 5, 25 Eki 2026).
// Çalıştırma: node --test lib/revalidateAuth.test.ts   (npm run test:unit)
//
// Korunanlar:
//   A) Anahtar yok / kısa → "not_configured" (uç kapalı; site 60 sn ISR ile güncellenmeye devam eder).
//   B) Yanlış / eksik / farklı uzunlukta anahtar → "unauthorized".
//   C) Doğru anahtar (baş/son boşluk tolere) → "ok".
//   D) KAYNAK: uç yalnız POST, homepage etiketini + "/" yolunu geçersizler, önbelleklenmez;
//      ana sayfa DTO + banner fetch'leri etiketli, revalidate 60 korunur.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkRevalidateSecret, MIN_SECRET_LENGTH } from "./revalidateAuth.ts";

const SECRET = "a".repeat(MIN_SECRET_LENGTH) + "-tema-sezon";
const oku = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("A) yapılandırılmamış", () => {
  assert.equal(checkRevalidateSecret(SECRET, undefined), "not_configured");
  assert.equal(checkRevalidateSecret(SECRET, ""), "not_configured");
  assert.equal(checkRevalidateSecret("kisa", "kisa"), "not_configured");
});

test("B) yetkisiz", () => {
  assert.equal(checkRevalidateSecret(null, SECRET), "unauthorized");
  assert.equal(checkRevalidateSecret("", SECRET), "unauthorized");
  assert.equal(checkRevalidateSecret(SECRET.slice(0, -1) + "x", SECRET), "unauthorized");
  assert.equal(checkRevalidateSecret(SECRET + "x", SECRET), "unauthorized");
});

test("C) doğru anahtar", () => {
  assert.equal(checkRevalidateSecret(SECRET, SECRET), "ok");
  assert.equal(checkRevalidateSecret(`  ${SECRET} `, `${SECRET}\n`), "ok");
});

test("D) KAYNAK: uç ve etiketler", () => {
  const route = oku("app/api/revalidate/route.ts");
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function GET/);
  assert.match(route, /revalidateTag\(HOMEPAGE_CACHE_TAG\)/);
  assert.match(route, /revalidatePath\("\/"\)/);
  assert.match(route, /force-dynamic/);
  const lib = oku("lib/homepage.ts");
  assert.equal((lib.match(/next: \{ revalidate: 60, tags: \[HOMEPAGE_CACHE_TAG\] \}/g) ?? []).length, 2);
});
