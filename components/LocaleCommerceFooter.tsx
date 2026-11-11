"use client";
// components/LocaleCommerceFooter.tsx — 11 Kas 2026 (ADDITIVE): sepet / ödeme / sipariş takibinde yabancı müşteriye
// kendi dilinde sade alt bilgi.
// SORUN (kanıt, yerel birleşik test 11 Kas): /sepet ve /checkout dil öneksiz TR kabuğudur; cy_lang=ar müşteri
// sayfanın geri kalanını Arapça görürken alt bilgi tamamen Türkçeydi ("Kurumsal, Hakkımızda, Çiçek Aboneliği…").
// KAPSAM: yalnız bu üç yol + TR dışı dil. TR'de ve diğer tüm yollarda mevcut <Footer> AYNEN çizilir (children).
// İçerik uydurma değil: iletişim TR alt bilgiyle aynı kimlik kaynağından; yasal sayfalar mevcut TR sayfaları
// (dil etiketinde "Türkçe" olduğu belirtilir); ana sayfa müşterinin dilindeki /<dil>.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isGlobalLocale } from "@/lib/global/config";
import { isCommerceFooterPath } from "@/lib/commerceFooter";
import { resolveSiteIdentity, type SiteIdentity } from "@/lib/siteIdentity";
import { openCookiePreferences, canOpenCookiePreferences } from "./consent/ConsentManager";

export function LocaleCommerceFooterGate({ identity, children }: { identity?: SiteIdentity; children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  if (locale === "tr" || !isGlobalLocale(locale) || !isCommerceFooterPath(pathname)) return <>{children}</>;
  const id = identity ?? resolveSiteIdentity(null);
  const wa = `https://wa.me/${id.whatsappE164.replace(/\D/g, "")}`;
  const linkCls = "text-sm text-[#A79CB8] hover:text-white transition-colors";
  return (
    <footer data-locale-commerce-footer lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} style={{ background: "linear-gradient(180deg, #2A1B3D 0%, #1E1230 100%)", borderTop: "1px solid rgba(139,92,246,0.12)" }}>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 pb-10 pt-14 sm:grid-cols-3 lg:px-14">
        <div>
          <Link href={`/${locale}`} className="font-serif text-2xl italic text-white">ÇiçekYolla</Link>
          <p className="mt-3 text-sm text-[#A79CB8]">{t("lfooter.tagline")}</p>
        </div>
        <nav aria-label={t("lfooter.help")}>
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-[#8B5CF6]">{t("lfooter.help")}</h4>
          <ul className="space-y-3">
            <li><Link href={`/${locale}`} className={linkCls}>{t("lfooter.home")}</Link></li>
            <li><Link href="/siparis-takip" className={linkCls}>{t("header.orderStatus")}</Link></li>
            <li><a href={wa} target="_blank" rel="noopener noreferrer" className={linkCls}>{t("lfooter.whatsapp")}</a></li>
            <li>
              <button type="button" className={linkCls} onClick={() => { if (canOpenCookiePreferences()) openCookiePreferences(); }}>
                {t("lfooter.cookies")}
              </button>
            </li>
          </ul>
        </nav>
        <div>
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-[#8B5CF6]">{t("lfooter.contact")}</h4>
          <ul className="space-y-3">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#A855F7]" /><a href={`tel:${id.phoneE164}`} className={linkCls} dir="ltr">{id.phoneDisplay}</a></li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#A855F7]" /><a href={wa} target="_blank" rel="noopener noreferrer" className={linkCls} dir="ltr">{id.whatsappDisplay}</a></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#A855F7]" /><a href={`mailto:${id.email}`} className={linkCls}>{id.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t px-6 py-6 text-xs text-[#7D7290] lg:px-14" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <span>© {new Date().getFullYear()} ÇiçekYolla — {t("lfooter.rights")}</span>
        <span className="flex flex-wrap gap-4">
          <span className="sr-only">{t("lfooter.legal")}</span>
          <Link href="/kvkk" className="hover:text-white">{t("lfooter.privacy")}</Link>
          <Link href="/mesafeli-satis-sozlesmesi" className="hover:text-white">{t("lfooter.terms")}</Link>
        </span>
      </div>
    </footer>
  );
}
