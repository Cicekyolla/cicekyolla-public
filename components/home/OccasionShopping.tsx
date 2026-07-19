"use client";

/**
 * §6 OCCASION SHOPPING — ZIP Homepage.tsx birebir port.
 * Ortalı başlık ("Hangi Özel Gün İçin Arıyorsunuz?") + 6 özel gün kartı (hover zoom).
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. occasions verisi co-located.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

type OccItem = { id: string; name: string; href: string; image: string; enabled?: boolean };
type OccasionShoppingConfig = { cards?: OccItem[] };

const DEFAULT_OCCASIONS: OccItem[] = [
  { id: "birthday", name: "Doğum Günü", href: "/kategori/dogum-gunu-cicekleri", image: "/occasion-shopping/birthday-lifestyle.webp", enabled: true },
  { id: "valentine", name: "Sevgiliye", href: "/kategori/sevgiliye-cicek", image: "/occasion-shopping/valentine-lifestyle.webp", enabled: true },
  { id: "mothers-day", name: "Anneler Günü", href: "/kategori/anneye-cicek", image: "/occasion-shopping/mothers-day-lifestyle.webp", enabled: true },
  { id: "graduation", name: "Mezuniyet", href: "/kategori/mezuniyet-cicekleri", image: "/occasion-shopping/graduation-lifestyle.webp", enabled: true },
  { id: "get-well", name: "Geçmiş Olsun", href: "/kategori/gecmis-olsun-cicekleri", image: "/occasion-shopping/get-well-lifestyle.webp", enabled: true },
  { id: "congratulations", name: "Tebrik", href: "/kategori/tebrik-cicekleri", image: "/occasion-shopping/congratulations-lifestyle.webp", enabled: true },
];

function usableOccasion(item: OccItem | undefined): item is OccItem {
  return Boolean(item && item.enabled !== false && item.id && item.name?.trim() && item.href?.trim() && item.image?.trim());
}

export function OccasionShopping({ items, config, title, subtitle }: { items?: OccItem[]; config?: OccasionShoppingConfig | Record<string, unknown>; title?: string | null; subtitle?: string | null }) {
  const cmsCards = Array.isArray((config as OccasionShoppingConfig | undefined)?.cards)
    ? (config as OccasionShoppingConfig).cards!.filter(usableOccasion).slice(0, 12)
    : [];
  const legacyItems = (items ?? []).filter(usableOccasion).slice(0, 6);
  const occasions = cmsCards.length > 0 ? cmsCards : DEFAULT_OCCASIONS.length > 0 ? DEFAULT_OCCASIONS : legacyItems;
  if (occasions.length === 0) return null;
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="text-center mb-14">
          <SectionLabel>{subtitle?.trim() || "Özel Günler"}</SectionLabel>
          <SectionTitle>
            {title?.trim() || <>Hangi Özel Gün<br />İçin Arıyorsunuz?</>}
          </SectionTitle>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          {occasions.map((occ, idx) => (
            <motion.div
              key={occ.id ?? occ.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.07, duration: 0.55 }}
            >
              <Link href={occ.href} className="group block">
                <div className="relative overflow-hidden rounded-[20px]" style={{ aspectRatio: "3/4" }}>
                  <motion.img
                    src={occ.image}
                    alt={occ.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.06) 55%, transparent 100%)" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                    <p className="text-white text-[13px] font-semibold">{occ.name}</p>
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
