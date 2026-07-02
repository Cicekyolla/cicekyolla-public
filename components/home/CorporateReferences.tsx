"use client";

/**
 * §11b CORPORATE REFERENCES — ZIP Homepage.tsx birebir port.
 * Başlık + 4 kurumsal istatistik + 6 marka referans kartı (otel/restoran/kulüp) + WhatsApp/Kurumsal CTA.
 * Adaptasyon: react-router <Link><button> → next/link <Link> (buton stili). Veri co-located.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";
import { whatsappUrl } from "../../lib/site";

const stats = [
  { num: "500+", label: "Kurumsal Müşteri", color: "#8B5CF6" },
  { num: "50+", label: "Otel & Restoran", color: "#A855F7" },
  { num: "12.000+", label: "Aylık Teslimat", color: "#C084FC" },
  { num: "%100", label: "Memnuniyet Oranı", color: "#10B981" },
];

const references = [
  { name: "Swissôtel The Bosphorus", category: "5 Yıldızlı Otel", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=480&fit=crop&auto=format&q=88", detail: "Haftalık lobi aranjmanları, VIP oda dekorasyonu, özel etkinlik çiçekleri. 3 yıldır iş ortağımız." },
  { name: "Nobu İstanbul", category: "Premium Restoran", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=480&fit=crop&auto=format&q=88", detail: "Masa aranjmanları, bar dekorasyonu ve mevsimlik konsept tasarım. Her hafta taze koleksiyon." },
  { name: "Four Seasons Bosphorus", category: "Lüks Otel", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=480&fit=crop&auto=format&q=88", detail: "Suite çiçek servisi, düğün organizasyonları ve yıllık dekorasyon projesi. En seçkin referansımız." },
  { name: "Soho House İstanbul", category: "Members Club", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=480&fit=crop&auto=format&q=88", detail: "Rooftop ve iç mekan dekorasyonu, özel etkinlik aranjmanları. Mevsimsel koleksiyon değişimi." },
  { name: "Hilton Garden İnn", category: "Otel Zinciri", image: "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=800&h=480&fit=crop&auto=format&q=88", detail: "Resepsiyon ve konferans salonu aranjmanları. İstanbul'daki 4 otel ile çalışmaktayız." },
  { name: "Tom Ford Beauty TR", category: "Lüks Marka", image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&h=480&fit=crop&auto=format&q=88", detail: "Mağaza açılışları, lansmanlar ve showroom dekorasyonu. Kurumsal kimliğe uygun özel tasarım." },
];

export function CorporateReferences() {
  return (
    <section className="py-20 bg-white border-t" style={{ borderColor: "rgba(139,92,246,0.07)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="text-center mb-14">
          <SectionLabel>Kurumsal Müşterilerimiz</SectionLabel>
          <SectionTitle>
            Türkiye&apos;nin Önde Gelen
            <br />
            Markaları Bize Güveniyor
          </SectionTitle>
          <p className="text-[#9CA3AF] text-sm mt-4 max-w-xl mx-auto">
            500&apos;den fazla kurumsal müşterimiz, otel lobilerinden restoran masalarına, ofis
            dekorasyonundan büyük organizasyonlara — her alanda çözüm sunuyoruz.
          </p>
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {stats.map(({ num, label, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center py-6 px-4 rounded-[20px]"
              style={{ background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", border: "1px solid rgba(139,92,246,0.08)" }}
            >
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color }} className="font-semibold">{num}</p>
              <p className="text-xs text-[#6B7280] font-medium mt-1">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Reference cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {references.map((ref, i) => (
            <motion.div
              key={ref.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09, duration: 0.6 }}
              className="group overflow-hidden rounded-[22px]"
              style={{ background: "#fff", border: "1px solid rgba(139,92,246,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              {/* Image */}
              <div className="overflow-hidden" style={{ height: "180px" }}>
                <img
                  src={ref.image}
                  alt={ref.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              {/* Body */}
              <div className="p-6">
                <p className="text-[10px] tracking-[0.22em] text-[#8B5CF6] uppercase font-bold mb-1">{ref.category}</p>
                <h4 className="text-[15px] font-bold text-[#111827] mb-3" style={{ fontFamily: "var(--font-display)" }}>{ref.name}</h4>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{ref.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-[#6B7280] text-sm mb-5">Kurumsal çözümler için teklif alın</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={whatsappUrl("Merhaba, kurumsal çiçek teklifi almak istiyorum")}
              className="inline-flex items-center gap-3 px-9 py-4 rounded-full text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 8px 24px rgba(37,211,102,0.3)" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp Kurumsal Teklif
            </a>
            <Link
              href="/kurumsal"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[#8B5CF6] text-sm font-bold border border-[#DDD6FE] hover:bg-[#F5F3FF] transition-colors"
            >
              Kurumsal Sayfamız <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
