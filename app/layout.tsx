import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Header />
        {children}
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
