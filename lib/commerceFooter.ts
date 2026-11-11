// lib/commerceFooter.ts — 11 Kas 2026 (ADDITIVE): yabancı müşteriye yerel alt bilgi gösterilen sipariş yolları.
// Saf modül → node --test. Liste bilerek dar: sepet, ödeme (alt yollar dahil, ör. /checkout/sonuc), sipariş takibi.
const COMMERCE_FOOTER_PATHS = ["/sepet", "/checkout", "/siparis-takip"] as const;

export function isCommerceFooterPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  return COMMERCE_FOOTER_PATHS.some((b) => p === b || p.startsWith(`${b}/`));
}
