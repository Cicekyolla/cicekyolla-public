/**
 * §5 URGENCY STRIP — ZIP Homepage.tsx birebir.
 * Tam genişlik gradient aciliyet bandı: aynı gün teslimat + "Hemen Sipariş Ver".
 * Server component (hook/motion yok) → daha performanslı.
 * Adaptasyon: react-router <Link><button> → next/link <Link> (buton stili) — geçerli HTML, görsel birebir.
 */

import Link from "next/link";
import { Zap } from "lucide-react";

export function UrgencyStrip() {
  return (
    <div
      className="py-5 px-6"
      style={{ background: "linear-gradient(90deg, #1E0A4A 0%, #4C1D95 40%, #6D28D9 70%, #1E0A4A 100%)" }}
    >
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-white">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Zap className="w-4.5 h-4.5 text-[#C084FC]" />
          </div>
          <div>
            <p className="font-semibold text-base">Bugün Saat 14:00&apos;a Kadar — Aynı Gün Teslimat</p>
            <p className="text-white/50 text-xs mt-0.5">Ücretsiz kargo · Taptaze garantisi · Zarif ambalaj</p>
          </div>
        </div>
        <Link
          href="/kategori/buketler"
          className="px-8 py-3 rounded-full text-white text-sm font-semibold flex-shrink-0 transition-all inline-flex items-center"
          style={{ border: "1.5px solid rgba(192,132,252,0.45)", background: "rgba(139,92,246,0.2)" }}
        >
          Hemen Sipariş Ver →
        </Link>
      </div>
    </div>
  );
}
