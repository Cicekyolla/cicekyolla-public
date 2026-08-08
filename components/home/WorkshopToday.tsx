"use client";

/**
 * §Atölyeden Bugün — Figma V61/V64 premium editorial bölüm (additive).
 * Koyu mor gece zemini Hero ailesiyle (#0A0118) uyumlu; 3 cam efektli kart.
 * Görseller mevcut lifestyle asset'lerinden (public/), Figma'dan statik görsel
 * ALINMADI. Metinler kullanıcı onaylı final metinlerdir — değiştirme.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles, Gift, Flower2, Clock3, Package, Headset, Gem } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * CMS'ten (Homepage CMS → "Atölyeden Bugün") gelen tek slot. Slot ya seçilen
 * bir ÜRÜNÜ ya da editöryel bir BANNER kartını temsil eder; ikisi de aynı
 * görsel kalıba oturur, bu yüzden tek tip yeterlidir.
 */
export interface WorkshopSlot {
  title: string;
  tag?: string;
  text?: string;
  image: string;
  href?: string;
  Icon?: LucideIcon;
}

const CARDS = [
  {
    title: "Günün Taze Çiçek Seçkisi",
    tag: "Taze seçildi",
    text: "Sabah seçilen taze çiçeklerle canlı ve zarif aranjmanlar.",
    image: "/featured-collections/flowers-lifestyle.webp",
    Icon: Flower2,
  },
  {
    title: "Hediye Gibi Paketleme",
    tag: "Premium paketleme",
    text: "Her sipariş özel, zarif ve hediye hissi veren detaylarla hazırlanır.",
    image: "/featured-collections/for-lover-lifestyle.webp",
    Icon: Gift,
  },
  {
    title: "Atölye Dokunuşu",
    tag: "Bugün hazırlandı",
    text: "Ustalarımızın el emeğiyle, butik florist özeniyle hazırlanır.",
    image: "/editor-picks/curated-arrangement.jpg",
    Icon: Sparkles,
  },
] as const;

export function WorkshopToday({
  title,
  subtitle,
  slots,
}: {
  title?: string | null;
  subtitle?: string | null;
  slots?: WorkshopSlot[];
} = {}) {
  // Grid 3 slota sabittir (md:grid-cols-3). CMS'ten gelen kartlar sırayla
  // yerleşir, kalan slotlar bugünkü statik kartlarla dolar → slot hiçbir
  // kombinasyonda boş kalmaz ve tasarım bozulmaz. CMS hiç yoksa (yayın yok,
  // API hatası, bölüm silinmiş) sonuç bugünkü ekranın birebir aynısıdır.
  const cards: WorkshopSlot[] = [0, 1, 2].map((i) => slots?.[i] ?? CARDS[i]);

  return (
    <section aria-label="Atölyeden Bugün" className="relative bg-[#0A0118] overflow-hidden">
      {/* Soft lila ışık — hero ailesiyle aynı token rengi, abartısız */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{ background: "radial-gradient(ellipse at 15% 20%, #8B5CF6 0%, transparent 55%)", pointerEvents: "none" }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ background: "radial-gradient(ellipse at 85% 80%, #C084FC 0%, transparent 50%)", pointerEvents: "none" }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-14 py-24 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          {/* İnce lila çizgi detayı */}
          <div className="h-px w-20 mb-6" style={{ background: "linear-gradient(90deg, #8B5CF6, transparent)" }} />
          <h2
            className="text-white text-3xl lg:text-[2.6rem] font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {title?.trim() || "Atölyeden Bugün"}
          </h2>
          <p className="text-white/55 text-base lg:text-lg max-w-[520px]">
            {subtitle?.trim() || "Ustalarımızın bugün özenle hazırladığı taze ve premium seçkiler."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {cards.map((card, idx) => {
            const Icon = card.Icon ?? Sparkles;
            const article = (
            <motion.article
              key={`${idx}-${card.title}`}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden rounded-[24px] h-full"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(24px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image}
                  alt={card.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(10,1,24,0.55) 0%, transparent 45%)", pointerEvents: "none" }}
                />
                {card.tag ? (
                  <span
                    className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wider text-white"
                    style={{
                      background: "rgba(139,92,246,0.80)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    {card.tag}
                  </span>
                ) : null}
              </div>
              <div className="p-5 lg:p-6">
                <h3 className="text-white text-lg font-semibold mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                  {card.title}
                </h3>
                {card.text ? (
                  <p className="text-white/55 text-sm leading-relaxed">{card.text}</p>
                ) : null}
              </div>
            </motion.article>
            );
            // href yalnız CMS kartlarında dolu olur. Statik varsayılanlarda href
            // yoktur → bugünkü DOM birebir korunur (article doğrudan grid child).
            return card.href ? (
              <Link key={`${idx}-${card.title}`} href={card.href} className="block h-full">
                {article}
              </Link>
            ) : (
              article
            );
          })}
        </div>

        {/* Trust şerit (V65) — kartların altında ince, cam efektli güven satırı */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 lg:mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-[20px] px-6 py-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          {([
            { Icon: Clock3, label: "Bugün hazırlanır" },
            { Icon: Package, label: "Özenli paketleme" },
            { Icon: Headset, label: "Canlı destek" },
            { Icon: Gem, label: "Premium seçki" },
          ] as const).map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/65">
              <item.Icon className="w-3.5 h-3.5 text-[#C084FC]" aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
