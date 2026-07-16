import type { Metadata } from "next";
import { fetchSeoPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Hakkımızda — ÇiçekYolla",
  description: "1986'dan bu yana çiçekçilik sanatı, taze çiçekler ve özenli teslimatla sevdiklerinize mutluluk ulaştırıyoruz.",
};

const FALLBACK = [
  { title:"Hikâyemiz", text:"Ustalarımızın hazırladığı çiçekleri özenle kapınıza ulaştırıyoruz. 1986 yılından bu yana çiçekçilik sanatıyla sevdiklerinize mutluluk taşıyoruz. Siz mutluysanız, biz de mutluyuz." },
  { title:"Kalite Politikamız", text:"En iyi malzemeleri ve taze, özel çiçekleri seçiyor; yüksek kalite standartlarında hazırladığımız ürünlerle %100 Gülümseme Garantisi sunuyoruz." },
  { title:"Misyonumuz", text:"En taze ve özel çiçeklerle müşterilerimizin duygularına dokunmak ve ürünü alan insanların yüzünde değeri ölçülemeyecek bir tebessüm bırakmak." },
  { title:"Vizyonumuz", text:"Daima iyi çiçekler, daima yeni modeller ve sürekli gelişim." },
];

export default async function AboutPage() {
  const managed = await fetchSeoPage("/hakkimizda");
  const sections = (managed?.body_blocks ?? [])
    .filter((block) => block.type === "about-section" && typeof block.title === "string" && typeof block.text === "string")
    .map((block) => ({ title:String(block.title), text:String(block.text) }));
  const content = sections.length ? sections : FALLBACK;
  return (
    <main className="bg-[#FCFBFD] text-[#171221]">
      <section className="bg-[linear-gradient(135deg,#090014_0%,#16052C_55%,#2A0B52_100%)] px-5 py-20 text-white md:px-8 lg:py-28">
        <div className="mx-auto max-w-[1180px]"><p className="mb-5 text-[10px] font-bold uppercase tracking-[0.34em] text-[#C084FC]">1986'dan beri çiçekçilik sanatı</p><h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] md:text-6xl" style={{fontFamily:"var(--font-display)"}}>Duygularınızı çiçeklerle özenle ulaştırıyoruz.</h1><p className="mt-7 max-w-3xl text-[16px] leading-8 text-[#D7CDE3]">Her çiçek, en özel duyguların sessiz ama unutulmaz bir ifadesidir.</p></div>
      </section>
      <section className="mx-auto max-w-[1180px] px-5 py-16 md:px-8 lg:py-24">
        <div className="grid gap-5 md:grid-cols-2">
          {content.map((section,index)=><article key={`${section.title}-${index}`} className="rounded-[26px] border border-[#E9E2F0] bg-white p-7 shadow-[0_24px_60px_-48px_rgba(65,30,100,0.4)] md:p-9"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8B5CF6]">ÇiçekYolla</p><h2 className="mt-4 text-2xl font-semibold" style={{fontFamily:"var(--font-display)"}}>{section.title}</h2><p className="mt-5 text-[15px] leading-8 text-[#61586D]">{section.text}</p></article>)}
        </div>
        <div className="mt-12 rounded-[28px] bg-[#0B0019] p-8 text-white md:flex md:items-center md:justify-between md:p-10"><div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C084FC]">Sorunuz mu var?</p><h2 className="mt-3 text-2xl font-semibold" style={{fontFamily:"var(--font-display)"}}>Uzman ekibimiz size yardımcı olsun.</h2></div><div className="mt-6 flex flex-wrap gap-3 md:mt-0"><a href="tel:+905074413474" className="rounded-full bg-[#8B5CF6] px-5 py-3 text-sm font-bold">0507 441 34 74</a><a href="mailto:info@cicekyolla.com.tr" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold">info@cicekyolla.com.tr</a></div></div>
      </section>
    </main>
  );
}
