"use client";

/**
 * §2 TRUST BAR — ZIP Homepage.tsx birebir port.
 * KRİTİK ROL: paddingTop:142px ile FloatingCategoryRail'in bottom:-118px taşmasını YAKALAR
 * (ZIP yorumu: "padding-top clears the carousel overlap"). Rail bunun beyaz üst boşluğuna oturur,
 * güven rozetleri (badges) rail'in altında görünür. Bu, önceki geçici beyaz placeholder'ın yerini alır.
 *
 * Dokunulmadı: yeniden tasarım yok, mock yok, placeholder yok — ZIP konumu birebir.
 */

import { motion } from "motion/react";
import { Zap, Truck, Leaf, Shield, Award, Clock } from "lucide-react";

const items = [
  { icon: Zap, text: "Aynı Gün Teslimat" },
  { icon: Truck, text: "Ücretsiz Kargo" },
  { icon: Leaf, text: "Taptaze Garantisi" },
  { icon: Shield, text: "Güvenli Ödeme" },
  { icon: Award, text: "2.400+ Mutlu Müşteri" },
  { icon: Clock, text: "7/24 WhatsApp Destek" },
];

export function TrustBar() {
  return (
    <section className="bg-white border-b border-black/[0.04]" style={{ paddingTop: "142px" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-4">
          {items.map(({ icon: Icon, text }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 + 0.1 }}
              className="flex items-center gap-2 text-[#374151]"
            >
              <Icon className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span className="text-[12px] font-semibold tracking-wide">{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
