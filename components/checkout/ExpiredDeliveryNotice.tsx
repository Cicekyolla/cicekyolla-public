"use client";

/**
 * ExpiredDeliveryNotice — "Teslimat tarihi geçtiği için ürün sepetten kaldırıldı."
 *
 * Sepet satırı sessizce kaybolmaz; müşteri NE olduğunu ve NEDEN olduğunu görür.
 * Karar mantığı burada DEĞİL: silme kuralı lib/deliveryExpiry.ts + lib/cart.tsx
 * içinde tek yerdedir. Bu bileşen yalnız sonucu gösterir.
 */

import { AlertTriangle, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";

export function ExpiredDeliveryNotice({ className = "" }: { className?: string }) {
  const { expiredNotice, dismissExpiredNotice } = useCart();
  const t = useT();
  if (!expiredNotice || expiredNotice.count < 1) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-snug text-[#92400E]">
          {t("cart.expiredRemoved", { count: expiredNotice.count })}
        </p>
        {expiredNotice.names.length > 0 && (
          <p className="mt-0.5 truncate text-[12px] text-[#B45309]">{expiredNotice.names.join(" · ")}</p>
        )}
        <p className="mt-1 text-[12px] leading-snug text-[#A16207]">{t("cart.expiredHint")}</p>
      </div>
      <button
        type="button"
        onClick={dismissExpiredNotice}
        aria-label={t("common.close")}
        className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#B45309] transition-colors hover:bg-[#FEF3C7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B45309]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
