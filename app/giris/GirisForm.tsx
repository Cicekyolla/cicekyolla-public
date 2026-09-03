"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Eye, EyeOff, Lock, Mail, Phone, Shield, Sparkles, UserRound } from "lucide-react";
import { FormAlert } from "@/components/auth/FormAlert";
import {
  validateLogin,
  viewForResponse,
  viewForThrown,
  isEmailLike,
  type AuthErrorView,
} from "@/lib/authErrors";

const benefits = [
  "Siparişlerinizi tek ekrandan takip edin",
  "Hazırlanıyor, yolda ve teslim edildi zamanlarını görün",
  "Teslim edilen siparişlerden sadakat puanı kazanın",
  "Hesabınıza tanımlanan kuponları görün",
];

/** Hata/başarı ayrımı: eskiden ikisi de aynı gri metindi. */
type Feedback = { tone: "error" | "success"; message: string; field?: AuthErrorView["field"] } | null;

const FIELD_ERROR = "border-[#FCA5A5] bg-[#FFFBFB]";
const FIELD_OK = "border-[#e5dbfb]";

export default function GirisForm() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/hesabim");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("next");
    if (requested?.startsWith("/") && !requested.startsWith("//")) setNextPath(requested);
  }, []);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<Feedback>(null);
  const [registerFeedback, setRegisterFeedback] = useState<Feedback>(null);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Tek istek yolu. Hata artık ASLA ham gösterilmez: durum koduna ve gövdeye
   * göre lib/authErrors.ts çevirir (teknik metin sızmaz, hesap sayımı yapılmaz).
   */
  async function submitAuth(endpoint: "login" | "register", payload: Record<string, unknown>): Promise<AuthErrorView | null> {
    let response: Response;
    try {
      response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return viewForThrown(error);
    }
    if (response.ok) return null;
    const body = await response.json().catch(() => null);
    return viewForResponse(response.status, body);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") ?? "").trim();
    const loginPassword = String(form.get("password") ?? "");

    const preflight = validateLogin(identifier, loginPassword);
    if (preflight) {
      setLoginFeedback({ tone: "error", message: preflight.message, field: preflight.field });
      return;
    }

    setLoginLoading(true);
    setLoginFeedback(null);
    const failure = await submitAuth("login", { identifier, password: loginPassword });
    setLoginLoading(false);
    if (failure) {
      setLoginFeedback({ tone: "error", message: failure.message, field: failure.field });
      return;
    }
    setLoginFeedback({ tone: "success", message: "Giriş başarılı, yönlendiriliyorsunuz…" });
    router.push(nextPath);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const passwordAgain = String(form.get("password_again") ?? "");

    const fail = (message: string, field?: AuthErrorView["field"]) => {
      setRegisterFeedback({ tone: "error", message, field });
    };
    if (!name) return fail("Ad ve soyadınızı girin.", "name");
    if (!phone) return fail("Telefon numaranızı girin.", "phone");
    if (!email) return fail("E-posta adresinizi girin.", "email");
    if (!isEmailLike(email)) return fail("Geçerli bir e-posta adresi girin.", "email");
    if (password.length < 8) return fail("Şifreniz en az 8 karakter olmalı.", "password");
    if (password !== passwordAgain) return fail("Şifreler eşleşmiyor. İki alana da aynı şifreyi yazın.", "password");
    if (form.get("kvkk_onay") !== "on") return fail("Devam etmek için KVKK aydınlatma metnini onaylayın.");

    setRegisterLoading(true);
    setRegisterFeedback(null);
    const failure = await submitAuth("register", { name, phone, email, password, kvkk_onay: true });
    setRegisterLoading(false);
    if (failure) {
      setRegisterFeedback({ tone: "error", message: failure.message, field: failure.field });
      return;
    }
    setRegisterFeedback({ tone: "success", message: "Hesabınız oluşturuldu, yönlendiriliyorsunuz…" });
    router.push(nextPath);
  }

  const loginError = loginFeedback?.tone === "error" ? loginFeedback : null;
  const registerError = registerFeedback?.tone === "error" ? registerFeedback : null;
  const markLogin = (field: AuthErrorView["field"]) => (loginError?.field === field ? FIELD_ERROR : FIELD_OK);
  const markRegister = (field: AuthErrorView["field"]) => (registerError?.field === field ? FIELD_ERROR : FIELD_OK);

  return (
    <main className="bg-[#fbfafc] px-6 py-16 text-[#111827] lg:px-14 lg:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[.95fr_1.05fr]">
        <section className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#160723] via-[#4c1d95] to-[#8b5cf6] p-10 text-white shadow-[0_30px_90px_rgba(45,22,72,.18)] lg:p-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[.24em] text-[#ede9fe]"><Sparkles className="h-4 w-4" /> ÇiçekYolla üyeliği</div>
          <h1 className="mt-10 font-serif text-5xl font-semibold leading-tight md:text-6xl">Müşteri hesabınızı oluşturun, siparişleriniz hep elinizin altında olsun.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#e9d5ff]">Üye olarak sipariş durumlarını tarih ve saatleriyle takip edebilir, teslim edilen siparişlerden kazandığınız puanları ve gerçek kuponlarınızı görebilirsiniz.</p>
          <div className="mt-10 space-y-4">
            {benefits.map((item) => <div key={item} className="flex items-center gap-3 text-[#f5f3ff]"><Check className="h-5 w-5 text-[#d8b4fe]" />{item}</div>)}
          </div>
          <div className="mt-12 rounded-[24px] border border-white/15 bg-white/10 p-6">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#ddd6fe]">Güvenli müşteri alanı</p>
            <p className="mt-3 leading-7 text-[#e9d5ff]">Kişisel bilgileriniz yalnız sipariş, teslimat ve müşteri hizmetleri süreçleri için kullanılır.</p>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="rounded-[30px] border border-[#ede9fe] bg-white p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)]">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b5cf6]">Üye girişi</p>
                <h2 className="mt-3 font-serif text-4xl font-semibold">Hesabınıza giriş yapın</h2>
              </div>
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#f3edff] text-[#8b5cf6]"><UserRound className="h-7 w-7" /></span>
            </div>
            <form noValidate onSubmit={handleLogin} className="mt-8 grid gap-4">
              {/* Hata formun İÇİNDE, alanların hemen üstünde ve kırmızı. */}
              {loginFeedback && (
                <FormAlert id="giris-hata" tone={loginFeedback.tone} message={loginFeedback.message} />
              )}
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">E-posta veya telefon
                <span className={`flex items-center gap-3 rounded-2xl border px-4 ${markLogin("identifier")}`}>
                  <Mail className="h-5 w-5 text-[#8b5cf6]" />
                  <input
                    name="identifier"
                    required
                    type="text"
                    autoComplete="username"
                    aria-invalid={loginError?.field === "identifier" || undefined}
                    aria-describedby={loginError ? "giris-hata" : undefined}
                    placeholder="info@ornek.com veya 05XX"
                    className="h-14 flex-1 bg-transparent outline-none"
                  />
                </span>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Şifre
                <span className={`flex items-center gap-3 rounded-2xl border px-4 ${markLogin("password")}`}>
                  <Lock className="h-5 w-5 text-[#8b5cf6]" />
                  <input
                    name="password"
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={loginError?.field === "password" || undefined}
                    aria-describedby={loginError ? "giris-hata" : undefined}
                    placeholder="Şifreniz"
                    className="h-14 flex-1 bg-transparent outline-none"
                  />
                  {/* Göz ikonu artık gerçekten çalışıyor (eskiden süstü). */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    className="grid h-9 w-9 place-items-center rounded-full text-[#98a2b3] transition-colors hover:bg-[#f5f3ff] hover:text-[#8b5cf6]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-[#667085]"><input type="checkbox" className="h-4 w-4 accent-[#8b5cf6]" /> Beni hatırla</label><Link href="/sifremi-unuttum" className="font-semibold text-[#8b5cf6]">Şifremi unuttum</Link></div>
              <button type="submit" disabled={loginLoading} className="mt-2 rounded-full bg-[#8b5cf6] px-8 py-4 text-lg font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)] disabled:opacity-60">{loginLoading ? "Giriş yapılıyor…" : "Giriş Yap"}</button>
            </form>
          </div>

          <div id="uye-ol" className="scroll-mt-6 rounded-[30px] border border-[#ede9fe] bg-white p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)]">
            <p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b5cf6]">Yeni müşteri</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold">Üye olun</h2>
            <form noValidate onSubmit={handleRegister} className="mt-8 grid gap-4 md:grid-cols-2">
              {registerFeedback && (
                <div className="md:col-span-2">
                  <FormAlert id="kayit-hata" tone={registerFeedback.tone} message={registerFeedback.message} />
                </div>
              )}
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Ad Soyad<input name="name" required type="text" autoComplete="name" aria-invalid={registerError?.field === "name" || undefined} aria-describedby={registerError ? "kayit-hata" : undefined} placeholder="Adınız Soyadınız" className={`h-14 rounded-2xl border px-4 outline-none ${markRegister("name")}`} /></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Telefon<span className={`flex items-center gap-3 rounded-2xl border px-4 ${markRegister("phone")}`}><Phone className="h-5 w-5 text-[#8b5cf6]" /><input name="phone" required type="tel" autoComplete="tel" aria-invalid={registerError?.field === "phone" || undefined} aria-describedby={registerError ? "kayit-hata" : undefined} placeholder="0507 441 34 74" className="h-14 flex-1 bg-transparent outline-none" /></span></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054] md:col-span-2">E-posta<input name="email" required type="email" autoComplete="email" aria-invalid={registerError?.field === "email" || undefined} aria-describedby={registerError ? "kayit-hata" : undefined} placeholder="ornek@email.com" className={`h-14 rounded-2xl border px-4 outline-none ${markRegister("email")}`} /></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Şifre<input name="password" required type="password" autoComplete="new-password" minLength={8} aria-invalid={registerError?.field === "password" || undefined} aria-describedby={registerError ? "kayit-hata" : undefined} placeholder="En az 8 karakter" className={`h-14 rounded-2xl border px-4 outline-none ${markRegister("password")}`} /></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Şifre Tekrar<input name="password_again" required type="password" autoComplete="new-password" minLength={8} aria-invalid={registerError?.field === "password" || undefined} aria-describedby={registerError ? "kayit-hata" : undefined} placeholder="Şifrenizi tekrar girin" className={`h-14 rounded-2xl border px-4 outline-none ${markRegister("password")}`} /></label>
              <label className="flex items-start gap-3 text-sm leading-6 text-[#667085] md:col-span-2"><input name="kvkk_onay" type="checkbox" className="mt-1 h-4 w-4 accent-[#8b5cf6]" /> KVKK aydınlatma metnini ve üyelik koşullarını okudum, kabul ediyorum.</label>
              <button type="submit" disabled={registerLoading} className="rounded-full bg-[#111827] px-8 py-4 text-lg font-bold text-white disabled:opacity-60 md:col-span-2">{registerLoading ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}</button>
            </form>
            <div className="mt-6 flex items-center gap-3 rounded-[18px] bg-[#f7f5fc] p-4 text-sm text-[#667085]"><Shield className="h-5 w-5 text-[#8b5cf6]" /> Sipariş ve üyelik verileri güvenli bağlantı üzerinden işlenir.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
