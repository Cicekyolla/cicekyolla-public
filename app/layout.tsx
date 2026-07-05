import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getCategoryTree, getCategoryNav, flattenCategories } from "@/lib/categories";
import { buildHeaderMenu } from "@/lib/headerNav";

// TEK KAYNAK: layout kategori ağacını getCategoryTree (React cache) ile bir kez çeker;
// Header (mega menu + mobil) ve Footer aynı canlı veriden beslenir. İkinci liste YOK.
// Ağaç yoksa/boşsa bileşenler kendi hardcoded fallback'ine düşer (site ayakta kalır).
export default async function RootLayout({ children }: { children: ReactNode }) {
  let menu: Record<string, import("@/lib/headerNav").MegaGroup> | undefined;
  let nav: { name: string; href: string }[] = [];
  let footerNav: ReturnType<typeof getCategoryNav> = [];
  let search: { name: string; href: string }[] = [];
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
  const navOrUndef = nav.length > 0 ? nav : undefined;
  const footerOrUndef = footerNav.length > 0 ? footerNav : undefined;

  return (
    <html lang="tr">
      <body>
        <Header menu={menu} nav={navOrUndef} search={search.length > 0 ? search : undefined} />
        {children}
        <Footer categories={footerOrUndef} />
        <WhatsAppButton />
      </body>
    </html>
  );
}
