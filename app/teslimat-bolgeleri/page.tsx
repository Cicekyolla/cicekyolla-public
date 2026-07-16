import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, MapPin, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { fetchSeoPage } from "@/lib/api";

export const metadata:Metadata={title:"Teslimat Bölgeleri — ÇiçekYolla",description:"ÇiçekYolla il, ilçe ve mahalle teslimat bölgeleri ile güncel teslimat süreleri."};
export const revalidate=300;

type Region={city:string;district:string;neighborhoods:string[];duration:string;cutoff:string;hot:boolean};
const FALLBACK:Region[]=[
 {city:"İstanbul",district:"Kadıköy",neighborhoods:["Caferağa","Fenerbahçe","Suadiye","Koşuyolu","Bostancı"],duration:"2–3 saat",cutoff:"14:00",hot:true},
 {city:"İstanbul",district:"Beşiktaş",neighborhoods:["Levent","Etiler","Bebek","Ortaköy","Arnavutköy","Nişantaşı"],duration:"2–3 saat",cutoff:"14:00",hot:true},
 {city:"İstanbul",district:"Şişli",neighborhoods:["Teşvikiye","Mecidiyeköy","Bomonti","Fulya","Esentepe"],duration:"2–3 saat",cutoff:"14:00",hot:true},
 {city:"İstanbul",district:"Üsküdar",neighborhoods:["Kuzguncuk","Altunizade","Acıbadem","Çengelköy"],duration:"3–4 saat",cutoff:"14:00",hot:false},
 {city:"Ankara",district:"Çankaya",neighborhoods:["Kızılay","Bahçelievler","Çukurambar","Ayrancı"],duration:"2–3 saat",cutoff:"12:00",hot:true},
 {city:"Ankara",district:"Keçiören",neighborhoods:["Etlik","Kalaba","Ovacık","Şenlik"],duration:"3–4 saat",cutoff:"12:00",hot:false},
 {city:"İzmir",district:"Konak",neighborhoods:["Alsancak","Göztepe","Güzelyalı","Kültür"],duration:"2–3 saat",cutoff:"12:00",hot:true},
 {city:"İzmir",district:"Karşıyaka",neighborhoods:["Bostanlı","Mavişehir","Alaybey","Nergiz"],duration:"3–4 saat",cutoff:"12:00",hot:false},
 {city:"Bursa",district:"Nilüfer",neighborhoods:["Özlüce","Görükle","Ertuğrul","Balat"],duration:"3–4 saat",cutoff:"12:00",hot:false},
];

