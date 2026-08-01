"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { mediaUrl } from "@/lib/media";

export type CorporateStat = { value: string; label: string };
export type CorporateReference = {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  note?: string;
};
export type CorporateClients = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  stats: CorporateStat[];
  references: CorporateReference[];
};

const corporateReferenceFallbacks: Record<string, string> = {
  "Swissôtel The Bosphorus": "/corporate-references/swissotel.jpg",
  "Nobu İstanbul": "/corporate-references/nobu-istanbul.jpg",
  "Four Seasons Bosphorus": "/corporate-references/four-seasons.jpg",
  "Soho House İstanbul": "/corporate-references/soho-house.jpg",
  "Hilton Garden Inn": "/corporate-references/hilton-garden-inn.jpg",
  "Tom Ford Beauty TR": "/corporate-references/tom-ford-beauty.jpg",
};

const genericReferences = [
  {
    category: "Otel ve Konaklama",
    title: "Lobi ve Oda Çiçek Tasarımları",
    description: "Otel, rezidans ve konaklama alanları için marka diline uygun, planlı ve düzenli çiçek çözümleri.",
  },
  {
    category: "Restoran ve Davet",
    title: "Masa Üstü Çiçek Konseptleri",
    description: "Restoran, davet ve özel organizasyonlarda atmosferi güçlendiren özgün masa üstü aranjmanları.",
  },
  {
    category: "Kurumsal Ofis",
    title: "Ofis ve Karşılama Alanları",
    description: "Resepsiyon, toplantı odası ve yönetici alanları için profesyonel, sürdürülebilir çiçek hizmeti.",
  },
  {
    category: "Mağaza ve Showroom",
    title: "Vitrin ve Lansman Dekorasyonu",
    description: "Yeni sezon, ürün lansmanı ve kampanya dönemleri için satış alanını destekleyen çiçek tasarımları.",
  },
  {
    category: "Etkinlik ve Organizasyon",
    title: "Kurumsal Etkinlik Çiçekleri",
    description: "Açılış, toplantı, gala ve özel günlerde konseptinize özel hazırlanan etkileyici dekorasyon çözümleri.",
  },
  {
    category: "Kurumsal Hediye",
    title: "Toplu Sipariş ve Hediye Çözümleri",
    description: "Çalışan, müşteri ve iş ortakları için kişiselleştirilebilir, planlı ve ölçeklenebilir kurumsal gönderimler.",
  },
];

const safeStats: CorporateStat[] = [
  { value: "✓", label: "Kuruma Özel Tasarım" },
  { value: "✓", label: "Planlı Teslimat" },
  { value: "✓", label: "Toplu Sipariş Desteği" },
  { value: "✓", label: "Teklif ve Proje Yönetimi" },
];

function isValidImageUrl(value: string | null | undefined): value is string {
  const url = value?.trim();
  return Boolean(
    url &&
      (url.startsWith("/") ||
        url.startsWith("https://") ||
        url.startsWith("http://") ||
        url.startsWith("data:image/")),
  );
}

function corporateReferenceImage(reference: CorporateReference): string {
  const cmsImage = [reference.imageUrl, reference.note].find(isValidImageUrl);
  return cmsImage?.trim() || corporateReferenceFallbacks[reference.title] || "";
}

export function CorporateReferences({ clients }: { clients?: CorporateClients }) {
  if (!clients?.enabled) return null;

  const corporateWhatsApp = `https://wa.me/905074413474?text=${encodeURIComponent(
    "Merhaba, kurumsal çiçek ve dekorasyon çözümleri için teklif almak istiyorum.",
  )}`;

  return (
    <section className="bg-white px-6 py-20 lg:px-14 lg:py-28">
      <div className="mx-auto max-w-[1370px]">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b5cf6]">Kurumsal Çözümler</p>
          <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#111827] md:text-6xl">
            İşletmenize Özel Çiçek ve Dekorasyon Hizmetleri
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#9b92a7] md:text-lg">
            Otel, restoran, ofis, mağaza ve etkinlik alanları için markanıza uygun tasarım, planlama ve teslimat desteği sunuyoruz.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {safeStats.map((stat) => (
            <div key={stat.label} className="rounded-[24px] border border-[#e4dcff] bg-[#f5f1ff] px-5 py-9 text-center">
              <strong className="block font-serif text-4xl text-[#8b5cf6] md:text-5xl">{stat.value}</strong>
              <span className="mt-3 block text-sm text-[#675d72]">{stat.label}</span>
            </div>
          ))}
        </div>

        {clients.references.length > 0 && (
          <div className="mt-16 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {clients.references.map((reference, index) => {
              const imageUrl = corporateReferenceImage(reference);
              const generic = genericReferences[index % genericReferences.length];

              return (
                <article key={`${index}-${generic.title}`} className="overflow-hidden rounded-[26px] border border-[#eee8f5] bg-white shadow-[0_18px_55px_rgba(45,22,72,.07)]">
                  {imageUrl ? (
                    <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-[#faf8fc]">
                      <img src={mediaUrl(imageUrl)} alt={generic.title} className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="grid aspect-[16/9] place-items-center bg-[#faf8fc] text-sm text-[#a59bad]">Görsel admin panelinden eklenebilir</div>
                  )}
                  <div className="p-7">
                    <p className="text-xs font-bold uppercase tracking-[.22em] text-[#8b5cf6]">{generic.category}</p>
                    <h3 className="mt-3 font-serif text-2xl font-semibold text-[#111827]">{generic.title}</h3>
                    <p className="mt-4 leading-7 text-[#746b80]">{generic.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-base text-[#746b80]">Kurumsal ihtiyaçlarınıza özel teklif alın</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={corporateWhatsApp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#22c55e] to-[#159f86] px-8 font-bold text-white shadow-[0_14px_35px_rgba(22,163,74,.22)]">
              <MessageCircle className="h-5 w-5" />
              WhatsApp'tan Teklif Al
            </a>
            <Link href="/kurumsal" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-[#d9ccff] px-8 font-bold text-[#8b5cf6]">
              Kurumsal Çözümleri İncele
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
