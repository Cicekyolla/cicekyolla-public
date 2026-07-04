import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getCategoryTree, getCategoryNav } from "@/lib/categories";
import { mapTreeToMegaMenu } from "@/lib/catalog";

// TEK KAYNAK: layout kategori ağacını getCategoryTree (React cache) ile bir kez çeker;
// Header (mega menu + mobil) ve Footer aynı canlı veriden beslenir. İkinci liste YOK.
// Ağaç yoksa/boşsa bileşenler kendi hardcoded fallback'ine düşer (site ayakta kalır).
export default async function RootLayout({ children }: { children: ReactNode }) {
  let menu: Awaited<ReturnType<typeof mapTreeToMegaMenu>> | undefined;
  let nav: ReturnType<typeof getCategoryNav> = [];
  try {
    const tree = await getCategoryTree();
    const m = tree ? mapTreeToMegaMenu(tree) : undefined;
    menu = m && Object.keys(m).length > 0 ? m : undefined;
    nav = getCategoryNav(tree);
  } catch {
    menu = undefined;
    nav = [];
  }
  const navOrUndef = nav.length > 0 ? nav : undefined;

  return (
    <html lang="tr">
      <body>
        <Header menu={menu} nav={navOrUndef} />
        {children}
        <Footer categories={navOrUndef} />
        <WhatsAppButton />
      </body>
    </html>
  );
}
