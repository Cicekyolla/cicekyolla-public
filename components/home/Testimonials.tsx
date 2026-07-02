"use client";

/**
 * §10 GOOGLE REVIEWS — ZIP Homepage.tsx birebir port.
 * Başlık + 4.9 genel puan pill + yorum kartları (avatar, konum, yıldız, metin, tarih, Google) + nav dots.
 * testimonials verisi co-located. Google logo tekrarı yerel GoogleLogo helper'ına alındı (görsel birebir).
 * Yorum tırnakları tipografik (&ldquo;/&rdquo;) — next lint (no-unescaped-entities) güvenli.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { Star, Quote, MapPin } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

const testimonials = [
  { id: 1, name: "Ayşe Kaya", location: "Kadıköy, İstanbul", rating: 5, text: "Hayatımda gördüğüm en güzel buket. Siyah kutu içindeki kırmızı güller inanılmaz etkileyiciydi. Sevgilim gözyaşlarına boğuldu.", date: "15 Haziran 2026", avatar: "AK" },
  { id: 2, name: "Mehmet Yılmaz", location: "Çankaya, Ankara", rating: 5, text: "Anneme 70. doğum günü için sipariş verdim. Tam zamanında, kusursuz paketleme, taptaze çiçekler. Muhteşem bir hizmet.", date: "12 Haziran 2026", avatar: "MY" },
  { id: 3, name: "Zeynep Arslan", location: "Konak, İzmir", rating: 5, text: "Peony buketi sadece fotoğrafta değil gerçekte de o kadar güzeldi. Paketleme, sunum, teslimat... Her şey A+.", date: "10 Haziran 2026", avatar: "ZA" },
];

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function Testimonials() {
  const [reviewIdx, setReviewIdx] = useState(0);

  return (
    <section className="py-24" style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        {/* Header row */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-14 gap-8">
          <div>
            <SectionLabel>Google Değerlendirmeleri</SectionLabel>
            <SectionTitle>
              Müşterilerimiz
              <br />
              Ne Diyor?
            </SectionTitle>
          </div>
          {/* Overall rating glass pill */}
          <div
            className="flex items-center gap-5 rounded-2xl px-7 py-5"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(139,92,246,0.08)",
              border: "1px solid rgba(255,255,255,0.8)",
            }}
          >
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", lineHeight: 1 }} className="font-semibold text-[#111827]">4.9</p>
              <div className="flex gap-0.5 mt-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
            </div>
            <div className="pl-5 border-l border-black/[0.08]">
              <p className="text-sm font-bold text-[#111827]">Mükemmel</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">234 Google yorumu</p>
              <div className="flex items-center gap-1 mt-1.5">
                <GoogleLogo className="w-3.5 h-3.5" />
                <span className="text-[11px] text-[#9CA3AF] font-medium">Google Reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {testimonials.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09, duration: 0.55 }}
              className="relative flex flex-col rounded-[20px] p-7"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(139,92,246,0.06)",
                border: "1px solid rgba(255,255,255,0.9)",
              }}
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-[#EDE9FE]" />
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)", boxShadow: "0 4px 12px rgba(139,92,246,0.35)" }}
                >
                  {r.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111827]">{r.name}</p>
                  <p className="text-xs text-[#9CA3AF] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {r.location}
                  </p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <p className="text-[13px] text-[#6B7280] leading-relaxed italic flex-1">&ldquo;{r.text}&rdquo;</p>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-black/[0.04]">
                <span className="text-[11px] text-[#C4B5FD]">{r.date}</span>
                <div className="flex items-center gap-1">
                  <GoogleLogo className="w-3.5 h-3.5" />
                  <span className="text-[10px] text-[#9CA3AF]">Google</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-3 mt-9">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setReviewIdx(i)}
              aria-label={`Değerlendirme ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${i === reviewIdx ? "w-8 h-2 bg-[#8B5CF6]" : "w-2 h-2 bg-[#DDD6FE]"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
