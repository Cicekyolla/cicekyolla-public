"use client";

import { useEffect, useState } from "react";
import { LogOut, Package, Ticket, UserRound } from "lucide-react";

type Coupon = { id: number; name: string; code: string; percentage: number | null; status: string; usage_limit: number; used_count: number; };
type Account = { customer: { name: string; email: string; phone: string | null }; coupons: Coupon[]; orders: unknown[]; };

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("Oturum açmanız gerekiyor.");
        if (!res.ok) throw new Error("Hesap bilgileri alınamadı.");
        return res.json();
      })
      .then(setAccount)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) return <main className="min-h-[60vh] bg-[#fbfafc] px-6 py-16 text-center text-[#667085]">Hesabınız yükleniyor…</main>;
  if (error || !account) return <main className="min-h-[60vh] bg-[#fbfafc] px-6 py-16 text-center text-[#667085]"><p>{error || "Hesap bulunamadı."}</p><a href="/giris" className="mt-5 inline-block rounded-full bg-[#8b5cf6] px-6 py-3 font-bold text-white">Giriş Yap</a></main>;

  const initials = account.customer.name.split(/\s+/).map((v) => v[0]).join("").slice(0, 2).toUpperCase();

  return <main className="min-h-[70vh] bg-[#fbfafc] px-6 py-12 text-[#111827] lg:px-14 lg:py-16">
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-[24px] border border-[#cdbdff] bg-white p-8 shadow-[0_18px_55px_rgba(45,22,72,.05)]">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#8b5cf6] text-xl font-bold text-white">{initials}</span>
          <div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b5cf6]">Müşteri paneli</p><h1 className="mt-2 text-3xl font-black text-[#1e1b4b]">Hoş geldiniz, {account.customer.name}</h1><p className="mt-2 text-[#667085]">{account.customer.email}</p></div>
        </div>
        <button onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-[#e6e9f0] px-5 py-3 font-bold text-[#667085]"><LogOut className="h-4 w-4" /> Çıkış Yap</button>
      </section>

      <section className="rounded-[24px] border border-[#e6e9f0] bg-white p-7 shadow-[0_18px_55px_rgba(45,22,72,.05)]">
        <div className="flex items-center gap-3"><Ticket className="h-6 w-6 text-[#8b5cf6]" /><h2 className="text-xl font-bold">Kuponlarım</h2></div>
        {account.coupons.length === 0 ? <p className="mt-6 rounded-[18px] bg-[#f7f5fc] p-5 text-[#667085]">Henüz kullanılabilir kuponunuz bulunmuyor.</p> :
          <div className="mt-6 grid gap-4 md:grid-cols-2">{account.coupons.map((coupon) => <article key={coupon.id} className="rounded-[20px] border border-[#e5dbfb] bg-[#fbf9ff] p-6"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#1e1b4b]">{coupon.name}</p><p className="mt-2 inline-block rounded-full bg-[#f1ebff] px-3 py-1 text-sm font-black tracking-wide text-[#7c3aed]">{coupon.code}</p></div><strong className="text-3xl font-black text-[#8b5cf6]">%{coupon.percentage ?? 0}</strong></div><p className="mt-5 text-sm text-[#667085]">{coupon.status === "available" ? "İlk siparişinizde kullanılabilir · Tek kullanım" : "Kullanıldı"}</p></article>)}</div>}
      </section>

      <section className="rounded-[24px] border border-[#e6e9f0] bg-white p-7 shadow-[0_18px_55px_rgba(45,22,72,.05)]"><div className="flex items-center gap-3"><Package className="h-6 w-6 text-[#8b5cf6]" /><h2 className="text-xl font-bold">Siparişlerim</h2></div><p className="mt-5 text-[#667085]">{account.orders.length ? "Siparişleriniz yükleniyor." : "Henüz siparişiniz bulunmuyor."}</p></section>
    </div>
  </main>;
}
