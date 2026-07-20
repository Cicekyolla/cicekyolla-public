"use client";

import type { Metadata } from "next";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, Lock, Mail, Phone, ShieldCheck, Sparkles, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Üye Girişi ve Kayıt — ÇiçekYolla",
  description: "ÇiçekYolla müşteri hesabı oluşturun, siparişlerinizi takip edin, adreslerinizi ve özel gün hatırlatmalarınızı yönetin.",
  robots: { index: false, follow: false },
};

const benefits = [
  "Siparişlerinizi tek ekrandan takip edin",
  "Adreslerinizi ve alıcı bilgilerinizi kaydedin",
  "Doğum günü ve özel gün hatırlatmaları alın",
  "Sadakat puanı ve özel müşteri fırsatlarını görün",
];

export default function LoginPage() {
  const router = useRouter();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

  async function submitAuth(endpoint: "login" | "register", payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com"}/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "İşlem sırasında bir hata oluştu.");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoginLoading(true); setLoginMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      await submitAuth("login", { identifier: form.get("identifier"), password: form.get("password") });
      setLoginMessage("Giriş başarılı, yönlendiriliyorsunuz…");
      router.push("/");
    } catch (error) { setLoginMessage(error instanceof Error ? error.message : "Giriş yapılamadı."); }
    finally { setLoginLoading(false); }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRegisterLoading(true); setRegisterMessage(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const passwordAgain = String(form.get("password_again") ?? "");
    if (password !== passwordAgain) { setRegisterMessage("Şifreler eşleşmiyor."); setRegisterLoading(false); return; }
    if (form.get("kvkk_onay") !== "on") { setRegisterMessage("KVKK onayı zorunludur."); setRegisterLoading(false); return; }
    try {
      await submitAuth("register", { name: form.get("name"), phone: form.get("phone"), email: form.get("email"), password, kvkk_onay: true });
      setRegisterMessage("Hesabınız oluşturuldu, yönlendiriliyorsunuz…");
      router.push("/");
    } catch (error) { setRegisterMessage(error instanceof Error ? error.message : "Kayıt oluşturulamadı."); }
    finally { setRegisterLoading(false); }
  }

  return (
    <main className="bg-[#fbfafc] px-6 py-16 text-[#111827] lg:px-14 lg:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[.95fr_1.05fr]">
        <section className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#160723] via-[#4c1d95] to-[#8b5cf6] p-10 text-white shadow-[0_30px_90px_rgba(45,22,72,.18)] lg:p-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[.24em] text-[#ede9fe]"><Sparkles className="h-4 w-4" /> ÇiçekYolla üyeliği</div>
          <h1 className="mt-10 font-serif text-5xl font-semibold leading-tight md:text-6xl">Müşteri hesabınızı oluşturun, siparişleriniz hep elinizin altında olsun.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#e9d5ff]">Üye olarak hızlı sipariş verebilir, teslimat adreslerinizi saklayabilir ve size özel çiçek önerilerini hesabınızda görebilirsiniz.</p>
          <div className="mt-10 space-y-4">
            {benefits.map((item) => <div key={item} className="flex items-center gap-3 text-[#f5f3ff]"><CheckCircle2 className="h-5 w-5 text-[#d8b4fe]" />{item}</div>)}
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
            <form onSubmit={handleLogin} className="mt-8 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">E-posta veya telefon
                <span className="flex items-center gap-3 rounded-2xl border border-[#e5dbfb] px-4"><Mail className="h-5 w-5 text-[#8b5cf6]" /><input name="identifier" required type="text" placeholder="info@ornek.com veya 05XX" className="h-14 flex-1 bg-transparent outline-none" /></span>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Şifre
                <span className="flex items-center gap-3 rounded-2xl border border-[#e5dbfb] px-4"><Lock className="h-5 w-5 text-[#8b5cf6]" /><input name="password" required type="password" placeholder="Şifreniz" className="h-14 flex-1 bg-transparent outline-none" /><Eye className="h-5 w-5 text-[#98a2b3]" /></span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-[#667085]"><input type="checkbox" className="h-4 w-4 accent-[#8b5cf6]" /> Beni hatırla</label><Link href="/sifremi-unuttum" className="font-semibold text-[#8b5cf6]">Şifremi unuttum</Link></div>
              <button type="submit" disabled={loginLoading} className="mt-2 rounded-full bg-[#8b5cf6] px-8 py-4 text-lg font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)]">{loginLoading ? "Giriş yapılıyor…" : "Giriş Yap"}</button>
              {loginMessage && <p role="status" className="text-sm text-[#667085]">{loginMessage}</p>}
            </form>
          </div>

          <div className="rounded-[30px] border border-[#ede9fe] bg-white p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)]">
            <p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b5cf6]">Yeni müşteri</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold">Üye olun</h2>
            <form onSubmit={handleRegister} className="mt-8 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Ad Soyad<input name="name" required type="text" placeholder="Adınız Soyadınız" className="h-14 rounded-2xl border border-[#e5dbfb] px-4 outline-none" /></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Telefon<span className="flex items-center gap-3 rounded-2xl border border-[#e5dbfb] px-4"><Phone className="h-5 w-5 text-[#8b5cf6]" /><input name="phone" required type="tel" placeholder="0507 441 34 74" className="h-14 flex-1 bg-transparent outline-none" /></span></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054] md:col-span-2">E-posta<input name="email" required type="email" placeholder="ornek@email.com" className="h-14 rounded-2xl border border-[#e5dbfb] px-4 outline-none" /></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Şifre<input name="password" required type="password" minLength={8} placeholder="En az 8 karakter" className="h-14 rounded-2xl border border-[#e5dbfb] px-4 outline-none" /></label>
              <label className="grid gap-2 text-sm font-semibold text-[#344054]">Şifre Tekrar<input name="password_again" required type="password" minLength={8} placeholder="Şifrenizi tekrar girin" className="h-14 rounded-2xl border border-[#e5dbfb] px-4 outline-none" /></label>
              <label className="flex items-start gap-3 text-sm leading-6 text-[#667085] md:col-span-2"><input name="kvkk_onay" type="checkbox" className="mt-1 h-4 w-4 accent-[#8b5cf6]" /> KVKK aydınlatma metnini ve üyelik koşullarını okudum, kabul ediyorum.</label>
              <button type="submit" disabled={registerLoading} className="rounded-full bg-[#111827] px-8 py-4 text-lg font-bold text-white md:col-span-2">{registerLoading ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}</button>
              {registerMessage && <p role="status" className="text-sm text-[#667085] md:col-span-2">{registerMessage}</p>}
            </form>
            <div className="mt-6 flex items-center gap-3 rounded-[18px] bg-[#f7f5fc] p-4 text-sm text-[#667085]"><ShieldCheck className="h-5 w-5 text-[#8b5cf6]" /> Sipariş ve üyelik verileri güvenli bağlantı üzerinden işlenir.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
