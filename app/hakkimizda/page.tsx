import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hakkımızda — ÇiçekYolla",
  description: "1986'dan bu yana çiçekçilik sanatı, taze çiçekler ve özenli teslimatla sevdiklerinize mutluluk ulaştırıyoruz.",
};

const EXPERTISE = [
  "Canlı Çiçek",
  "Online Çiçekçilik",
  "Yapay Çiçekçilik Çözümleri",
  "Dekorasyon Çözümleri",
  "Mekânlara Özel Çözümler",
  "Hediye",
  "Gurme",
];

export default function AboutPage() {
  return (
    <main className="bg-[#FCFBFD] text-[#171221]">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#090014_0%,#16052C_55%,#2A0B52_100%)] px-5 py-20 text-white md:px-8 lg:py-28">
        <div className="mx-auto max-w-[1180px]">
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.34em] text-[#C084FC]">1986'dan beri çiçekçilik sanatı</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] md:text-6xl" style={{ fontFamily: "var(--font-display)" }}>
            Duygularınızı çiçeklerle özenle ulaştırıyoruz.
          </h1>
          <p className="mt-7 max-w-3xl text-[16px] leading-8 text-[#D7CDE3]">
            Ustalarımız tarafından hazırlanan çiçeklerimiz, teslimat ekibimiz tarafından özenle taşınarak kapınıza kadar getirilir. Çünkü her çiçek, en özel duyguların sessiz ama unutulmaz bir ifadesidir.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B5CF6]">Hikâyemiz</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>Mutluluk dağıtmak bizim işimiz.</h2>
          <div className="mt-6 space-y-5 text-[15px] leading-8 text-[#61586D]">
            <p>İnsanları mutlu etmek her şeyden önemli. 1986 yılından bu yana çiçekçilik sanatıyla sevdiklerinize özel çiçekler ulaştırıyor; duygularınızı kattığımız tasarımlarımızla mutluluk dağıtıyoruz.</p>
            <p>Siz mutluysanız, biz de mutluyuz.</p>
          </div>
        </div>
        <div className="rounded-[28px] border border-[#E9E2F0] bg-white p-7 shadow-[0_24px_60px_-45px_rgba(65,30,100,0.4)] md:p-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8B5CF6]">Kalite Politikamız</p>
          <h2 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>%100 Gülümseme Garantisi</h2>
          <p className="mt-5 text-[15px] leading-8 text-[#61586D]">Müşterilerimiz hazırladığımız çiçeği teslim aldığında memnun olmalıdır. Bu nedenle en iyi malzemeleri, yurt içi ve yurt dışından gelen taze ve özel çiçekleri seçiyor; yüksek kalite standartlarında hazırlıyoruz.</p>
        </div>
      </section>

      <section className="border-y border-[#ECE7F0] bg-white px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-6 md:grid-cols-2">
          {[
            ["Misyonumuz", "En taze ve özel çiçeklerle müşterilerimizin duygularına dokunmak, beklentilerini karşılamak ve ürünü alan insanların yüzünde değeri ölçülemeyecek bir tebessüm bırakmak."],
            ["Vizyonumuz", "Daima iyi çiçekler, daima yeni modeller ve sürekli gelişim; ÇiçekYolla'nın vizyonunu oluşturur."],
          ].map(([title, text]) => (
            <article key={title} className="rounded-[24px] bg-[#F8F5FC] p-7 md:p-9">
              <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
              <p className="mt-4 text-[15px] leading-8 text-[#61586D]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-16 md:px-8 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B5CF6]">Uzmanlık Alanlarımız</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXPERTISE.map((item) => <div key={item} className="rounded-2xl border border-[#E9E2F0] bg-white px-5 py-4 text-[14px] font-semibold">{item}</div>)}
        </div>
        <div className="mt-14 rounded-[28px] bg-[#0B0019] p-7 text-white md:flex md:items-center md:justify-between md:p-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C084FC]">Sorunuz mu var?</p>
            <h2 className="mt-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>Uzman ekibimiz size yardımcı olsun.</h2>
            <p className="mt-3 text-[14px] leading-7 text-[#CFC4DB]">Ürün ve hizmetlerimizle ilgili her konuda bize ulaşabilirsiniz.</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3 md:mt-0">
            <a href="tel:+905074413474" className="rounded-full bg-[#8B5CF6] px-5 py-3 text-sm font-bold">0507 441 34 74</a>
            <a href="mailto:info@cicekyolla.com.tr" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold">info@cicekyolla.com.tr</a>
          </div>
        </div>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-[#7C3AED]">← Ana sayfaya dön</Link>
      </section>
    </main>
  );
}
