"use client";

/**
 * §Duyguna Göre Seç — Figma V65 final (additive).
 * Lavanta zemin (#F5F3FF token) üzerinde 8 GÖRÜNÜR beyaz kart (V65 fix:
 * rgba(255,255,255,0.88) zemin + güçlü ama premium gölge + net border +
 * lila ikon + koyu başlık + gri açıklama + mor CTA).
 * Layout (V65): desktop 4 sütun items-stretch eşit yükseklik; mobil yatay
 * scroll -mx-5 + iç px-5, scrollbar gizli; CTA mt-auto flex-shrink-0 ile
 * pinli; açıklama 3 satır clamp; etiketler tek satır truncate.
 * Renk ailesi YALNIZCA lila/mor/beyaz — yeni renk YOK.
 * Metinler kullanıcı onaylı final metinlerdir — değiştirme. Href'ler CANLI
 * kategori sayfalarına gider (Aşk: canlı ağaçtaki gerçek slug
 * /kategori/sevgiliye-cicek — "sevgiliye-cicekleri" canlıda yok, 404 olurdu).
 */

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight, Heart, HeartHandshake, MessageCircle, PartyPopper,
  Leaf, Sunrise, Building2, Sparkles,
} from "lucide-react";

const MOODS = [
  { title: "Aşk", text: "Kalbindeki sevgiyi en güzel şekilde anlat.", tags: ["Kırmızı gül", "Şakayık", "Lale"], href: "/kategori/sevgiliye-cicek", Icon: Heart },
  { title: "Teşekkür", text: "Sözcükler yetmediğinde çiçekler konuşur.", tags: ["Karma buket", "Beyaz gül"], href: "/kategori/tesekkur-cicekleri", Icon: HeartHandshake },
  { title: "Özür", text: "Samimi bir adım, doğru çiçekle başlar.", tags: ["Beyaz lale", "Orkide"], href: "/kategori/ozur-cicekleri", Icon: MessageCircle },
  { title: "Tebrik", text: "Başarıyı en zarif şekilde kutla.", tags: ["Renkli buket", "Şampanya beyazı"], href: "/kategori/tebrik-cicekleri", Icon: PartyPopper },
  { title: "Geçmiş Olsun", text: "İyi dilekleri taze çiçeklerle gönder.", tags: ["Ferah buket", "Saksı çiçeği"], href: "/kategori/gecmis-olsun-cicekleri", Icon: Leaf },
  { title: "Yeni Başlangıç", text: "Yeni bir sayfaya zarif bir dokunuş.", tags: ["Orkide", "Lilyum"], href: "/kategori/yeni-is-tebrigi-cicekleri", Icon: Sunrise },
  { title: "Kurumsal Prestij", text: "Markanıza yakışan güçlü ve zarif seçimler.", tags: ["Açılış", "Ofis", "Davet"], href: "/kategori/kurumsal-koleksiyon", Icon: Building2 },
  { title: "Sade Zarafet", text: "Abartısız, şık ve unutulmaz.", tags: ["Beyaz çiçekler", "Minimal buket"], href: "/kategori/minimal-buketler", Icon: Sparkles },
] as const;

export function MoodPicker() {
  return (
    <section aria-label="Duyguna Göre Seç" className="bg-[#F5F3FF] py-24 lg:py-32">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 lg:mb-12"
        >
          <div className="h-px w-20 mb-6" style={{ background: "linear-gradient(90deg, #8B5CF6, transparent)" }} />
          <h2
            className="text-[#111827] text-3xl lg:text-[2.6rem] font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Duyguna Göre Seç
          </h2>
          <p className="text-[#6B7280] text-base lg:text-lg max-w-[560px]">
            Anlatmak istediğin hissi seç, ona en uygun premium çiçekleri keşfet.
          </p>
        </motion.div>

        {/* Mobil: yatay scroll (-mx-5 + iç px-5, scrollbar gizli, snap)
            Desktop: 4 sütun grid items-stretch → eşit kart yüksekliği (V65) */}
        <div
          className="flex gap-4 overflow-x-auto -mx-5 px-5 pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:items-stretch lg:gap-5 lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0"
          style={{ scrollbarWidth: "none" }}
        >
          {MOODS.map((mood, idx) => (
            <motion.div
              key={mood.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (idx % 4) * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="snap-start shrink-0 w-[264px] lg:w-auto lg:shrink"
            >
              <Link
                href={mood.href}
                className="group flex flex-col h-full rounded-[20px] border border-[#DDD6FE] p-5 lg:p-6 transition-all duration-300 shadow-[0_12px_32px_rgba(124,58,237,0.10)] hover:shadow-[0_18px_44px_rgba(124,58,237,0.16)] hover:border-[#C4B5FD] hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.88)" }}
              >
                {/* Lila ikon (V65) */}
                <span className="mb-4 inline-flex w-10 h-10 items-center justify-center rounded-full bg-[#F5F3FF] border border-[#EDE9FE]">
                  <mood.Icon className="w-4.5 h-4.5 text-[#8B5CF6]" aria-hidden="true" />
                </span>
                <h3 className="text-[#111827] text-lg font-semibold mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                  {mood.title}
                </h3>
                <p
                  className="text-[#6B7280] text-sm leading-relaxed mb-4"
                  style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {mood.text}
                </p>
                {/* Etiketler — tek satır, taşan truncate (V65) */}
                <div className="flex flex-nowrap gap-1.5 mb-5 overflow-hidden">
                  {mood.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex max-w-full items-center truncate whitespace-nowrap rounded-full border border-[#EDE9FE] bg-[#F5F3FF] px-2.5 py-[3px] text-[10.5px] font-semibold text-[#7C3AED]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {/* Mor CTA — mt-auto + flex-shrink-0 ile alt hizaya pinli (V65) */}
                <span className="mt-auto flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B5CF6] group-hover:text-[#7C3AED] transition-colors">
                  Bu Duyguya Uygun Çiçekler
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
