import test from "node:test";
import assert from "node:assert/strict";
import {
  isEmailLike,
  looksLikePhone,
  isHumanMessage,
  viewForResponse,
  viewForThrown,
  validateLogin,
  validateResetRequest,
  validateNewPassword,
  KIMLIK_HATASI,
} from "./authErrors.ts";

test("teknik metin ASLA kullanıcı mesajı sayılmaz", () => {
  for (const raw of [
    "proxy_error",
    "internal_error",
    "validation_error",
    "500",
    "Failed to fetch",
    "ECONNRESET",
    "TypeError: Failed to fetch",
    "at /app/src/server.ts:42",
    "",
    null,
    undefined,
    42,
  ]) {
    assert.equal(isHumanMessage(raw), false, `sızdı: ${String(raw)}`);
  }
});

test("sunucunun Türkçe kullanıcı cümlesi geçerlidir (API mesajlarının TAMAMI)", () => {
  for (const m of [
    "Bağlantı geçersiz veya süresi dolmuş.",
    "Bu e-posta veya telefon başka bir hesaba bağlı. Destek ile iletişime geçin.",
    "Bu e-posta veya telefon zaten kayıtlı.",
    "E-posta ve telefon farklı müşterilere bağlı.",
    "E-posta veya telefon zorunludur.",
    "E-posta/telefon veya şifre hatalı.",
    "KVKK onayı zorunludur.",
    "Üye hesabı bulunamadı.",
    "Üye oturumu gerekli.",
    "Şifre 8-200 karakter olmalıdır.",
  ]) assert.equal(isHumanMessage(m), true, `reddedildi: ${m}`);
});

test("401/403 → hesap sayımı yapmayan tek mesaj", () => {
  const a = viewForResponse(401, { error: "E-posta/telefon veya şifre hatalı." });
  const b = viewForResponse(403, { error: "forbidden" });
  assert.equal(a.message, KIMLIK_HATASI);
  assert.equal(b.message, KIMLIK_HATASI);
  assert.equal(a.kind, "credentials");
  // Sunucu ne derse desin, "bu e-posta kayıtlı değil" bilgisi SIZDIRILMAZ.
  assert.ok(!/kayıtlı değil|bulunamadı|yok/i.test(a.message));
});

test("5xx ve proxy_error kullanıcıya teknik metin göstermez", () => {
  for (const st of [500, 502, 503, 504]) {
    const v = viewForResponse(st, { error: "proxy_error" });
    assert.equal(v.kind, "server");
    assert.ok(!/proxy|error|5\d\d/i.test(v.message), `sızdı: ${v.message}`);
  }
});

test("429 → hız sınırı mesajı", () => {
  const v = viewForResponse(429, {});
  assert.equal(v.kind, "rateLimit");
  assert.match(v.message, /Çok fazla deneme/);
});

test("400/422 → sunucunun Türkçe doğrulama cümlesi kullanılır", () => {
  assert.equal(viewForResponse(400, { error: "KVKK onayı zorunludur." }).message, "KVKK onayı zorunludur.");
  assert.equal(viewForResponse(422, { error: "validation_error" }).message, "Girdiğiniz bilgilerde bir eksik var. Lütfen kontrol edin.");
});

test("409 → çakışma mesajı", () => {
  assert.equal(
    viewForResponse(409, { error: "Bu e-posta veya telefon zaten kayıtlı." }).message,
    "Bu e-posta veya telefon zaten kayıtlı.",
  );
  assert.equal(viewForResponse(409, { error: "duplicate" }).kind, "conflict");
  assert.ok(!/duplicate/i.test(viewForResponse(409, { error: "duplicate" }).message));
});

test("fetch throw → ağ mesajı, teknik ad yok", () => {
  const v = viewForThrown(new TypeError("Failed to fetch"));
  assert.equal(v.kind, "network");
  assert.ok(!/fetch|TypeError/i.test(v.message));
  const abort = viewForThrown(Object.assign(new Error("x"), { name: "AbortError" }));
  assert.match(abort.message, /zaman aşımı/i);
});

test("e-posta / telefon tanıma", () => {
  assert.equal(isEmailLike("ornek@email.com"), true);
  assert.equal(isEmailLike("ornek@email"), false);
  assert.equal(isEmailLike("05551234567"), false);
  assert.equal(looksLikePhone("0555 123 45 67"), true);
  assert.equal(looksLikePhone("+90 555 123 45 67"), true);
  assert.equal(looksLikePhone("123"), false);
  assert.equal(looksLikePhone("ornek@email.com"), false);
});

test("giriş ön denetimi: boş alanlar ilgili alanı işaretler", () => {
  assert.equal(validateLogin("", "")!.field, "identifier");
  assert.equal(validateLogin("", "sifre1234")!.field, "identifier");
  assert.equal(validateLogin("ornek@email.com", "")!.field, "password");
  assert.equal(validateLogin("ornek@email.com", "sifre1234"), null);
  assert.equal(validateLogin("05551234567", "sifre1234"), null);
});

test("giriş ön denetimi: geçersiz biçim", () => {
  const v = validateLogin("abc", "sifre1234");
  assert.equal(v!.kind, "format");
  assert.equal(v!.field, "identifier");
});

test("şifre sıfırlama talebi ön denetimi", () => {
  assert.equal(validateResetRequest("")!.kind, "empty");
  assert.equal(validateResetRequest("abc")!.kind, "format");
  assert.equal(validateResetRequest("ornek@email.com"), null);
  assert.equal(validateResetRequest("0555 123 45 67"), null);
});

test("yeni şifre ön denetimi sunucu kuralıyla (8-200) uyumlu", () => {
  assert.equal(validateNewPassword("", "")!.kind, "empty");
  assert.equal(validateNewPassword("1234567", "1234567")!.kind, "format");
  assert.equal(validateNewPassword("12345678", "87654321")!.field, "password");
  assert.match(validateNewPassword("12345678", "87654321")!.message, /eşleşmiyor/);
  assert.equal(validateNewPassword("12345678", "12345678"), null);
  assert.equal(validateNewPassword("a".repeat(201), "a".repeat(201))!.kind, "format");
});
