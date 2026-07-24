"use client";

/**
 * §12 DISTRICT DELIVERY — ZIP Homepage.tsx birebir port.
 * Sol: ilçe/il listesi → /{il}/{ilçe} SEO landing iç linkleri (çalışan route'lar).
 * Veri: admin Delivery Motor'daki aktif bölgeler (zones prop — app/page.tsx
 * fetchDeliveryZones ile server'da çeker). API erişilemezse FALLBACK_ZONES
 * (yalnız çalışan linkler) devreye girer. İstanbul = aynı gün teslimat,
 * diğer iller = 1–3 iş günü kargo. Altta açılır (details) tüm il/ilçe listesi.
 * Sağ: animasyonlu soyut harita (dönen halkalar + şehir noktaları, ping efekti).
 */

import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, ArrowRight, ChevronDown } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";
import type { DeliveryZoneCity } from "@/lib/api";

// API erişilemezse: [...slug] hardcoded DELIVERY_DATA ile birebir çalışan linkler.
const FALLBACK_ZONES: DeliveryZoneCity[] = [
  { city: "İstanbul", city_slug: "istanbul", same_day: true, districts: [
    { name: "Kadıköy", slug: "kadikoy", same_day: true },
    { name: "Beşiktaş", slug: "besiktas", same_day: true },
    { name: "Şişli", slug: "sisli", same_day: true },
    { name: "Üsküdar", slug: "uskudar", same_day: true },
  ] },
  { city: "Ankara", city_slug: "ankara", same_day: false, districts: [
    { name: "Çankaya", slug: "cankaya", same_day: false },
    { name: "Keçiören", slug: "kecioren", same_day: false },
  ] },
  { city: "İzmir", city_slug: "izmir", same_day: false, districts: [
    { name: "Konak", slug: "konak", same_day: false },
    { name: "Karşıyaka", slug: "karsiyaka", same_day: false },
  ] },
];

const cityDots = [
  { x: "32%", y: "38%", label: "İstanbul", delay: 0 },
  { x: "58%", y: "28%", label: "Ankara", delay: 0.15 },
  { x: "18%", y: "62%", label: "İzmir", delay: 0.3 },
  { x: "72%", y: "60%", label: "Antalya", delay: 0.45 },
];

/** Ana listedeki satır: İstanbul ilçeleri + diğer iller (il satırı ilk ilçesine gider). */
function buildRows(source: DeliveryZoneCity[]) {
  const ist = source.find((c) => c.city_slug === "istanbul");
  const others = source.filter((c) => c.city_slug !== "istanbul");
  const rows: { key: string; name: string; href: string; badge: string }[] = [];
  for (const d of (ist?.districts ?? []).slice(0, 6)) {
    rows.push({ key: `istanbul-${d.slug}`, name: d.name, href: `/istanbul/${d.slug}`, badge: "Aynı Gün Teslimat" });
  }
  for (const c of others) {
    if (rows.length >= 8) break;
    rows.push({
      key: c.city_slug,
      name: c.city,
      href: c.districts[0] ? `/${c.city_slug}/${c.districts[0].slug}` : "/teslimat-bolgeleri",
      badge: "1–3 İş Günü Kargo",
    });
  }
  return rows;
}

export function DistrictDelivery({ zones }: { zones?: DeliveryZoneCity[] }) {
  const source = zones && zones.length > 0 ? zones : FALLBACK_ZONES;
  const rows = buildRows(source);
  return (
    <section className="py-24" style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 60%, #FAFAFA 100%)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
          <div>
            <SectionLabel>Teslimat Bölgeleri</SectionLabel>
            <SectionTitle>
              Türkiye&apos;nin Her
              <br />
              Köşesine Teslimat
            </SectionTitle>
            <p className="text-[#6B7280] text-[16px] leading-relaxed mt-6 mb-10">
              İstanbul içi siparişlerde aynı gün teslimat; İstanbul dışındaki
              illere 1–3 iş günü içinde özenli kargo ile teslim. 14:00&apos;a kadar
              verilen İstanbul siparişleri bugün teslim edilir.
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {rows.map((d, idx) => (
                <motion.div
                  key={d.key}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06, duration: 0.5 }}
                >
                  <Link
                    href={d.href}
                    className="group flex items-center justify-between px-5 py-4 rounded-[14px] transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.8)",
                      border: "1px solid rgba(139,92,246,0.08)",
                      backdropFilter: "blur(12px)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.3)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(139,92,246,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.08)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" }}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111827] group-hover:text-[#8B5CF6] transition-colors">{d.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-[#8B5CF6] whitespace-nowrap">{d.badge}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#DDD6FE] group-hover:text-[#8B5CF6] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Açılır tüm il/ilçe listesi — kompakt, SEO iç linkleme (details: JS'siz) */}
            <div className="mt-8 grid grid-cols-1 gap-2">
              {source.map((c) => (
                <details
                  key={c.city_slug}
                  className="group rounded-[14px] overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(139,92,246,0.08)" }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-[#111827]">
                      <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      {c.city}
                      {c.districts.length > 0 && (
                        <span className="text-[11px] font-medium text-[#9CA3AF]">{c.districts.length} ilçe</span>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-[#8B5CF6]">
                        {c.city_slug === "istanbul" ? "Aynı Gün Teslimat" : "1–3 İş Günü Kargo"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#DDD6FE] transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-2 px-5 pb-4 pt-1">
                    {c.districts.map((d) => (
                      <Link
                        key={d.slug}
                        href={`/${c.city_slug}/${d.slug}`}
                        className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[#374151] transition-colors hover:text-[#8B5CF6]"
                        style={{ background: "#F5F3FF", border: "1px solid rgba(139,92,246,0.1)" }}
                      >
                        {d.name}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
              <Link
                href="/teslimat-bolgeleri"
                className="mt-1 inline-flex items-center gap-2 px-1 text-sm font-semibold text-[#8B5CF6] hover:text-[#7C3AED]"
              >
                Tüm teslimat bölgelerini gör <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Abstract map */}
          <div className="hidden lg:block">
            <div
              className="relative overflow-hidden rounded-[32px]"
              style={{
                aspectRatio: "1",
                background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #DDD6FE 100%)",
                boxShadow: "0 40px 100px rgba(139,92,246,0.12), 0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              {/* Decorative rings */}
              {[280, 200, 130].map((size, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                  transition={{ duration: 40 + i * 15, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ width: size, height: size, border: `1px solid rgba(139,92,246,${0.12 + i * 0.06})` }}
                />
              ))}

              {/* City dots */}
              {cityDots.map((dot) => (
                <motion.div
                  key={dot.label}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: dot.delay, type: "spring", stiffness: 200 }}
                  className="absolute"
                  style={{ left: dot.x, top: dot.y }}
                >
                  {/* Ping effect */}
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full animate-ping" style={{ background: "rgba(139,92,246,0.2)", animationDuration: "2.5s" }} />
                    <div
                      className="relative w-4 h-4 rounded-full"
                      style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)", boxShadow: "0 4px 16px rgba(139,92,246,0.5)", border: "2px solid white" }}
                    />
                  </div>
                  <div
                    className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-2"
                    style={{
                      background: "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(139,92,246,0.1)",
                    }}
                  >
                    <p className="text-[12px] font-bold text-[#111827]">{dot.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
