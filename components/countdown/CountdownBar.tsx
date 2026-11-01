"use client";
// Geri sayım şeridi — istemci gövdesi. Kutu yüksekliği SSR'da sabit (h-14) → metin sonradan gelse de
// sayfa kaymaz. Metin <p>/<span>; başlık etiketi YOK. Dakikada bir güncellenir.
import Link from "next/link";
import { useEffect, useState } from "react";
import { countdownPhase, formatRemaining } from "@/lib/countdown";

type Props = { label: string; targetDate: string; subText: string; dayText: string; ctaLabel: string; ctaHref: string };

export function CountdownBar({ label, targetDate, subText, dayText, ctaLabel, ctaHref }: Props) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const phase = now == null ? null : countdownPhase(targetDate, now);
  if (phase?.kind === "over") return null; // 25 Kasım 00:00 TR sonrası (ISR önbelleğinde kalmış sayfa için)

  const sub = phase?.kind === "before" ? subText : "";

  return (
    <div className="bg-[#F5F3FF] border-y border-[#EDE9FE]" data-countdown="">
      <div className="max-w-[1440px] mx-auto h-14 px-4 lg:px-14 flex items-center gap-3">
        <p className="min-w-0 flex-1 flex items-baseline gap-3 text-[13px] sm:text-[15px] leading-tight" aria-live="off">
          {phase?.kind === "day" ? (
            <span className="truncate font-semibold text-[#4C1D95]">{dayText || label}</span>
          ) : phase?.kind === "before" ? (
            // Mobilde aynı satırda iki küçük satır: etiket üstte, kalan süre altta (her zaman tam görünür).
            <span className="min-w-0 lg:shrink-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-1 font-semibold text-[#4C1D95]">
              <span className="truncate text-[11px] sm:text-[15px] font-medium sm:font-semibold">{label}</span>
              <span className="shrink-0 whitespace-nowrap sm:hidden">{formatRemaining(phase, true)} kaldı</span>
              <span className="shrink-0 whitespace-nowrap hidden sm:inline">{formatRemaining(phase)} kaldı</span>
            </span>
          ) : null}
          {sub ? <span className="hidden lg:inline min-w-0 truncate text-[#6B21A8]/80">{sub}</span> : null}
        </p>
        {ctaLabel && ctaHref && phase ? (
          <Link
            href={ctaHref}
            className="shrink-0 inline-flex items-center h-9 px-3 sm:px-4 rounded-full bg-[#8B5CF6] text-white text-[12px] sm:text-[13px] font-semibold hover:bg-[#7C3AED] transition-colors"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
