"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MessageCircle, Search } from "lucide-react";

export type FaqItem = { category:string; question:string; answer:string };

export function FaqExperience({ items }:{ items:FaqItem[] }){
  const categories=["Tümü",...Array.from(new Set(items.map(item=>item.category)))];
  const [category,setCategory]=useState("Tümü");
  const [query,setQuery]=useState("");
  const filtered=useMemo(()=>items.filter(item=>(category==="Tümü"||item.category===category)&&(`${item.question} ${item.answer}`.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")))),[items,category,query]);
  return <main className="bg-[#FBFAFD]">
    <section className="border-t border-[#E7E0F0] bg-[radial-gradient(circle_at_70%_35%,#F5F0FF_0%,#EFEBFF_38%,#F7F4FF_100%)] px-5 py-20 md:px-8 lg:py-28"><div className="mx-auto max-w-[1240px]"><p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#8B5CF6]">Sık Sorulan Sorular</p><h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-[1.04] text-[#111827] md:text-7xl" style={{fontFamily:"var(--font-display)"}}>Merak Ettikleriniz <span className="text-[#8B5CF6]">Burada</span></h1><p className="mt-7 max-w-2xl text-[16px] leading-8 text-[#6B7280]">En çok sorulan soruları derledik. Aradığınızı bulamazsanız WhatsApp'tan anında yanıt alabilirsiniz.</p><label className="mt-9 flex h-16 max-w-[640px] items-center gap-3 rounded-[20px] border border-[#E4DCF0] bg-white px-5 shadow-sm"><Search className="h-5 w-5 text-[#9CA3AF]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Soru ara..." className="h-full flex-1 bg-transparent text-sm outline-none"/></label></div></section>
    <section className="mx-auto max-w-[1240px] px-5 py-16 md:px-8 lg:py-24"><div className="flex flex-wrap gap-3">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`rounded-full border px-6 py-3 text-sm font-semibold transition ${category===c?"border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[0_10px_24px_rgba(139,92,246,0.24)]":"border-[#E5DFF0] bg-white text-[#6B7280] hover:border-[#C4B5FD]"}`}>{c}</button>)}</div>
      <div className="mt-12 overflow-hidden rounded-[28px] border border-[#EEE8F3] bg-white px-6 shadow-[0_26px_70px_-52px_rgba(42,20,75,0.45)] md:px-10">{filtered.length?filtered.map((item,index)=><details key={`${item.category}-${item.question}`} className="group border-b border-[#F0EBF5] last:border-0"><summary className="flex cursor-pointer list-none items-center gap-5 py-7 [&::-webkit-details-marker]:hidden"><span className="text-xs font-bold text-[#D8B4FE]">{String(index+1).padStart(2,"0")}</span><span className="flex-1 text-[15px] font-semibold text-[#171221] md:text-[16px]">{item.question}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#F6F0FF] text-[#8B5CF6]"><ChevronDown className="h-4 w-4 transition group-open:rotate-180"/></span></summary><p className="pb-7 pl-10 pr-12 text-[14px] leading-7 text-[#6B7280]">{item.answer}</p></details>):<p className="py-14 text-center text-sm text-[#9CA3AF]">Aramanızla eşleşen soru bulunamadı.</p>}</div>
      <div className="mt-14 rounded-[30px] border border-[#DDD6FE] bg-[#F1EDFF] p-9 text-center md:p-14"><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B5CF6]">Yanıt bulamadınız mı?</p><h2 className="mt-5 text-3xl font-semibold text-[#171221]" style={{fontFamily:"var(--font-display)"}}>Bize Sorun</h2><p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-[#6B7280]">WhatsApp'tan bize ulaşın; ekibimiz size yardımcı olsun.</p><a href="https://wa.me/905074413474" target="_blank" rel="noreferrer" className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] px-7 py-4 text-sm font-bold text-white"><MessageCircle className="h-5 w-5"/>WhatsApp'ta Sorun</a></div>
    </section>
  </main>;
}
