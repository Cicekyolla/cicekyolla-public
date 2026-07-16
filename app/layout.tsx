import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer, type FooterBrand } from "@/components/Footer";
import { MemberNewsletterBand } from "@/components/MemberNewsletterBand";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getCategoryTree, getCategoryNav, flattenCategories } from "@/lib/categories";
import { buildHeaderMenu } from "@/lib/headerNav";
import { getPublishedHomepage } from "@/lib/homepage";

// TEK KAYNAK: layout kategori ağacını getCategoryTree (React cache) ile bir kez çeker;
// Header (mega menu + mobil) ve Footer aynı canlı veriden beslenir. İkinci liste YOK.
// Ağaç yoksa/boşsa bileşenler kendi hardcoded fallback'ine düşer (site ayakta kalır).
export default async function RootLayout({ children }: { children: ReactNode }) {
  let menu: Record<string, import("@/lib/headerNav").MegaGroup> | undefined;
  let nav: { name: string; href: string }[] = [];
  let footerNav: ReturnType<typeof getCategoryNav> = [];
  let search: { name: string; href: string }[] = [];
  let footerBrand: FooterBrand | undefined;
  try {
    const tree = await getCategoryTree();
    const built = buildHeaderMenu(tree);
    menu = Object.keys(built.menu).length > 0 ? built.menu : undefined;
    // Mobil drawer = desktop header ile AYNI curated set (tutarlılık).
    nav = Object.keys(built.menu).map((label) => ({ name: label, href: built.menu[label].href }));
    footerNav = getCategoryNav(tree); // footer: tüm root'lar
    search = flattenCategories(tree).map((c) => ({ name: c.name, href: c.href })); // search: tüm ağaç
  } catch {
    menu = undefined; nav = []; footerNav = []; search = [];
  }
  try {
    const homepage = await getPublishedHomepage();
    const heroConfig = homepage?.sections.find((section) => section.type === "hero")?.config;
    if (heroConfig) {
      footerBrand = {
        logoUrl: typeof heroConfig.logo_url === "string" && heroConfig.logo_url.trim() ? heroConfig.logo_url : undefined,
        logoAlt: typeof heroConfig.logo_alt === "string" ? heroConfig.logo_alt : "ÇiçekYolla",
        logoTagline: typeof heroConfig.logo_tagline === "string" ? heroConfig.logo_tagline : "Premium Çiçekçi",
        contactPhone: typeof heroConfig.contact_phone === "string" && heroConfig.contact_phone.trim() ? heroConfig.contact_phone : "0507 441 34 74",
        contactEmail: typeof heroConfig.contact_email === "string" && heroConfig.contact_email.trim() ? heroConfig.contact_email : "info@cicekyolla.com.tr",
      };
    }
  } catch {
    footerBrand = undefined;
  }

  const navOrUndef = nav.length > 0 ? nav : undefined;
  const footerOrUndef = footerNav.length > 0 ? footerNav : undefined;

  return (
    <html lang="tr">
      <body>
        <Header menu={menu} nav={navOrUndef} search={search.length > 0 ? search : undefined} brand={footerBrand} />
        {children}
        <MemberNewsletterBand />
        <Footer categories={footerOrUndef} brand={footerBrand} />
        <WhatsAppButton />
      </body>
    </html>
  );
}
