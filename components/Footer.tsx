"use client";
import { usePathname } from "next/navigation";
import { GLOBAL_LOCALES } from "@/lib/global/config";
import { useCategoryTranslations, slugFromHref } from "@/lib/i18n/content";

import Link from "next/link";
import { FlowerGuaranteeBadge } from "@/components/FlowerGuaranteeBadge";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { BrandWordmark } from "./BrandWordmark";
import { openCookiePreferences, canOpenCookiePreferences } from "./consent/ConsentManager";
import { yonelme } from "@/lib/turkish";

export interface FooterBrand {
  logoUrl?: string;
  logoAlt?: string;
  logoTagline?: string;
  contactPhone?: string;
  contactEmail?: string;
}

const FOOTER_DELIVERY_LINKS = [
  { label: "Kadıköy", href: "/istanbul/kadikoy" },
  { label: "Beşiktaş", href: "/istanbul/besiktas" },
  { label: "Şişli", href: "/istanbul/sisli" },
  { label: "Ankara", href: "/ankara/cankaya" },
  { label: "İzmir", href: "/izmir/konak" },
];

/**
 * Locale zinciri korunur: /ru/... içindeyken teslimat kısayolu kullanıcıyı TR
 * URL'sine atmaz, /ru/istanbul/... verir. Global tarafta yalnız İstanbul yüzeyi
 * yayında olduğu için diğer iller locale modunda gizlenir (404 üretmemek için).
 * TR yolunda liste ve davranış BİREBİR aynıdır.
 */
function teslimatLinkleri(pathname: string | null) {
  const m = /^\/([a-z]{2})(?:\/|$)/.exec(pathname ?? "");
  const locale = m && (GLOBAL_LOCALES as readonly string[]).includes(m[1]) ? m[1] : null;
  if (!locale) return FOOTER_DELIVERY_LINKS;
  return FOOTER_DELIVERY_LINKS.filter((l) => l.href.startsWith("/istanbul/")).map((l) => ({
    ...l,
    href: `/${locale}${l.href}`,
  }));
}

const FALLBACK_COLLECTION_LINKS = [
  { name: "Güller", href: "/kategori/guller" },
  { name: "Buketler", href: "/kategori/buketler" },
  { name: "Orkideler", href: "/kategori/orkideler" },
  { name: "Özel Günler", href: "/kategori/ozel-gunler" },
  { name: "Yapay Çiçekler", href: "/kategori/yapay-cicekler" },
  { name: "Yapay Ağaçlar", href: "/kategori/yapay-agaclar" },
  { name: "Şimşir", href: "/kategori/simsir" },
  { name: "Çim Duvar", href: "/kategori/cim-duvar" },
  { name: "Çim Çit", href: "/kategori/cim-cit" },
  { name: "Peyzaj", href: "/dekorasyon" },
];

