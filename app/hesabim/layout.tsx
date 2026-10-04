// EK (SEO YAYIN ZİNCİRİ): bu rota kişiye özel bir işlem sayfasıdır → arama dizinine girmez.
// Sayfa istemci bileşeni olduğu için metadata burada verilir. Çocuklar AYNEN döner:
// akışa, veriye ve adımlara dokunulmaz. Kural + gerekçe: lib/privateRoutes.ts.
import type { Metadata } from "next";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/privateRoutes";

export const metadata: Metadata = { robots: PRIVATE_ROUTE_ROBOTS };

export default function PrivateRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
