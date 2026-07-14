"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";

export interface FooterBrand {
  logoUrl?: string;
  logoAlt?: string;
  logoTagline?: string;
}

export function Footer({
  categories,
  brand,
}: {
  categories?: { name: string; href: string }[];
  brand?: FooterBrand;
}) {
  return (
    <footer
      style={{
        background: "linear-gradient(180deg, #0D0520 0%, #070011 100%)",
        borderTop: "1px solid rgba(139,92,246,0.12)",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14 pt-20 pb-10">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-14 mb-16">

          {/* Brand column */}
          <div>
            {/* Footer brand — homepage CMS'ten yönetilir; Header ve Hero'yu etkilemez. */}
            <div className="mb-6">
              {brand?.logoUrl ? (
                <div className="w-fit max-w-full">
                  <img
                    src={brand.logoUrl}
                    alt={brand.logoAlt || "ÇiçekYolla"}
                    className="block h-auto w-[220px] sm:w-[250px] max-w-full object-contain object-left"
                  />
                  {brand.logoTagline ? (
                    <p className="mt-2 pl-1 text-[9px] font-bold uppercase tracking-[0.35em] text-[#C084FC]">
                      {brand.logoTagline}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #A855F7)",
                      boxShadow: "0 6px 20px rgba(139,92,246,0.4)",
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.5 2 6 5 6 8c0 2.5 1.5 4.5 3 5.5.5.3 1 .5 1.5.7V20a1 1 0 002 0v-5.8c.5-.2 1-.4 1.5-.7C15.5 12.5 18 10.5 18 8c0-3-2.5-6-6-6z"/>
                      <path strokeLinecap="round" d="M9 8c0-1.7 1.3-3 3-3s3 1.3 3 3"/>
                    </svg>
                  </div>
                  <div>
                    <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em", lineHeight: 1 }} className="text-xl font-semibold text-white uppercase block">Çiçekyolla</span>
                    <span className="text-[9px] tracking-[0.35em] text-[#8B5CF6] uppercase font-bold">Premium Çiçekçi</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-[#6B7280] leading-relaxed max-w-xs mb-8">
              Türkiye'nin en prestijli çiçek teslimat platformu. Her özel anınızda duygularınızı en güzel şekilde ifade etmek için buradayız.
            </p>

            {/* Social icons */}
            <div className="flex gap-3">
              {[Instagram, Facebook].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#6B7280] hover:text-white transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.5)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories — TEK KAYNAK: layout'tan canlı kategori ağacı (fallback korumalı) */}
          <div>
            <h4 className="text-[10px] tracking-[0.28em] text-[#8B5CF6] uppercase font-bold mb-6">Koleksiyonlar</h4>
            <ul className="space-y-3">
              {(categories ?? []).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-[#6B7280] hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div>
            <h4 className="text-[10px] tracking-[0.28em] text-[#8B5CF6] uppercase font-bold mb-6">Kurumsal</h4>
            <ul className="space-y-3 mb-8">
              {[
                { label: "Hakkımızda", href: "/hakkimizda" },
                { label: "Blog", href: "/blog" },
                { label: "Kurumsal Hizmetler", href: "/kurumsal" },
                { label: "Teslimat Bölgeleri", href: "/teslimat-bolgeleri" },
                { label: "Sık Sorulan Sorular", href: "/sss" },
                { label: "İletişim", href: "/iletisim" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-[#6B7280] hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-[10px] tracking-[0.28em] text-[#8B5CF6] uppercase font-bold mb-4">Teslimat</h4>
            <ul className="space-y-3">
              {[
                { label: "Kadıköy", slug: "kadikoy" },
                { label: "Beşiktaş", slug: "besiktas" },
                { label: "Şişli", slug: "sisli" },
                { label: "Ankara", slug: "ankara" },
                { label: "İzmir", slug: "izmir" },
              ].map((d) => (
                <li key={d.slug}>
                  <Link href={`/cicek-gonder/${d.slug}`} className="text-sm text-[#6B7280] hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    {d.label}'e Çiçek
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[10px] tracking-[0.28em] text-[#8B5CF6] uppercase font-bold mb-6">İletişim</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Phone className="w-3.5 h-3.5 text-[#A855F7]" />
                </div>
                <div>
                  <p className="text-sm text-white font-semibold">0555 123 45 67</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">Her gün 08:00 – 22:00</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Mail className="w-3.5 h-3.5 text-[#A855F7]" />
                </div>
                <span className="text-sm text-[#6B7280] mt-1.5">destek@cicekyolla.com.tr</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <MapPin className="w-3.5 h-3.5 text-[#A855F7]" />
                </div>
                <span className="text-sm text-[#6B7280] mt-1.5">İstanbul, Türkiye</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mb-8" style={{ borderColor: "rgba(255,255,255,0.05)" }} />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#4B5563]">© 2026 Çiçekyolla.com.tr — Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap gap-5">
            {[
              { label: "KVKK", href: "/kvkk" },
              { label: "Mesafeli Satış", href: "/mesafeli-satis-sozlesmesi" },
              { label: "SSS", href: "/sss" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="text-xs text-[#4B5563] hover:text-[#9CA3AF] transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
