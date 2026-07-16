import type { Metadata } from "next";
import { Clock3, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { fetchSeoPage } from "@/lib/api";

export const metadata: Metadata = { title:"İletişim — ÇiçekYolla", description:"ÇiçekYolla iletişim kanalları, çalışma saatleri ve mesaj formu." };

const FALLBACK = [
  { kind:"whatsapp", label:"WhatsApp", value:"0507 441 34 74", note:"Sipariş ve destek için" },
  { kind:"phone", label:"Telefon", value:"0507 441 34 74", note:"Her gün 08:00–22:00" },
  { kind:"email", label:"E-posta", value:"info@cicekyolla.com.tr", note:"24 saat içinde yanıt" },
  { kind:"address", label:"Adres", value:"İstanbul, Türkiye", note:"ÇiçekYolla" },
];
const ICONS = { whatsapp:MessageCircle, phone:Phone, email:Mail, address:MapPin };
function hrefFor(kind:string,value:string){ if(kind==="whatsapp") return "https://wa.me/"+value.replace(/\D/g,"").replace(/^0/,"90"); if(kind==="phone") return "tel:"+value.replace(/\s/g,""); if(kind==="email") return "mailto:"+value; return "#"; }

export default async function ContactPage(){
  const managed=await fetchSeoPage("/iletisim");
  const saved=(managed?.body_blocks??[]).filter(b=>b.type==="contact-channel"&&typeof b.value==="string").map(b=>({kind:String(b.kind||"phone"),label:String(b.label||b.kind||"İletişim"),value:String(b.value),note:String(b.note||"")}));
  const channels=saved.length?saved:FALLBACK;
  return <main className="bg-[#FBFAFD] px-5 py-16 md:px-8 lg:py-24"><div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1.15fr_0.85fr]">
    <section className="rounded-[30px] border border-[#E8E1EF] bg-white p-7 shadow-[0_28px_70px_-50px_rgba(45,20,80,0.38)] md:p-12"><p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#8B5CF6]">Mesaj Gönder</p><h1 className="mt-3 text-3xl font-semibold md:text-4xl" style={{fontFamily:"var(--font-display)"}}>Bize Ulaşın</h1><form className="mt-10 grid gap-6 sm:grid-cols-2">{[["Ad Soyad *","Adınız Soyadınız","text"],["E-posta *","ornek@email.com","email"],["Telefon","05XX XXX XX XX","tel"]].map(([l,p,t])=><label key={l}><span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">{l}</span><input type={t} placeholder={p} className="h-14 w-full rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] px-4 text-sm outline-none focus:border-[#8B5CF6]"/></label>)}<label><span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">Konu</span><select className="h-14 w-full rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] px-4 text-sm"><option>Konu seçin</option><option>Sipariş Hakkında</option><option>Özel Tasarım Talebi</option><option>Kurumsal Sipariş</option><option>Şikâyet & Öneri</option><option>Diğer</option></select></label><label className="sm:col-span-2"><span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">Mesajınız *</span><textarea rows={6} placeholder="Mesajınızı buraya yazın..." className="w-full resize-none rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] p-4 text-sm"/></label><a href="mailto:info@cicekyolla.com.tr" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-sm font-bold text-white sm:col-span-2"><Send className="h-4 w-4"/>Mesaj Gönder</a></form></section>
    <aside><p className="mb-7 text-[10px] font-bold uppercase tracking-[0.32em] text-[#8B5CF6]">İletişim Kanalları</p><div className="space-y-4">{channels.map((c,i)=>{const Icon=ICONS[c.kind as keyof typeof ICONS]??Phone;const href=hrefFor(c.kind,c.value);return <a key={i} href={href} target={href.startsWith("http")?"_blank":undefined} rel="noreferrer" className="flex items-center gap-4 rounded-[22px] border border-[#EEE8F3] bg-white p-5"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F6F0FF] text-[#8B5CF6]"><Icon className="h-6 w-6"/></span><span><span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#9A91A5]">{c.label}</span><strong className="mt-1 block text-[15px]">{c.value}</strong><span className="mt-1 block text-xs text-[#A099AA]">{c.note}</span></span></a>})}</div><div className="mt-5 overflow-hidden rounded-[24px] border border-[#DED4F0] bg-[#F2EEFF]"><div className="flex items-center gap-3 border-b border-[#DED4F0] p-5 text-[#7C3AED]"><Clock3 className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-[0.15em]">Çalışma Saatleri</span></div><div className="flex justify-between p-5 text-sm"><span>Her gün</span><strong className="text-[#8B5CF6]">08:00–22:00</strong></div></div></aside>
  </div></main>;
}
