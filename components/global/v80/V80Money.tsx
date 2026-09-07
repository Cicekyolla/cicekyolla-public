"use client";
import { useCurrency } from "@/lib/currency";
import { Num } from "@/lib/i18n";

/** TRY kuruş → seçili para birimi (mevcut currency motoru; sunucu daima TRY basar). */
export function V80Money({ minor, className }: { minor: number; className?: string }) {
  const { money } = useCurrency();
  return <Num className={className}>{money(minor)}</Num>;
}
