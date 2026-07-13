"use client";

/**
 * §USP / Güven Bandı — ZIP Homepage.tsx §2 birebir içerik.
 *
 * SECTION ORDER FIX: Koleksiyon slider artık Hero'nun altına TAŞMIYOR (bağımsız üst section oldu),
 * bu yüzden eski `paddingTop:142px` (overlap payı) KALDIRILDI. Normal `py-6` boşluk.
 * Hero'dan hemen sonra, normal sırada gelir.
 */

import { motion } from "motion/react";
import { Leaf, Shield } from "lucide-react";

// Doğrulanmamış USP iddiaları (müşteri sayısı/destek/kargo eşiği) kaldırıldı.
// Yalnız ürün/ödeme düzeyinde savunulabilir, sayısal olmayan USP'ler kalır.
const items = [
  { icon: Leaf, text: "Taptaze Garantisi" },
  { icon: Shield, text: "Güvenli Ödeme" },
];

export function TrustBar() {
  return (
    <section className="bg-white border-b border-black/[0.04]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6">
          {items.map(({ icon: Icon, text }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
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
