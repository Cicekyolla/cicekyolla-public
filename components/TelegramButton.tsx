"use client";

/**
 * TelegramButton — WhatsApp yüzen butonunun yanında Telegram sohbet butonu (TR + 13 Global dil).
 * Veri: Admin → API hero.config → lib/telegramContact.resolveTelegram → app/layout.tsx (tek damar).
 * Yalnız https://t.me/<kullanıcı> bağlantısı açar; bot/API/webhook yok.
 *
 * Yerleşim (birbirini ve satın alma düğmelerini kapatmaz):
 *  - TR sayfaları: WhatsApp (bottom-6) üstünde, 12px boşlukla.
 *  - Ürün sayfası (TR /urun/ ve 13 dil /<dil>/<ürün>/): mobilde sticky "Sipariş Ver / Order Now" çubuğunun
 *    ÜSTÜNDE, masaüstünde (çubuk yok) sağ-altta. TR'de yüzen WhatsApp burada zaten gizli.
 *  - Global 13 dil diğer sayfalar: yüzen WhatsApp yok (WhatsApp başlık/bölümlerde) → sağ-altta.
 */

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { isGlobalLocalePath } from "@/lib/global/config";
import { TELEGRAM_LABELS, isProductPagePath, telegramLocale, type TelegramContact } from "@/lib/telegramContact";

export function TelegramButton({ enabled, url }: TelegramContact) {
  const pathname = usePathname();
  if (!enabled) return null;

  const labels = TELEGRAM_LABELS[telegramLocale(pathname)] ?? TELEGRAM_LABELS.tr;
  const position = isProductPagePath(pathname)
    ? "bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-6"
    : pathname && isGlobalLocalePath(pathname)
      ? "bottom-6"
      : "bottom-[84px] lg:bottom-[92px]";

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="nofollow noopener noreferrer"
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 2.15, type: "spring", stiffness: 200, damping: 18 }}
      whileTap={{ scale: 0.93 }}
      aria-label={labels.aria}
      title={labels.aria}
      data-telegram-button=""
      className={`fixed ${position} right-6 z-50 w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center rounded-full text-white`}
      style={{
        background: "linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)",
        boxShadow: "0 8px 32px rgba(34,158,217,0.35), 0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M9.78 15.27 9.4 20.6c.54 0 .78-.23 1.06-.51l2.55-2.44 5.28 3.87c.97.53 1.65.25 1.91-.89l3.46-16.22c.31-1.43-.52-1.99-1.46-1.64L1.86 10.6C.47 11.14.49 11.92 1.62 12.27l5.2 1.62L18.9 6.29c.57-.38 1.09-.17.66.21L9.78 15.27z" />
      </svg>
    </motion.a>
  );
}
