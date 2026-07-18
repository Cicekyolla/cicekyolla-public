"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Building2, Check, ChevronDown, Clock3, MapPin,
  MessageCircle, PackageCheck, RefreshCw, Search, ShieldCheck, Truck,
} from "lucide-react";
import { ProductCard } from "@/components/home/ProductCard";
import type { BodyBlock, CardProduct } from "@/lib/api";

type CargoBlock = BodyBlock & { title?: string; note?: string; value?: string; label?: string; kind?: string; enabled?: boolean };

const DEFAULT_FEATURES = [
  { title: "İstanbul Aynı Gün", text: "Saat 14:00'a kadar verilen siparişler aynı gün teslim.", kind: "clock" },
  { title: "81 İl Kargo", text: "Türkiye'nin her ilçe ve beldesine yaygın ağ.", kind: "map" },
  { title: "Hasarsız Teslimat", text: "Çift katmanlı kutu ve su haznesi ile tam koruma.", kind: "shield" },
  { title: "Canlı Takip", text: "SMS ve WhatsApp ile anlık kargo bildirimleri.", kind: "truck" },
  { title: "Ücretsiz İade / Değişim", text: "Hasarlı ulaşan ürünü ücretsiz yeniliyoruz.", kind: "refresh" },
  { title: "Kurumsal Dağıtım", text: "Tek adresten binlerce noktaya eş zamanlı gönderim.", kind: "building" },
];
const DEFAULT_STEPS = [
  { title: "Seç & Sipariş Ver", text: "Kargoya uygun ürünlerden seçimini yap." },
  { title: "Özel Paketleme", text: "Uzmanlarımız çiçeğini su hazneli, darbe emici kutuya yerleştirir." },
  { title: "Kapına Gelsin", text: "Anlaşmalı özel kargo ile adresine veya yakın şubeye teslim." },
];
const DEFAULT_FAQ = [
  { title: "Hangi ürünler kargolanır?", text: "Kuru çiçek, sukulent, yapay çiçek ve hediye kutuları kargolanır. Taze kesme çiçekler sadece şehir içi motorlu kurye ile gider." },
  { title: "Kargo süresi ne kadar?", text: "İstanbul, Ankara ve İzmir'e genellikle 1–2 iş günü; Doğu illerine 3–5 iş günüdür." },
  { title: "Çiçekler kırılır mı?", text: "Özel köpük ve sert kutu kullanıyoruz. Hasar durumunda ücretsiz yenileme garantimiz vardır." },
  { title: "Teslimat başarısız olursa?", text: "Kargo firması teslimatı yeniden dener. Paket bize dönerse destek ekibimiz yeniden gönderim sürecini başlatır." },
  { title: "Kurumsal sipariş var mı?", text: "Evet, 10'dan 10.000'e kadar logo baskılı kurumsal dağıtım yapıyoruz." },
];
const DEFAULT_CITIES = [
  { title: "İstanbul", value: "istanbul", note: "1–2 iş günü" }, { title: "Ankara", value: "ankara", note: "1–2 iş günü" },
  { title: "İzmir", value: "izmir", note: "1–2 iş günü" }, { title: "Bursa", value: "bursa", note: "1–2 iş günü" },
  { title: "Antalya", value: "antalya", note: "2–3 iş günü" }, { title: "Adana", value: "adana", note: "2–3 iş günü" },
  { title: "Trabzon", value: "trabzon", note: "2–3 iş günü" }, { title: "Konya", value: "konya", note: "2–3 iş günü" },
];

const ICONS = { clock: Clock3, map: MapPin, shield: ShieldCheck, truck: Truck, refresh: RefreshCw, building: Building2 };
const enabled = (b: CargoBlock) => b.enabled !== false && b.value !== "false";
const blocksOf = (blocks: BodyBlock[], type: string) => blocks.filter((b) => b.type === type).filter(enabled) as CargoBlock[];

