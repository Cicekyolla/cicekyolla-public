"use client";

/**
 * DeliveryLocationBadge — "📍 Maltepe, İstanbul · Değiştir"
 * ---------------------------------------------------------------------------
 * NEDEN VAR: müşteri teslimat yerini bir kez seçtiği hâlde site onu hatırlamıyor
 * gibi görünüyordu; "Çiçeğinizi nereye gönderelim?" akışı tekrar tekrar karşısına
 * çıkıyordu. Bu şerit, HATIRLANAN adresi görünür kılar.
 *
 * KURALLAR
 *   • İkinci bir adres state'i YOK — kaynak lib/pendingDelivery.ts (tek kayıt).
 *   • Teslimat UYGUNLUĞU burada belirlenmez; karar yine Delivery Engine'de
 *     (PDP planlayıcı / /api/delivery-check). Burası yalnız SUNUM.
 *   • Adres yoksa hiçbir şey çizilmez → ilk ziyaretçi için görsel değişiklik sıfır.
 *   • "Değiştir" mevcut popup'ı açar (yeni seçici kurulmaz).
 */

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  readRememberedAddress,
  openDeliveryAddressPopup,
  PENDING_ADDRESS_EVENT,
  type PendingDelivery,
} from "@/lib/pendingDelivery";
import { useT } from "@/lib/i18n";

/** Şeridin görünmeyeceği yollar — adres zaten o ekranın konusudur. */
const HIDDEN_PREFIXES = ["/adres-kontrol", "/checkout", "/giris", "/hesabim", "/sifre-belirle", "/sifremi-unuttum", "/onizleme"];

function shortLabel(p: PendingDelivery): string {
  const parts = [p.district?.trim(), p.city?.trim()].filter(Boolean) as string[];
  if (parts.length > 0) return parts.join(", ");
  const alt = [p.neighborhood?.trim(), p.city?.trim()].filter(Boolean) as string[];
  if (alt.length > 0) return alt.join(", ");
  return (p.address ?? "").trim();
}

export function DeliveryLocationBadge() {
  const t = useT();
  const pathname = usePathname();
  const [addr, setAddr] = useState<PendingDelivery | null>(null);

  const refresh = useCallback(() => setAddr(readRememberedAddress()), []);

  // Sunucuda çizilmez (adres yalnız tarayıcıda bilinir) → hydration uyuşmazlığı yok.
  useEffect(() => {
    refresh();
    window.addEventListener(PENDING_ADDRESS_EVENT, refresh);
    return () => window.removeEventListener(PENDING_ADDRESS_EVENT, refresh);
  }, [refresh]);

  // Yol değişince (aynı adres kalsa bile) tazele: popup'tan seçim sonrası
  // gezinmede şerit anında doğru yeri gösterir.
  useEffect(() => { refresh(); }, [pathname, refresh]);

  if (!addr) return null;
  if (HIDDEN_PREFIXES.some((prefix) => (pathname ?? "").startsWith(prefix))) return null;

  const label = shortLabel(addr);
  if (!label) return null;

  return (
    <div className="border-b border-[#EDE9FE] bg-[#FBFAFF]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-5 py-2 lg:px-10 xl:px-14">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#7C3AED]" aria-hidden="true" />
        <span className="shrink-0 text-[11.5px] font-medium text-[#9CA3AF]">{t("loc.badge.prefix")}</span>
        <span className="min-w-0 truncate text-[12.5px] font-bold text-[#1F2937]">{label}</span>
        <button
          type="button"
          onClick={openDeliveryAddressPopup}
          className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold text-[#7C3AED] transition-colors hover:bg-[#F5F3FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
        >
          {t("loc.badge.change")}
        </button>
      </div>
    </div>
  );
}
