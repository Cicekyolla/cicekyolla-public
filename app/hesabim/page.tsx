import type { Metadata } from "next";
import Link from "next/link";
import { Gift, LogOut, MapPin, Package, Settings, ShieldCheck, Star, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Hesabım — ÇiçekYolla",
  description: "ÇiçekYolla müşteri panelinizde siparişlerinizi, adreslerinizi, sadakat puanlarınızı ve özel gün hatırlatmalarınızı yönetin.",
  robots: { index: false, follow: false },
};

const nav = [
  { label: "Genel Bakış", icon: Package, active: true },
  { label: "Siparişlerim", icon: Package },
  { label: "Sadakat & Puan", icon: Star },
  { label: "Adreslerim", icon: MapPin },
  { label: "Profilim", icon: Settings },
];

export default function AccountPage() {
  return (
    <main className="bg-[#fbfafc] px-6 py-12 text-[#111827] lg:px-14 lg:py-16">
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-[24px] border border-[#e6e9f0] bg-white p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)]">
          <div className="flex items-center gap-4 border-b border-[#eef0f5] pb-6">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#8b5cf6] text-2xl font-bold text-white">AK</span>
            <div><h1 className="font-bold">Ayşe Kaya</h1><span className="mt-2 inline-flex rounded-full bg-[#f1ebff] px-3 py-1 text-xs font-bold text-[#8b5cf6]">VIP Müşteri</span></div>
          </div>
          <div className="mt-6 rounded-[18px] bg-[#f3edff] p-4">
            <div className="flex justify-between text-sm"><strong className="text-[#8b5cf6]">2.840 puan</strong><span className="text-[#98a2b3]">Hedef: 5.000</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ddd6fe]"><span className="block h-full w-[57%] rounded-full bg-[#8b5cf6]" /></div>
          </div>
          <nav className="mt-6 space-y-2">
            {nav.map((item) => <button key={item.label} className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left font-medium ${item.active ? "border border-[#8b5cf6] bg-[#f4efff] text-[#7c3aed]" : "text-[#344054] hover:bg-[#f7f5fc]"}`}><item.icon className="h-5 w-5" /> {item.label}</button>)}
          </nav>
          <button className="mt-6 flex w-full items-center gap-3 rounded-[14px] border border-[#eef0f5] px-4 py-3 text-left font-medium text-[#98a2b3]"><LogOut className="h-5 w-5" /> Çıkış Yap</button>
        </aside>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-5 rounded-[24px] border border-[#cdbdff] bg-white p-8 shadow-[0_18px_55px_rgba(45,22,72,.05)]">
            <div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b5cf6]">Müşteri paneli</p><h2 className="mt-3 text-3xl font-black text-[#1e1b4b]">Hoş geldiniz, Ayşe</h2><p className="mt-3 text-[#667085]">Son sipariş: 12 Haziran — 4 siparişin tamamı teslim edildi.</p></div>
            <span className="hidden h-20 w-20 place-items-center rounded-full bg-[#8b5cf6] text-3xl font-bold text-white md:grid">AK</span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[{label:"Sadakat Puanı",value:"2.840",color:"text-[#8b5cf6]"},{label:"Toplam Harcama",value:"₺18.420",color:"text-[#059669]"},{label:"NPS Skoru",value:"9/10",color:"text-[#2563eb]"}].map((item) => <div key={item.label} className="rounded-[20px] border border-[#e6e9f0] bg-white p-6 shadow-[0_14px_40px_rgba(45,22,72,.04)]"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#98a2b3]">{item.label}</p><p className={`mt-4 text-3xl font-black ${item.color}`}>{item.value}</p></div>)}
          </div>

          <div className="rounded-[24px] border border-[#e6e9f0] bg-white p-7 shadow-[0_18px_55px_rgba(45,22,72,.05)]">
            <h3 className="text-xl font-bold">Yaklaşan Özel Günler</h3>
            <div className="mt-6 divide-y divide-[#eef0f5]">
              {[{title:"Doğum Günü",date:"24 Temmuz — 38 gün kaldı",color:"bg-[#be123c]"},{title:"Yıl Dönümü",date:"15 Ağustos — 60 gün kaldı",color:"bg-[#7c3aed]"}].map((item) => <div key={item.title} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#f7f5fc]"><Gift className="h-5 w-5 text-[#8b5cf6]" /></span><div><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-[#98a2b3]">{item.date}</p></div></div><Link href="/kategori/cicekler" className={`rounded-full px-6 py-3 font-bold text-white ${item.color}`}>Çiçek Gönder</Link></div>)}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e6e9f0] bg-white p-7 shadow-[0_18px_55px_rgba(45,22,72,.05)]">
            <h3 className="text-xl font-bold">Son Siparişler</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {["Premium Kırmızı Güller", "Lüks Orkide", "Mevsim Buketi", "Premium Hediye Seti"].map((item, index) => <div key={item} className="rounded-[18px] border border-[#eef0f5] p-5"><div className="flex items-center justify-between"><p className="font-bold">{item}</p><span className="text-sm font-bold text-[#059669]">Teslim edildi</span></div><p className="mt-2 text-sm text-[#98a2b3]">CK88{41 - index} · 12 Haziran</p><button className="mt-4 rounded-full bg-[#f1ebff] px-5 py-2 text-sm font-bold text-[#8b5cf6]">Tekrar Sipariş</button></div>)}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[20px] border border-[#e6e9f0] bg-white p-5 text-sm text-[#667085]"><ShieldCheck className="h-5 w-5 text-[#8b5cf6]" /> Hesap bilgileriniz ve sipariş geçmişiniz güvenli müşteri alanında saklanır.</div>
        </section>
      </div>
    </main>
  );
}
