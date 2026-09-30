import type { Metadata } from "next";
import { Clock3, Mail, MapPin, MessageCircle, Navigation, Phone, Send } from "lucide-react";
import { fetchSeoPage } from "@/lib/api";
import { getPublishedHomepage } from "@/lib/homepage";
import { contactChannels, directionsUrl, mapsOpenUrl, resolveSiteIdentity } from "@/lib/siteIdentity";

export const metadata: Metadata = { title:"İletişim", description:"ÇiçekYolla iletişim kanalları, çalışma saatleri ve mesaj formu." };

const ICONS = { whatsapp:MessageCircle, phone:Phone, email:Mail, address:MapPin };
const CORE_KINDS = new Set(["whatsapp", "phone", "email", "address"]);

export default async function ContactPage(){
  // TEK DAMAR (25 Eyl 2026): kanallar, adres ve çalışma saati Admin → Ana Sayfa CMS → Hero "İşletme Kimliği" alanlarından;
  // footer ve Google şeması da aynı resolveSiteIdentity() sonucunu kullanır. CMS okunamazsa GBP yedeği (sayfa hiç boş kalmaz).
  const [homepage, managed] = await Promise.all([getPublishedHomepage(), fetchSeoPage("/iletisim")]);
  const identity = resolveSiteIdentity(homepage?.sections.find((s) => s.type === "hero")?.config);
  const core = contactChannels(identity);
  // SEO Merkezi /iletisim sayfasındaki ek "contact-channel" blokları (çekirdek dört kanal dışındakiler) listenin sonuna eklenir;
  // telefon/WhatsApp/e-posta/adres ikinci bir kaynaktan ÇİFTLENMEZ.
  const extra=(managed?.body_blocks??[]).filter(b=>b.type==="contact-channel"&&typeof b.value==="string"&&!CORE_KINDS.has(String(b.kind||""))).map(b=>({kind:String(b.kind||"phone"),label:String(b.label||b.kind||"İletişim"),value:String(b.value),note:String(b.note||""),href:"#"}));
  const channels=[...core,...extra];
  const mapHref=mapsOpenUrl(identity);
  const dirHref=directionsUrl(identity);
  return <main className="bg-[#FBFAFD] px-5 py-16 md:px-8 lg:py-24"><div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1.15fr_0.85fr]">
    <section className="rounded-[30px] border border-[#E8E1EF] bg-white p-7 shadow-[0_28px_70px_-50px_rgba(45,20,80,0.38)] md:p-12"><p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#8B5CF6]">Mesaj Gönder</p><h1 className="mt-3 text-3xl font-semibold md:text-4xl" style={{fontFamily:"var(--font-display)"}}>Bize Ulaşın</h1><form className="mt-10 grid gap-6 sm:grid-cols-2">{[["Ad Soyad *","Adınız Soyadınız","text"],["E-posta *","ornek@email.com","email"],["Telefon","05XX XXX XX XX","tel"]].map(([l,p,t])=><label key={l}><span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">{l}</span><input type={t} placeholder={p} className="h-14 w-full rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] px-4 text-sm outline-none focus:border-[#8B5CF6]"/></label>)}<label><span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">Konu</span><select className="h-14 w-full rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] px-4 text-sm"><option>Konu seçin</option><option>Sipariş Hakkında</option><option>Özel Tasarım Talebi</option><option>Kurumsal Sipariş</option><option>Şikâyet & Öneri</option><option>Diğer</option></select></label><label className="sm:col-span-2"><span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#686074]">Mesajınız *</span><textarea rows={6} placeholder="Mesajınızı buraya yazın..." className="w-full resize-none rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] p-4 text-sm"/></label><a href={`mailto:${identity.email}`} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-sm font-bold text-white sm:col-span-2"><Send className="h-4 w-4"/>Mesaj Gönder</a></form></section>
    <aside><p className="mb-7 text-[10px] font-bold uppercase tracking-[0.32em] text-[#8B5CF6]">İletişim Kanalları</p><div className="space-y-4">{channels.map((c,i)=>{const Icon=ICONS[c.kind as keyof typeof ICONS]??Phone;
      if(c.kind==="address") return <div key={i} data-contact-address className="rounded-[22px] border border-[#EEE8F3] bg-white p-5"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F6F0FF] text-[#8B5CF6]"><Icon className="h-6 w-6"/></span><span><span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#9A91A5]">{c.label}</span><strong className="mt-1 block text-[15px]">{c.value}</strong><span className="mt-1 block text-xs text-[#A099AA]">{c.note}</span></span></div>
        <div className="mt-4 grid grid-cols-2 gap-3"><a href={mapHref} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#E5DDF0] bg-[#FCFBFD] text-xs font-bold uppercase tracking-[0.12em] text-[#7C3AED]"><MapPin className="h-4 w-4"/>Haritada Aç</a><a href={dirHref} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-xs font-bold uppercase tracking-[0.12em] text-white"><Navigation className="h-4 w-4"/>Yol Tarifi</a></div></div>;
      return <a key={i} href={c.href} target={c.href.startsWith("http")?"_blank":undefined} rel="noreferrer" className="flex items-center gap-4 rounded-[22px] border border-[#EEE8F3] bg-white p-5"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F6F0FF] text-[#8B5CF6]"><Icon className="h-6 w-6"/></span><span><span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#9A91A5]">{c.label}</span><strong className="mt-1 block text-[15px]">{c.value}</strong><span className="mt-1 block text-xs text-[#A099AA]">{c.note}</span></span></a>})}</div><div className="mt-5 overflow-hidden rounded-[24px] border border-[#DED4F0] bg-[#F2EEFF]"><div className="flex items-center gap-3 border-b border-[#DED4F0] p-5 text-[#7C3AED]"><Clock3 className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-[0.15em]">Çalışma Saatleri</span></div><div className="flex justify-between p-5 text-sm" data-contact-hours><span>{identity.hours.note}</span><strong className="text-[#8B5CF6]">{identity.hours.opens}–{identity.hours.closes}</strong></div></div></aside>
  </div></main>;
}
