"use client";

/**
 * §14 NEWSLETTER — ZIP Homepage.tsx birebir port (son homepage bölümü).
 * E-Bülten kayıt bandı: başlık + e-posta input + "Abone Ol".
 * Not: Footer + WhatsAppButton ZIP'te bunun altında; bizde Footer layout'ta (LOCKED),
 *      WhatsAppButton ayrı adımda layout'a eklenecek — bu yüzden burada YOK.
 */

import { motion } from "motion/react";

export function Newsletter() {
  return (
    <section
      className="py-14 border-t"
      style={{ background: "linear-gradient(180deg, #F5F3FF 0%, #FAFAFA 100%)", borderColor: "rgba(139,92,246,0.1)" }}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-2">E-Bülten</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }} className="font-semibold text-[#111827]">
              Özel Fırsatları Kaçırmayın
            </h3>
            <p className="text-sm text-[#9CA3AF] mt-1.5">Mevsimlik koleksiyonlar, özel indirimler, çiçek inspirasyonu.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="email"
              placeholder="E-posta adresiniz"
              className="flex-1 md:w-72 px-5 py-3.5 rounded-full bg-white text-sm focus:outline-none transition-all"
              style={{ border: "1.5px solid rgba(139,92,246,0.2)", boxShadow: "0 2px 8px rgba(139,92,246,0.06)" }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "#8B5CF6";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(139,92,246,0.2)";
              }}
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-7 py-3.5 rounded-full text-white text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)", boxShadow: "0 6px 20px rgba(139,92,246,0.35)" }}
            >
              Abone Ol
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
