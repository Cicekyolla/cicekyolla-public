"use client";

/**
 * §4 FEATURED COLLECTIONS — ZIP Homepage.tsx birebir port.
 * Sol büyük kart + ortada 2 dikey kart + sağda mor "Kişiye Özel Tasarım" CTA kartı.
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. Görsel/etkileşim birebir.
 * collections verisi bölüme özel (ZIP top-level const) — burada co-located tutuldu.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

export type FCItem = { id: string; name: string; href: string; image: string };
export type FeaturedCollectionCard = FCItem & {
  eyebrow?: string;
  description?: string;
  cta?: string;
  enabled?: boolean;
};
export type FeaturedCollectionsConfig = {
  sectionLabel?: string;
  sectionTitle?: string;
  allHref?: string;
  cards?: FeaturedCollectionCard[];
  personalized?: FeaturedCollectionCard;
};

const DEFAULT_CARDS: FeaturedCollectionCard[] = [
  {
    id: "flowers",
    name: "Çiçekler",
    href: "/kategori/cicekler",
    image: "/featured-collections/flowers-lifestyle.webp",
    eyebrow: "İmza Koleksiyon",
    description: "Zarafeti tek bakışta hissettiren seçkin çiçek tasarımları.",
    cta: "Koleksiyonu Keşfet",
  },
  {
    id: "purpose",
    name: "Gönderim Amacına Göre",
    href: "/kategori/gonderim-amacina-gore",
    image: "/featured-collections/orchid-hotel-lifestyle.webp",
    eyebrow: "Her Duyguya Özel",
    description: "Kutlamadan teşekküre, duygunuza en doğru tasarımı bulun.",
    cta: "Seçenekleri Gör",
  },
  {
    id: "special-days",
    name: "Özel Günler",
    href: "/kategori/ozel-gunler",
    image: "/featured-collections/special-days-lifestyle.webp",
    eyebrow: "Unutulmaz Anlar",
    description: "En değerli günleri kalıcı bir hatıraya dönüştüren aranjmanlar.",
    cta: "Şimdi Keşfet",
  },
];

const DEFAULT_PERSONALIZED: FeaturedCollectionCard = {
  id: "personalized",
  name: "Kişiye Özel Tasarım",
  href: "https://wa.me/905074413474?text=Merhaba%2C%20ki%C5%9Fiye%20%C3%B6zel%20bir%20tasar%C4%B1m%20haz%C4%B1rlatmak%20istiyorum",
  image: "/featured-collections/personalized-terrarium-lifestyle.webp",
  eyebrow: "Sadece Size Özel",
  description: "Hayalinizdeki hikâyeyi, size özel hazırlanan yaşayan bir tasarıma dönüştürelim.",
  cta: "Tasarımını Oluştur",
};

function usableCard(card: FeaturedCollectionCard | undefined): card is FeaturedCollectionCard {
  if (!card || card.enabled === false) return false;
  const image = card.image?.trim();
  const href = card.href?.trim();
  return Boolean(card.id && card.name?.trim() && image && href && (/^(https?:\/\/|\/)/i.test(image)));
}

export function FeaturedCollections({ items: _items, config }: { items?: FCItem[]; config?: FeaturedCollectionsConfig | Record<string, unknown> }) {
  const cmsConfig = (config ?? {}) as FeaturedCollectionsConfig;
  const configured = Array.isArray(cmsConfig.cards) ? cmsConfig.cards.filter(usableCard) : [];
  const collections = (configured.length >= 3 ? configured : DEFAULT_CARDS).slice(0, 3);
  const personalized = usableCard(cmsConfig.personalized) ? cmsConfig.personalized : DEFAULT_PERSONALIZED;
  const sectionTitle = cmsConfig.sectionTitle?.trim() || "Hayatın Her Anına Özel";
  return (
    <section className="py-20">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex items-end justify-between mb-12">
          <div>
            <SectionLabel>{cmsConfig.sectionLabel?.trim() || "Özel Koleksiyonlar"}</SectionLabel>
            <SectionTitle>
              {sectionTitle}
            </SectionTitle>
          </div>
          <Link
            href={cmsConfig.allHref?.trim() || "/kategori/cicekler"}
            className="hidden md:flex items-center gap-2 text-sm text-[#8B5CF6] font-semibold hover:gap-3 transition-all"
          >
            Tümünü Gör <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr_1fr] gap-4 lg:gap-5">
          {/* Large hero card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={collections[0].href}
              className="group block relative overflow-hidden rounded-[24px]"
              style={{ aspectRatio: "3/4" }}
            >
              <motion.img
                src={collections[0].image}
                alt={collections[0].name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)" }}
              />
              <div className="absolute bottom-0 left-0 p-8">
                <p className="text-[10px] tracking-[0.3em] text-[#D8B4FE] uppercase font-bold mb-2">{collections[0].eyebrow || "Koleksiyon"}</p>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", lineHeight: 1.1 }} className="text-white font-semibold mb-2">
                  {collections[0].name}
                </h3>
                {collections[0].description ? <p className="max-w-sm text-white/80 text-sm leading-relaxed mb-4">{collections[0].description}</p> : null}
                <span
                  className="inline-flex items-center gap-2 text-white text-xs font-semibold py-2.5 px-5 rounded-full transition-all duration-300 group-hover:bg-white group-hover:text-[#7C3AED]"
                  style={{ border: "1.5px solid rgba(255,255,255,0.35)" }}
                >
                  {collections[0].cta || "Keşfet"} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Two smaller stacked cards */}
          <div className="grid grid-rows-2 gap-4 lg:gap-5">
            {collections.slice(1).map((col, i) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 * (i + 1), duration: 0.7 }}
              >
                <Link href={col.href} className="group block relative overflow-hidden rounded-[24px] h-full min-h-[220px]">
                  <motion.img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)" }}
                  />
                  <div className="absolute bottom-0 left-0 p-6">
                    <p className="text-[10px] tracking-[0.25em] text-[#D8B4FE] uppercase font-bold mb-1">{col.eyebrow || "Koleksiyon"}</p>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem" }} className="text-white font-semibold">
                      {col.name}
                    </h3>
                    {col.description ? <p className="mt-1 max-w-xs text-white/75 text-xs leading-relaxed">{col.description}</p> : null}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Brand / CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="hidden lg:flex relative flex-col rounded-[24px] overflow-hidden min-h-[520px]"
          >
            <motion.img
              src={personalized.image}
              alt={personalized.name}
              className="absolute inset-0 h-full w-full object-cover"
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#21052f] via-[#4C1D95]/65 to-[#2E1065]/10" />
            <div className="relative flex-1 p-8 flex flex-col">
              <div className="mb-auto">
                <p className="text-[10px] tracking-[0.32em] text-[#E9D5FF] uppercase font-bold mb-6">{personalized.eyebrow || "Özel Hizmet"}</p>
                <h3
                  style={{ fontFamily: "var(--font-display)", lineHeight: 1.1, fontSize: "1.7rem" }}
                  className="text-white font-semibold mb-4"
                >
                  {personalized.name}
                </h3>
                <p className="text-[#DDD6FE]/70 text-sm leading-relaxed">
                  {personalized.description}
                </p>
              </div>
              <a
                href={personalized.href}
                className="mt-8 flex items-center gap-2 py-3.5 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors border border-white/15"
              >
                <MessageCircle className="w-4 h-4" />
                {personalized.cta || "WhatsApp'tan Yazın"}
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
