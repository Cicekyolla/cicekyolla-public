"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

export interface EditorPick {
  id: number|string; name: string; subtitle: string; price?: number;
  badge: string; image: string; slug?: string; href?: string;
  description?: string; cta?: string; enabled?: boolean;
}

const productFallback:EditorPick[]=[
 {id:1,name:"Siyah Kutuda Kırmızı Güller",subtitle:"Editör No. 01",price:849,badge:"Editör Seçimi",image:"https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=900&h=1100&fit=crop&auto=format&q=90",slug:"premium-kirmizi-guller"},
 {id:2,name:"Peony & Ranunculus Mix",subtitle:"Editör No. 02",price:999,badge:"Limited Edition",image:"https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=900&h=1100&fit=crop&auto=format&q=90",slug:"pembe-sakayik-buketi"},
 {id:3,name:"Beyaz Zarafet Aranjmanı",subtitle:"Editör No. 03",price:749,badge:"Premium",image:"https://images.unsplash.com/photo-1487530811015-780f2f5a3f48?w=900&h=1100&fit=crop&auto=format&q=90",slug:"beyaz-lale-aranjmani"},
];
const editorialFallback:EditorPick[]=[
 {id:"curated-arrangement",name:"İmza Aranjmanlar",subtitle:"Usta Eller",badge:"Editör Seçimi",image:"/editor-picks/curated-arrangement.jpg",href:"/kategori/cicek-aranjmanlari",description:"Özenle hazırlanan seçkin aranjmanlar.",cta:"Koleksiyonu Keşfet",enabled:true},
 {id:"romantic-red-roses",name:"Aşkın Kırmızı Hali",subtitle:"Sevgiliye Özel",badge:"Limited Edition",image:"/editor-picks/romantic-red-roses.jpg",href:"/kategori/sevgiliye-cicek",description:"Duyguları tek bakışta anlatan kırmızı güller.",cta:"Sevgiliye Seç",enabled:true},
 {id:"purple-bouquet",name:"Mor Zarafet Buketleri",subtitle:"Seçkin Buketler",badge:"Premium",image:"/editor-picks/purple-bouquet.jpg",href:"/kategori/buketler",description:"Derin mor tonlarla hazırlanan zarif buketler.",cta:"Buketleri Keşfet",enabled:true},
];

export function EditorsPicks({products,config,title,subtitle}:{
 products?:EditorPick[];config?:Record<string,unknown>;title?:string|null;subtitle?:string|null;
}) {
 const cards=Array.isArray(config?.cards)?(config.cards as EditorPick[]):null;
 const picks=(cards?.length?cards.filter(card=>card.enabled!==false):config?editorialFallback:products?.length?products:productFallback);
 const eyebrow=typeof config?.eyebrow==="string"&&config.eyebrow.trim()?config.eyebrow:"VIP Koleksiyon";
 const heading=title?.trim()||"Özenle Küratörlenen";
 const accent=subtitle?.trim()||"Editör Seçimleri";
 return (
  <section className="py-24" style={{background:"linear-gradient(180deg,#0D0520 0%,#150832 100%)"}}>
   <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
    <div className="text-center mb-14">
     <SectionLabel>{eyebrow}</SectionLabel>
     <SectionTitle light>{heading}<br/><em className="not-italic" style={{background:"linear-gradient(135deg,#C084FC,#E9D5FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{accent}</em></SectionTitle>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
     {picks.map((card,idx)=>(
      <motion.div key={card.id} initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:idx*.13,duration:.65}}>
       <Link href={card.href||`/urun/${card.slug}`} className="group block">
        <div className="relative overflow-hidden rounded-[24px] bg-[#1F0A40]" style={{aspectRatio:"3/4"}}>
         <motion.img src={card.image} alt={card.name} className="w-full h-full object-cover opacity-85" whileHover={{scale:1.05,opacity:1}} transition={{duration:.75,ease:[.16,1,.3,1]}}/>
         <div className="absolute inset-0" style={{background:"linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.18) 52%,transparent 100%)"}}/>
         <div className="absolute top-5 left-5 px-3 py-1.5 text-[10px] font-bold tracking-wider text-white/90 rounded-full" style={{background:"rgba(139,92,246,.25)",backdropFilter:"blur(12px)",border:"1px solid rgba(192,132,252,.35)"}}>{card.badge}</div>
         <div className="absolute bottom-0 left-0 right-0 p-7">
          <p className="text-[10px] tracking-[.28em] text-[#C084FC] uppercase font-bold mb-2">{card.subtitle}</p>
          <h3 style={{fontFamily:"var(--font-display)",fontSize:"1.45rem",lineHeight:1.15}} className="text-white font-semibold mb-2">{card.name}</h3>
          {card.description&&<p className="text-white/60 text-sm leading-6 max-w-sm">{card.description}</p>}
          <div className="flex items-center justify-between mt-4">
           {card.price?<p style={{fontFamily:"var(--font-display)",fontSize:"1.4rem"}} className="text-white/90 font-semibold">₺{card.price}</p>:<span/>}
           <span className="flex items-center gap-1.5 text-white/70 text-xs font-semibold group-hover:text-white transition-colors">{card.cta||"İncele"}<ArrowRight className="w-3.5 h-3.5"/></span>
          </div>
         </div>
        </div>
       </Link>
      </motion.div>
     ))}
    </div>
   </div>
  </section>
 );
}
