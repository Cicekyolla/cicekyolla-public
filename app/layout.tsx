import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer, type FooterBrand } from "@/components/Footer";
import { MemberNewsletterBand } from "@/components/MemberNewsletterBand";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { EcommerceViewItemTracker } from "@/components/analytics/EcommerceViewItemTracker";
import { EcommerceCartViewTracker } from "@/components/analytics/EcommerceCartViewTracker";
import { EcommerceCheckoutTracker } from "@/components/analytics/EcommerceCheckoutTracker";
import { EcommercePaymentInfoTracker } from "@/components/analytics/EcommercePaymentInfoTracker";
import { CartProvider } from "@/lib/cart";
import { getCategoryTree, getCategoryNav, flattenCategories } from "@/lib/categories";
import { buildHeaderMenu } from "@/lib/headerNav";
import { getPublishedHomepage } from "@/lib/homepage";
import { indexRobots, SITE_URL } from "@/lib/site-config";

const GTM_ID = "GTM-54FJNMT2";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "ÇiçekYolla",
  title: {
    default: "ÇiçekYolla | Online Çiçek Siparişi",
    template: "%s | ÇiçekYolla",
  },
  description:
    "1986'dan beri premium çiçek tasarımları. İstanbul'da aynı gün teslimat, Türkiye genelinde 1–3 iş günü kargo.",
  authors: [{ name: "ÇiçekYolla", url: SITE_URL }],
  creator: "ÇiçekYolla",
  publisher: "ÇiçekYolla",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "ÇiçekYolla",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ÇiçekYolla — Premium Çiçekçi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/twitter-image"],
  },
  robots: indexRobots(),
};

// TEK KAYNAK: layout kategori ağacını getCategoryTree (React cache) ile bir kez çeker;
// Header (mega menu + mobil) ve Footer aynı canlı veriden beslenir. İkinci liste YOK.
// Ağaç yoksa/boşsa bileşenler kendi hardcoded fallback'ine düşer (site ayakta kalır).
export default async function RootLayout({ children }: { children: ReactNode }) {
  let menu: Record<string, import("@/lib/headerNav").MegaGroup> | undefined;
  let nav: { name: string; href: string }[] = [];
  let footerNav: ReturnType<typeof getCategoryNav> = [];
  let search: { name: string; href: string }[] = [];
  let footerBrand: FooterBrand | undefined;
  let headerColors: { bg: string; text: string; promoBar: string } | undefined;
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
      headerColors = {
        bg: typeof heroConfig.header_bg_color === "string" ? heroConfig.header_bg_color : "#0f0a1f",
        text: typeof heroConfig.header_text_color === "string" ? heroConfig.header_text_color : "#f0f0f0",
        promoBar: typeof heroConfig.promo_bar_color === "string" ? heroConfig.promo_bar_color : "#7c3aed",
      };
    }
  } catch {
    footerBrand = undefined;
    headerColors = undefined;
  }

  const navOrUndef = nav.length > 0 ? nav : undefined;
  const footerOrUndef = footerNav.length > 0 ? footerNav : undefined;

  return (
    <html lang="tr" style={headerColors ? {
      "--header-bg-color": headerColors.bg,
      "--header-text-color": headerColors.text,
      "--promo-bar-color": headerColors.promoBar,
    } as React.CSSProperties : undefined}>
      <head>
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <EcommerceViewItemTracker />
        <CartProvider>
          <EcommerceCartViewTracker />
          <EcommerceCheckoutTracker />
          <EcommercePaymentInfoTracker />
          <Header menu={menu} nav={navOrUndef} search={search.length > 0 ? search : undefined} brand={footerBrand} />
          {children}
        </CartProvider>
        <MemberNewsletterBand />
        <Footer categories={footerOrUndef} brand={footerBrand} />
        <WhatsAppButton />
      </body>
    </html>
  );
}
