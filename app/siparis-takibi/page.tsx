import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PackageSearch, Phone, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Sipariş Takibi — ÇiçekYolla",
  description: "ÇiçekYolla sipariş numaranız veya telefon numaranız ile siparişinizin durumunu güvenle takip edin.",
  robots: { index: false, follow: false },
};

export default function OrderTrackingPage() {
  return (
    <main className="bg-[#fbfafc] px-6 py-16 text-[#111827] lg:px-14 lg:py-24">
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[34px] bg-gradient-to-br from-[#160723] via-[#4c1d95] to-[#8b5cf6] p-10 text-white shadow-[0_30px_90px_rgba(45,22,72,.18)] lg:p-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[.24em] text-[#ede9fe]"><PackageSearch className="h-4 w-4" /> Sipariş Takibi</div>
          <h1 className="mt-10 font-serif text-5xl font-semibold leading-tight md:text-6xl">Çiçeğinizin yolculuğunu adım adım takip edin.</h1>
          <p className="mt-7 text-lg leading-8 text-[#e9d5ff]">Sipariş numaranız veya telefon numaranız ile hazırlık, kurye ve teslimat durumunu görüntüleyin.</p>
          <div className="mt-10 rounded-[24px] border border-white/15 bg-white/10 p-6 text-[#f5f3ff]"><ShieldCheck className="mb-3 h-6 w-6 text-[#ddd6fe]" /> Sipariş bilgileriniz yalnız doğrulama amacıyla kullanılır.</div>
        </section>

        <section className="rounded-[34px] border border-[#ede9fe] bg-white p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)] lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b5cf6]">Takip bilgileri</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold">Siparişinizi bulun</h2>
          <form className="mt-8 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-[#344054]">Sipariş numarası
              <input type="text" placeholder="Örn. CK8841" className="h-14 rounded-2xl border border-[#e5dbfb] px-4 outline-none focus:border-[#8b5cf6]" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#344054]">Telefon numarası
              <span className="flex items-center gap-3 rounded-2xl border border-[#e5dbfb] px-4 focus-within:border-[#8b5cf6]"><Phone className="h-5 w-5 text-[#8b5cf6]" /><input type="tel" placeholder="05XX XXX XX XX" className="h-14 flex-1 bg-transparent outline-none" /></span>
            </label>
            <button className="rounded-full bg-[#8b5cf6] px-8 py-4 text-lg font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)]">Siparişi Takip Et</button>
          </form>
          <div className="mt-8 rounded-[22px] bg-[#f7f5fc] p-6">
            <p className="font-bold text-[#111827]">Sipariş numaranızı bilmiyor musunuz?</p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">WhatsApp üzerinden bize ulaşın, telefon numaranızla siparişinizi birlikte bulalım.</p>
            <Link href="https://wa.me/905074413474" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-[#7c3aed]">WhatsApp Destek <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