const slug=(value:string)=>value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export default async function DeliveryRegionsPage(){
 const managed=await fetchSeoPage("/teslimat-bolgeleri");
 const saved=(managed?.body_blocks??[]).filter(b=>b.type==="delivery-region"&&typeof b.kind==="string"&&typeof b.title==="string").map(b=>({city:String(b.kind),district:String(b.title),neighborhoods:String(b.text||"").split(",").map(x=>x.trim()).filter(Boolean),duration:String(b.note||"3–4 saat"),cutoff:String(b.value||"12:00"),hot:b.label==="HOT"}));
 const regions=saved.length?saved:FALLBACK;
 const cities=[...new Set(regions.map(r=>r.city))];
 const benefits=[{Icon:Truck,label:"Aynı Gün Teslimat"},{Icon:ShieldCheck,label:"Özenli Taşıma"},{Icon:Sparkles,label:"Taze Garantisi"},{Icon:MapPin,label:`${regions.length}+ Bölge`}];
 const itemList={"@context":"https://schema.org","@type":"ItemList",name:"ÇiçekYolla teslimat bölgeleri",itemListElement:regions.map((r,i)=>({"@type":"ListItem",position:i+1,name:`${r.city} ${r.district} çiçek teslimatı`,url:`https://cicekyolla.com.tr/${slug(r.city)}/${slug(r.district)}`}))};
 return <main className="bg-[#fcfbfd] text-[#111827]"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(itemList)}}/>
  <section className="relative overflow-hidden bg-[#0b0319] px-6 py-24 lg:px-14 lg:py-32"><div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(168,85,247,.35),transparent_34%),radial-gradient(circle_at_22%_80%,rgba(76,29,149,.32),transparent_38%)]"/><div className="relative mx-auto max-w-[1320px]"><div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[.24em] text-[#ddd6fe]"><span className="h-2 w-2 rounded-full bg-[#c084fc]"/>Teslimat Bölgeleri</div><h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[.98] text-white md:text-7xl lg:text-8xl">Türkiye'nin Her<br/><span className="text-[#c084fc]">Köşesine Ulaşıyoruz</span></h1><p className="mt-8 max-w-2xl text-lg leading-8 text-[#c4b5d4]">İlinizi, ilçenizi ve mahallenizi seçin; teslimat süresini görün ve size özel koleksiyona ulaşın.</p></div></section>
  <section className="border-b border-[#ede9fe] bg-white"><div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-px px-6 lg:grid-cols-4 lg:px-14">{benefits.map(({Icon,label})=><div key={label} className="flex items-center gap-4 px-4 py-7"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#f5f3ff]"><Icon className="h-5 w-5 text-[#8b5cf6]"/></span><span className="font-semibold">{label}</span></div>)}</div></section>
  <section className="mx-auto max-w-[1320px] px-6 py-20 lg:px-14">{cities.map(city=><div key={city} className="mb-20"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">Aynı gün teslimat</p><h2 className="font-serif text-4xl font-semibold text-[#12091f]">{city}</h2></div><p className="text-sm text-[#8b5cf6]">Uygun saatler sipariş adımında kesinleşir</p></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{regions.filter(r=>r.city===city).map(r=><article key={`${city}-${r.district}`} className="rounded-[24px] border border-[#ede9fe] bg-white p-6 shadow-[0_18px_50px_rgba(45,22,72,.06)] transition hover:-translate-y-1 hover:border-[#c4b5fd]"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#8b5cf6]"/><h3 className="text-xl font-bold">{r.district}</h3>{r.hot&&<span className="rounded-full bg-[#8b5cf6] px-2 py-1 text-[9px] font-bold text-white">HOT</span>}</div><div className="mt-3 flex items-center gap-2 text-sm text-[#7c7488]"><Clock3 className="h-4 w-4"/>{r.duration} · Son sipariş {r.cutoff}</div></div><Link href={`/${slug(city)}/${slug(r.district)}`} className="rounded-full bg-[#f5f3ff] px-4 py-2 text-xs font-bold text-[#7c3aed]">İncele</Link></div>{r.neighborhoods.length>0&&<div className="mt-6 border-t border-[#f0ecf7] pt-5"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#9b91a8]">Teslimat yapılan mahalleler</p><div className="flex flex-wrap gap-2">{r.neighborhoods.map(n=><Link key={n} href={`/${slug(city)}/${slug(r.district)}/${slug(n)}-mah`} className="rounded-full border border-[#ede9fe] bg-[#faf9fd] px-3 py-2 text-xs text-[#342b40] hover:border-[#a78bfa] hover:text-[#7c3aed]">{n}</Link>)}</div></div>}</article>)}</div></div>)}</section>
  <section className="bg-gradient-to-r from-[#5b21b6] to-[#9333ea] px-6 py-16 text-white lg:px-14"><div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-8 lg:flex-row lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#ddd6fe]">Bugün sipariş ver</p><h2 className="mt-3 font-serif text-4xl font-semibold">Bugün teslim edelim</h2><p className="mt-3 text-[#e9d5ff]">Adresinizi ürün sayfasında seçin, uygun teslimat slotlarını anında görün.</p></div><Link href="/kategori/cicekler" className="rounded-full bg-white px-8 py-4 text-center font-bold text-[#7c3aed]">Çiçekleri İncele</Link></div></section>
 </main>;
}
