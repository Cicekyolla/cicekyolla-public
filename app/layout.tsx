import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { fetchCategoryTree } from "@/lib/api";
import { mapTreeToMegaMenu } from "@/lib/catalog";

// TEK KAYNAK: Header Mega Menu canlı kategori ağacından beslenir (admin Category
// Center → /api/categories → BURASI). Ağaç yoksa Header hardcoded fallback'e düşer.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const tree = await fetchCategoryTree();
  const menu = tree ? mapTreeToMegaMenu(tree) : undefined;
  const menuOrUndef = menu && Object.keys(menu).length > 0 ? menu : undefined;

  return (
    <html lang="tr">
      <body>
        <Header menu={menuOrUndef} />
        {children}
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
