import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getCategoryTree, getCategoryNav, flattenCategories } from "@/lib/categories";
import { mapTreeToMegaMenu } from "@/lib/catalog";

// TEK KAYNAK: layout kategori ağacını getCategoryTree (React cache) ile bir kez çeker;
// Header (mega menu + mobil) ve Footer aynı canlı veriden beslenir. İkinci liste YOK.
// Ağaç yoksa/boşsa bileşenler kendi hardcoded fallback'ine düşer (site ayakta kalır).
export default async function RootLayout({ children }: { children: ReactNode }) {
  let menu: Awaited<ReturnType<typeof mapTreeToMegaMenu>> | undefined;
  let nav: ReturnType<typeof getCategoryNav> = [];
  let search: { name: string; href: string }[] = [];
  try {
    const tree = await getCategoryTree();
    const m = tree ? mapTreeToMegaMenu(tree) : undefined;
    menu = m && Object.keys(m).length > 0 ? m : undefined;
    nav = getCategoryNav(tree);
    search = flattenCategories(tree).map((c) => ({ name: c.name, href: c.href }));
  } catch {
    menu = undefined;
    nav = [];
    search = [];
  }
  const navOrUndef = nav.length > 0 ? nav : undefined;

  return (
    <html lang="tr">
      <body>
        <Header menu={menu} nav={navOrUndef} search={search.length > 0 ? search : undefined} />
        {children}
        <Footer categories={navOrUndef} />
        <WhatsAppButton />
      </body>
    </html>
  );
}
