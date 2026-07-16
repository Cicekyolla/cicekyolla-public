import type { Metadata } from "next";
import { Clock3, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "İletişim — ÇiçekYolla",
  description: "ÇiçekYolla iletişim kanalları, çalışma saatleri ve mesaj formu.",
};

const channels = [
  { icon: MessageCircle, label: "WhatsApp", value: "0507 441 34 74", note: "Sipariş ve destek için", href: "https://wa.me/905074413474", green: true },
  { icon: Phone, label: "Telefon", value: "0507 441 34 74", note: "Her gün 08:00–22:00", href: "tel:+905074413474" },
  { icon: Mail, label: "E-posta", value: "info@cicekyolla.com.tr", note: "24 saat içinde yanıt", href: "mailto:info@cicekyolla.com.tr" },
  { icon: MapPin, label: "Adres", value: "İstanbul, Türkiye", note: "ÇiçekYolla", href: "#" },
];

export default function ContactPage() {
  return (
    <main className="bg-[#FBFAFD] px-5 py-16 md:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[30px] border border-[#E8E1EF] bg-white p-7 shadow-[0_28px_70px_-50px_rgba(45,20,80,0.38)] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#8B5CF6]">Mesaj Gönder</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#171221] md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>Bize Ulaşın</h1>
          <form className="mt-10 grid gap-6 sm:grid-cols-2">
            {[
              ["Ad Soyad *", "Adınız Soyadınız", "text"],
              ["E-posta *", "ornek@email.com", "email"],
              ["Telefon", "05XX XXX XX XX", "tel"],
            ].map(([label, placeholder, type]) => (
              <label key={label} className="block">
                <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">{label}</span>
                <input type={type} placeholder={placeholder} className="h-14 w-full rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] px-4 text-sm outline-none transition focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#EDE9FE]" />
              </label>
            ))}
            <label className="block">
              <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">Konu</span>
              <select className="h-14 w-full rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] px-4 text-sm outline-none focus:border-[#8B5CF6]">
                <option>Konu seçin</option><option>Sipariş Hakkında</option><option>Özel Tasarım Talebi</option><option>Kurumsal Sipariş</option><option>Şikâyet & Öneri</option><option>Diğer</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">Mesajınız *</span>
              <textarea rows={6} placeholder="Mesajınızı buraya yazın..." className="w-full resize-none rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] p-4 text-sm outline-none transition focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#EDE9FE]" />
            </label>
            <a href="mailto:info@cicekyolla.com.tr" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-sm font-bold text-white shadow-[0_14px_30px_rgba(139,92,246,0.24)] sm:col-span-2">
              <Send className="h-4 w-4" /> Mesaj Gönder
            </a>
          </form>
        </section>

        <aside>
          <p className="mb-7 text-[10px] font-bold uppercase tracking-[0.32em] text-[#8B5CF6]">İletişim Kanalları</p>
          <div className="space-y-4">
            {channels.map(({ icon: Icon, label, value, note, href, green }) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="flex items-center gap-4 rounded-[22px] border border-[#EEE8F3] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(45,20,80,0.4)] transition hover:-translate-y-0.5 hover:border-[#C4B5FD]">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl ${green ? "bg-[#ECFDF3] text-[#16A34A]" : "bg-[#F6F0FF] text-[#8B5CF6]"}`}><Icon className="h-6 w-6" /></span>
                <span><span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#9A91A5]">{label}</span><strong className="mt-1 block text-[15px] text-[#171221]">{value}</strong><span className="mt-1 block text-xs text-[#A099AA]">{note}</span></span>
              </a>
            ))}
          </div>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-[#DED4F0] bg-[#F2EEFF]">
            <div className="flex items-center gap-3 border-b border-[#DED4F0] p-5 text-[#7C3AED]"><Clock3 className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.15em]">Çalışma Saatleri</span></div>
            <div className="flex justify-between p-5 text-sm"><span>Her gün</span><strong className="text-[#8B5CF6]">08:00–22:00</strong></div>
          </div>
        </aside>
      </div>
    </main>
  );
}
