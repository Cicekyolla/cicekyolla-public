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
  validateRegister,
  normalizeTrMobile,
  formatTrMobile,
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

/* ── Kayıt ön denetimi (WAVE 2) — sunucu parseRegisterInput ile aynı kural ── */

test("TR cep normalizasyonu sunucuyla aynı kümeyi kabul eder", () => {
  for (const ok of ["0507 441 34 74", "5074413474", "+90 507 441 34 74", "905074413474", "0905074413474"]) {
    assert.equal(normalizeTrMobile(ok), "+905074413474", `reddedildi: ${ok}`);
  }
  // Sabit hat ve bozuk uzunluklar REDDEDİLİR (WhatsApp'a gönderilemez).
  for (const bad of ["0212 555 44 33", "212 555 44 33", "0507 441 34", "", "abc", "+1 415 555 2671"]) {
    assert.equal(normalizeTrMobile(bad), null, `kabul edildi: ${bad}`);
  }
});

test("telefon gösterimi 0xxx xxx xx xx biçiminde; geçersizse null", () => {
  assert.equal(formatTrMobile("+905074413474"), "0507 441 34 74");
  assert.equal(formatTrMobile("member-9f2a1c"), null);
  assert.equal(formatTrMobile(null), null);
});

test("kayıt: KVKK kutusu işaretlenmedikçe istek atılmaz (D6 — sabit true YOK)", () => {
  const base = { name: "Ayşe Yılmaz", phone: "0507 441 34 74", email: "a@b.com", password: "sifre1234", passwordAgain: "sifre1234" };
  const view = validateRegister({ ...base, kvkkOnay: false });
  assert.equal(view!.field, "kvkk");
  assert.match(view!.message, /Aydınlatma Metni/);
  assert.equal(validateRegister({ ...base, kvkkOnay: true }), null);
});

test("kayıt: şifre kuralı 8–200 ve eşleşme", () => {
  const base = { name: "Ad Soyad", phone: "0507 441 34 74", email: "a@b.com", kvkkOnay: true };
  assert.equal(validateRegister({ ...base, password: "1234567", passwordAgain: "1234567" })!.kind, "format");
  assert.match(validateRegister({ ...base, password: "1234567", passwordAgain: "1234567" })!.message, /en az 8/);
  assert.equal(validateRegister({ ...base, password: "a".repeat(201), passwordAgain: "a".repeat(201) })!.kind, "format");
  assert.match(
    validateRegister({ ...base, password: "sifre1234", passwordAgain: "sifre9999" })!.message,
    /eşleşmiyor/,
  );
});

test("kayıt: e-posta biçimi istemcide de doğrulanır", () => {
  const base = { name: "Ad Soyad", phone: "0507 441 34 74", password: "sifre1234", passwordAgain: "sifre1234", kvkkOnay: true };
  for (const bad of ["", "a", "a@b", "a@b.c", "bosluk var@b.com"]) {
    const view = validateRegister({ ...base, email: bad });
    assert.equal(view!.field, "email", `kabul edildi: ${bad}`);
  }
  assert.equal(validateRegister({ ...base, email: "ornek@email.com" }), null);
});

test("kayıt: sabit hat numarası sunucuya gitmeden açıklanır", () => {
  const view = validateRegister({
    name: "Ad Soyad", phone: "0212 555 44 33", email: "a@b.com",
    password: "sifre1234", passwordAgain: "sifre1234", kvkkOnay: true,
  });
  assert.equal(view!.field, "phone");
  assert.match(view!.message, /Sabit hat/);
});

test("pop-up formu: ad/telefon alanı YOKSA bu alanlar istenmez", () => {
  assert.equal(validateRegister({ email: "ornek@email.com", password: "sifre1234", kvkkOnay: true }), null);
  assert.equal(validateRegister({ email: "ornek@email.com", password: "kisa", kvkkOnay: true })!.field, "password");
  assert.equal(validateRegister({ email: "", password: "sifre1234", kvkkOnay: true })!.field, "email");
});