export function Footer({
  categories,
  brand,
}: {
  categories?: { name: string; href: string }[];
  brand?: FooterBrand;
}) {
  // Faz 2: onaylı kategori çevirisi varsa footer etiketi (href aynı)
  const pathname = usePathname();
  const catTx = useCategoryTranslations();
  const cn = (name: string, href?: string | null) => catTx.bySlug[slugFromHref(href)]?.name ?? name;
  const contactPhone = brand?.contactPhone?.trim() || "0507 441 34 74";
  const contactEmail = brand?.contactEmail?.trim() || "info@cicekyolla.com.tr";
  const phoneDigits = contactPhone.replace(/\D/g, "");
  const contactPhoneHref = phoneDigits.startsWith("0")
    ? `+90${phoneDigits.slice(1)}`
    : phoneDigits.startsWith("90")
      ? `+${phoneDigits}`
      : `+90${phoneDigits}`;
  const collectionLinks = [
    ...(categories && categories.length > 0 ? categories : FALLBACK_COLLECTION_LINKS)
      .filter((item) => item.href !== "/kategori/turkiye-geneli-kargo"),
    { name: "🚚 Türkiye Geneli Kargo", href: "/kategori/turkiye-geneli-kargo" },
  ];

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
            {/* Footer wordmark ağdan görsel çağırmaz; header ile aynı sabit marka bileşenidir. */}
            <div className="mb-8">
              <BrandWordmark alt={brand?.logoAlt} tagline={brand?.logoTagline} size="badge" inverse />
            </div>

            <p className="text-sm text-[#6B7280] leading-relaxed max-w-xs mb-8">
              Türkiye'nin en prestijli çiçek teslimat platformu. Her özel anınızda duygularınızı en güzel şekilde ifade etmek için buradayız.
            </p>

            {/* Social icons */}
            <div className="flex gap-3">
              {[
                { name: "Instagram", href: "https://www.instagram.com/cicekyolla/", Icon: Instagram },
                { name: "Facebook", href: "https://www.facebook.com/cicekyolla", Icon: Facebook },
              ].map(({ name, href, Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  aria-label={`ÇiçekYolla ${name} hesabını aç`}
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
              {collectionLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-[#6B7280] hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    {cn(item.name, item.href)}
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
                { label: "Çiçek Aboneliği", href: "/abonelik" },
                { label: "Teslimat Bölgeleri", href: "/teslimat-bolgeleri" },
                { label: "Sık Sorulan Sorular", href: "/sik-sorulan-sorular" },
                { label: "İletişim", href: "/iletisim" },
                { label: "Site Haritası", href: "/site-haritasi" },
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
              {teslimatLinkleri(pathname).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-[#6B7280] hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    {/* HATA 2 düzeltmesi: sabit "'e" yerine gerçek Türkçe yönelme
                        eki (yonelme()) — "Beşiktaş'e" gibi hatalar önlenir. */}
                    {yonelme(item.label)} Çiçek
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
                  <a href={`tel:${contactPhoneHref}`} className="text-sm text-white font-semibold hover:text-[#C4B5FD] transition-colors">{contactPhone}</a>
                  <p className="text-xs text-[#6B7280] mt-0.5">Her gün 08:00 – 22:00</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Mail className="w-3.5 h-3.5 text-[#A855F7]" />
                </div>
                <a href={`mailto:${contactEmail}`} className="text-sm text-[#6B7280] hover:text-white transition-colors mt-1.5">{contactEmail}</a>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <MapPin className="w-3.5 h-3.5 text-[#A855F7]" />
                </div>
                <span className="text-sm text-[#6B7280] mt-1.5">İstanbul, Türkiye</span>
              </li>
            </ul>

            {/* %100 ÇiçekYolla Garantisi — telefon/e-posta/adresin ALTINDAKİ doğal
                boşlukta marka güven imzası. Footer koyu (#0D0520 → #070011) olduğu
                için beyaz (inverse) master kullanılır. Footer düzeni değişmedi;
                iletişim sütununun doğal devamı gibi okunur. */}
            <div className="mt-8 flex items-center gap-3">
              <FlowerGuaranteeBadge color="#ffffff" className="h-14 w-14 shrink-0 opacity-85 lg:h-16 lg:w-16" />
              <span className="text-[12.5px] font-semibold leading-snug text-white/70">
                %100 ÇiçekYolla
                <br />
                Garantisi
              </span>
            </div>
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
              { label: "SSS", href: "/sik-sorulan-sorular" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="text-xs text-[#4B5563] hover:text-[#9CA3AF] transition-colors">
                {item.label}
              </Link>
            ))}
            {/* Çerez tercihlerini sonradan değiştirme girişi — Gizlilik Ayarları
                panelini açar. Panel hazır değilse çerez politikasına düşer. */}
            <button
              type="button"
              onClick={() => {
                if (canOpenCookiePreferences()) openCookiePreferences();
                else window.location.href = "/kvkk";
              }}
              className="text-xs text-[#4B5563] hover:text-[#9CA3AF] transition-colors"
            >
              Çerez Tercihleri
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
