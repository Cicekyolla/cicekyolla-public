import type { ReactNode } from "react";

// Root layout. Dil tr; görsel tasarım YOK (8B-2'de Figma giydirilecek).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