export function CargoCategoryExperience({ products, blocks }: { products: CardProduct[]; blocks: BodyBlock[] }) {
  const settings = (blocks.find((b) => b.type === "cargo-settings") || {}) as CargoBlock;
  const features = blocksOf(blocks, "cargo-feature");
  const steps = blocksOf(blocks, "cargo-step");
  const faq = blocksOf(blocks, "cargo-faq");
  const cities = blocksOf(blocks, "cargo-city");
  const categories = blocksOf(blocks, "cargo-category");
  const [category, setCategory] = useState("all");
  const [tracking, setTracking] = useState("");
  const [trackingMessage, setTrackingMessage] = useState("");

  const shown = useMemo(() => products.filter((p) => {
    if (category === "all") return true;
    return p.productType === category;
  }), [category, products]);

  const categoryOptions = categories.length ? categories.map((c) => ({ label: c.title || "Kategori", value: c.value || "all" })) : [
    { label: "Tümü", value: "all" }, { label: "Saksı Bitkileri", value: "plant" },
    { label: "Yapay Çiçekler", value: "artificial" }, { label: "Hediye Kutuları", value: "gift" },
  ];

  return <main className="bg-white text-[#111827]">
    <section className="relative overflow-hidden bg-[linear-gradient(115deg,#0b0319_0%,#241048_48%,#6D28D9_100%)] px-6 py-20 lg:px-14 lg:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_26%,rgba(192,132,252,.28),transparent_30%)]" />
      <div className="relative mx-auto max-w-[1370px]">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[.24em] text-[#ddd6fe]"><span className="h-2 w-2 rounded-full bg-[#34d399]" />{settings.label || "81 İLE GÖNDERİM"}</div>
        <h1 className="mt-9 max-w-5xl font-serif text-5xl font-semibold leading-[.98] text-white md:text-7xl lg:text-[86px]">{settings.title || "Sevdiklerinize Mesafe Engel Değil"}</h1>
        <p className="mt-8 max-w-3xl text-lg leading-8 text-[#d7cce7] md:text-xl">{settings.text || "İstanbul içi aynı gün teslimat, Türkiye'nin her köşesine 1–3 iş gününde güvenli kargo. Bugün sipariş ver, yarın yola çıksın."}</p>
        <div className="mt-10 flex flex-wrap gap-4"><a href="#kargo-urunleri" className="inline-flex min-h-14 items-center gap-3 rounded-full bg-white px-8 font-bold text-[#6D28D9]">Ürünleri Keşfet <ArrowRight className="h-5 w-5" /></a><a href="https://wa.me/905074413474?text=Merhaba%2C%20kargo%20ile%20g%C3%B6nderilebilen%20%C3%BCr%C3%BCnler%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum." target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center gap-3 rounded-full border border-white/30 px-8 font-bold text-white"><MessageCircle className="h-5 w-5" />WhatsApp'tan Yaz</a></div>
      </div>
    </section>

    <section className="border-b border-[#ede9fe] bg-white px-6 py-14 lg:px-14"><div className="mx-auto grid max-w-[1370px] gap-5 sm:grid-cols-2 lg:grid-cols-3">{(features.length ? features : DEFAULT_FEATURES).map((item, i) => { const Icon = ICONS[(item.kind || "shield") as keyof typeof ICONS] || ShieldCheck; return <article key={`${item.title}-${i}`} className="rounded-[24px] border border-[#ece7f4] bg-white p-7 shadow-[0_18px_55px_rgba(45,22,72,.06)]"><span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#f3efff]"><Icon className="h-5 w-5 text-[#7C3AED]" /></span><h2 className="mt-6 text-lg font-bold">{item.title}</h2><p className="mt-3 leading-7 text-[#7b7286]">{item.text}</p></article>})}</div></section>

    <section id="kargo-urunleri" className="bg-[#fcfbfd] px-6 py-20 lg:px-14"><div className="mx-auto max-w-[1370px]"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#8B5CF6]">Kargo ile gönderim</p><h2 className="mt-4 font-serif text-4xl font-semibold md:text-5xl">{shown.length} Kargoya Uygun Ürün</h2></div><div className="flex flex-wrap gap-2">{categoryOptions.map((c) => <button key={c.value} onClick={() => setCategory(c.value)} className={`rounded-full border px-5 py-3 text-sm font-bold ${category === c.value ? "border-[#8B5CF6] bg-[#8B5CF6] text-white" : "border-[#e7e1ef] bg-white text-[#665d72]"}`}>{c.label}</button>)}</div></div><div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{shown.map((p, i) => <div key={p.id} className="relative"><div className="absolute left-3 top-3 z-20 rounded-full bg-[#ecfdf5] px-3 py-1 text-[10px] font-bold text-[#059669]">Türkiye Geneli · 1–3 İş Günü</div><ProductCard product={p} idx={i} deliveryPromise="tomorrow" contextTag={{ label: "Kargoya Uygun", isOccasion: false }} /></div>)}</div></div></section>

    <section className="px-6 py-20 lg:px-14"><div className="mx-auto max-w-[1370px]"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.28em] text-[#8B5CF6]">Nasıl çalışır?</p><h2 className="mt-5 font-serif text-4xl font-semibold md:text-5xl">3 Adımda Türkiye'nin Her Köşesine</h2></div><div className="mt-14 grid gap-6 lg:grid-cols-3">{(steps.length ? steps : DEFAULT_STEPS).map((step, i) => <article key={`${step.title}-${i}`} className="relative rounded-[24px] border border-[#ded6ff] bg-[#f4f0ff] p-9"><span className="absolute right-7 top-5 font-serif text-6xl font-semibold text-[#e7ddff]">0{i + 1}</span><span className="grid h-12 w-12 place-items-center rounded-[16px] border border-[#d8ccff] bg-white"><PackageCheck className="h-5 w-5 text-[#8B5CF6]" /></span><h3 className="mt-10 text-xl font-bold">{step.title}</h3><p className="mt-4 leading-7 text-[#746c80]">{step.text}</p></article>)}</div></div></section>

    <section className="bg-[#f4f0ff] px-6 py-18 lg:px-14"><div className="mx-auto grid max-w-[1370px] gap-10 rounded-[24px] border border-[#ded6ff] p-8 lg:grid-cols-[1.2fr_.8fr] lg:p-12"><div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#8B5CF6]">Teslimat tahmini</p><h2 className="mt-5 font-serif text-4xl font-semibold">Şehrinize Ne Zaman Ulaşır?</h2><p className="mt-5 leading-7 text-[#746c80]">Saat 14:00'a kadar verilen uygun siparişler aynı gün kargoya hazırlanır. Şehrinizi seçerek ürünleri görüntüleyin.</p><Link href="/teslimat-bolgeleri" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8B5CF6] px-7 py-4 font-bold text-white">Tüm Teslimat Bölgeleri <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-3 sm:grid-cols-2">{(cities.length ? cities : DEFAULT_CITIES).map((city) => <Link key={city.value || city.title} href={`/teslimat/${city.value || "istanbul"}`} className="flex items-center justify-between rounded-full border border-[#e4dcff] bg-white px-5 py-4"><span className="inline-flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-[#8B5CF6]" />{city.title}</span><span className="text-xs font-bold text-[#10B981]">{city.note}</span></Link>)}</div></div></section>

    <section className="px-6 py-20 lg:px-14"><div className="mx-auto max-w-[980px]"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.28em] text-[#8B5CF6]">Sık sorulan sorular</p><h2 className="mt-5 font-serif text-4xl font-semibold">Kargo Hakkında Merak Edilenler</h2></div><div className="mt-12 space-y-4">{(faq.length ? faq : DEFAULT_FAQ).map((item, i) => <details key={`${item.title}-${i}`} className="group rounded-[24px] border border-[#eee8f5] bg-white px-7 shadow-[0_14px_40px_rgba(45,22,72,.04)]"><summary className="flex cursor-pointer list-none items-center gap-5 py-6 font-bold [&::-webkit-details-marker]:hidden"><span className="text-xs text-[#c4b5fd]">{String(i + 1).padStart(2, "0")}</span><span className="flex-1">{item.title}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f0ff]"><ChevronDown className="h-4 w-4 text-[#8B5CF6] transition group-open:rotate-180" /></span></summary><p className="pb-7 pl-9 pr-10 leading-7 text-[#746c80]">{item.text}</p></details>)}</div></div></section>

    <section className="px-6 pb-20 lg:px-14"><div className="mx-auto max-w-[1370px] rounded-[24px] bg-[#16052f] p-8 text-white lg:p-12"><p className="text-xs font-bold uppercase tracking-[.28em] text-[#c084fc]">Kargo takibi</p><h2 className="mt-5 font-serif text-4xl font-semibold">Siparişini takip et veya hemen kargola</h2><p className="mt-4 text-[#b8aacb]">Sipariş onay e-postanızdaki, SMS veya WhatsApp mesajınızdaki takip numarasını girin.</p><form className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setTrackingMessage(tracking.trim().length >= 6 ? "Takip numaranız alındı. Sipariş Takibi sayfasına yönlendiriliyorsunuz." : "Lütfen en az 6 karakterli sipariş veya takip numarası girin."); if (tracking.trim().length >= 6) window.location.href = `/siparis-takibi?tracking=${encodeURIComponent(tracking.trim())}`; }}><label className="flex min-h-14 flex-1 items-center gap-3 rounded-[16px] border border-white/15 bg-white/10 px-5"><Search className="h-5 w-5 text-[#c4b5fd]" /><input value={tracking} onChange={(e) => setTracking(e.target.value)} className="w-full bg-transparent text-white outline-none placeholder:text-white/35" placeholder="Sipariş veya kargo takip numarası" /></label><button className="min-h-14 rounded-[16px] bg-[#8B5CF6] px-8 font-bold">Sorgula</button></form>{trackingMessage && <p className="mt-4 text-sm text-[#d8ccff]">{trackingMessage}</p>}</div></section>
  </main>;
}
