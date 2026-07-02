/**
 * Bölüm başlık kiti — ZIP Homepage.tsx birebir (SectionLabel + SectionTitle).
 * Presentational (hook yok) → hem server hem client bölümlerde kullanılabilir. Reusable.
 */

import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-4"
      style={{ letterSpacing: "0.28em" }}
    >
      {children}
    </p>
  );
}

export function SectionTitle({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <h2
      style={{ fontFamily: "var(--font-display)", lineHeight: 1.06, letterSpacing: "-0.01em" }}
      className={`text-4xl lg:text-[52px] font-semibold ${light ? "text-white" : "text-[#111827]"}`}
    >
      {children}
    </h2>
  );
}
