"use client";
// ============================================================================
// GLOBAL VERSION 80 — TR mağaza kabuğu (Header/teslimat şeridi/üye bandı)
// locale rotalarında ÇİZİLMEZ; oradaki kabuk V80Shell'dir. (Yüzen WhatsApp +
// Telegram bu kapının DIŞINDADIR — 13 dilde de görünür, app/layout.tsx.)
// TR yollarında children AYNEN geçer (görsel/işlev sıfır değişiklik).
// Root layout sunucuda pathname bilmez (headers() tüm TR sayfalarını dynamic
// yapardı); bu yüzden karar client tarafında, hydration-güvenli usePathname ile.
// ============================================================================
import { usePathname } from "next/navigation";
import { isGlobalLocalePath } from "@/lib/global/config";

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && isGlobalLocalePath(pathname)) return null;
  return <>{children}</>;
}
