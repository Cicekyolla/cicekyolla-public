"use client";

/**
 * §13 WHATSAPP CTA — ZIP Homepage.tsx birebir port.
 * Büyük mor gradient kart: dekoratif dönen halkalar + glow + rozet + başlık + iki CTA (WhatsApp / Koleksiyon).
 * Adaptasyon: react-router <Link><button> → next/link <Link> (buton stili). Apostroflar &apos;.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { Gift, ArrowRight } from "lucide-react";
import { whatsappUrl } from "../../lib/site";

export function WhatsAppCTA() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div
          className="relative overflow-hidden rounded-[32px] py-20 px-10 lg:px-20 text-center"
          style={{
            background: "linear-gradient(135deg, #1E0845 0%, #4C1D95 22%, #7C3AED 55%, #9333EA 78%, #B06EF7 100%)",
            boxShadow: "0 40px 120px rgba(139,92,246,0.3)",
          }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.02, 1] }}
              transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
              className="absolute -top-48 -right-48 w-96 h-96 rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.04)" }}
            />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "36px 36px" }}
            />
            {/* Glow blob */}
            <div
              className="absolute top-0 right-1/4 w-96 h-96 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(192,132,252,0.25) 0%, transparent 70%)", filter: "blur(40px)" }}
            />
          </div>

          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2.5 border rounded-full px-5 py-2.5 text-[11px] tracking-[0.18em] uppercase font-bold mb-8 text-white/80"
              style={{ borderColor: "rgba(192,132,252,0.3)", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
            >
              <Gift className="w-3.5 h-3.5 text-[#C084FC]" />
              Kişiye Özel Premium Hizmet
            </div>
            <h2
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.0, letterSpacing: "-0.02em", fontSize: "clamp(2.2rem, 5vw, 4.5rem)" }}
              className="font-semibold text-white mb-6"
            >
              Sevdiklerinize Özel
              <br />
              <em
                className="not-italic"
                style={{
                  background: "linear-gradient(135deg, #E9D5FF, #C084FC)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Bir Sürpriz
              </em>{" "}
              Hazırlayalım
            </h2>
            <p className="text-white/60 text-lg max-w-lg mx-auto mb-12 leading-relaxed">
              Uzman çiçek tasarımcılarımız tamamen kişiselleştirilmiş aranjmanlar oluşturuyor.
              WhatsApp&apos;tan yazın, gerisini biz halledelim.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.a
                href={whatsappUrl()}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 bg-white text-[#7C3AED] px-10 py-4 rounded-full text-sm font-bold shadow-2xl"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.15)" }}
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp&apos;tan Yazın
              </motion.a>
              <Link href="/kategori/buketler" className="inline-block">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-2 px-10 py-4 rounded-full text-white/90 text-sm font-semibold transition-colors"
                  style={{ border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
                >
                  Koleksiyonu İncele <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
