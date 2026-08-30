"use client";

// TEKNİK ADAPTASYON (30.08.2026) — Figma Version 23 FINAL MASTER.
// GEOMETRİ KİLİTLİ: viewBox, halka yarıçapları/kalınlıkları, textPath arkları,
// kalp path'i, font boyutları ve letter-spacing değerleri Figma kaynağından
// BİREBİR alınmıştır; hiçbiri yeniden yorumlanmadı.
//
// Yapılan tek değişiklik cicekyolla-public mimarisine uyum içindir:
//   1. "use client" — useId bir React hook'u; Server Component'te çalışmaz.
//      Ürün listelerinde aynı sayfada onlarca mühür render edilir, her birinin
//      textPath id'si benzersiz olmalı → useId zorunlu → client bileşeni.
//   2. Named export eklendi (proje genelindeki import biçimi); default export korundu.
//   3. DM Sans, globals.css'teki mevcut Google Fonts @import satırına eklendi —
//      yeni istek/dependency yok. Font yüklenmezse tarayıcı sans-serif'e düşer.

import { useId } from "react";

/**
 * ÇiçekYolla — %100 ÇİÇEKYOLLA GARANTİSİ
 *
 * Premium brand seal. Full 360° double-ring geometry.
 * No gap · No leaf · No asymmetry · Transparent background.
 *
 * Ring system (viewBox 200×200, centre 100 100):
 *   Outer  r=90  strokeWidth=5    — strong brand boundary
 *   Inner  r=79  strokeWidth=1.5  — premium refinement ring
 *   Gap between inner edges ≈ 7.75u (clean breathing space)
 *
 * Text arcs at r=65, just inside the inner ring.
 * Typography: %100 subordinate · ÇİÇEKYOLLA dominant.
 *
 * Heart: symmetric 4-segment cubic bezier.
 *   Width ≈ 72u · Height ≈ 67u · Centre y ≈ 96
 *   strokeWidth=5 matches outer ring visual weight.
 */
type Props = {
  size?: number;
  /** Badge colour — pass "#ffffff" for reversed (white on teal) */
  color?: string;
  /** Override heart path data for variant testing. Omit to use default. */
  heartPath?: string;
  className?: string;
};

export function FlowerGuaranteeBadge({
  size = 120,
  color = "#0BADA6",
  heartPath,
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const topId = `cy-top-${uid}`;
  const botId = `cy-bot-${uid}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="%100 ÇiçekYolla Garantisi"
      className={className}
    >
      <defs>
        {/* CW top semicircle at r=65 — glyphs ascend outward, right-side-up ✓ */}
        <path id={topId} d="M 35 100 A 65 65 0 0 1 165 100" />
        {/* CCW bottom semicircle at r=65 — glyphs ascend toward centre, right-side-up ✓ */}
        <path id={botId} d="M 35 100 A 65 65 0 0 0 165 100" />
      </defs>

      {/* ── Outer ring: full 360°, strong ───────────────────── */}
      <circle cx="100" cy="100" r="90" stroke={color} strokeWidth="5" />

      {/* ── Inner ring: full 360°, refined detail ───────────── */}
      <circle cx="100" cy="100" r="79" stroke={color} strokeWidth="1.5" />

      {/*
        ── Top arc: %100 ÇİÇEKYOLLA ────────────────────────────
        Spacing tuned for "tok/kompakt" feel matching Callia density.
        Letter-spacing increase: arc coverage ~106° → ~130° (+24°).
        %100 subordinate · ÇİÇEKYOLLA dominant.
      */}
      <text fill={color}>
        <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
          <tspan fontFamily="'DM Sans', sans-serif" fontSize="11" fontWeight="600" letterSpacing="1.5">%100 </tspan><tspan fontFamily="'DM Sans', sans-serif" fontSize="15" fontWeight="800" letterSpacing="1.2">ÇİÇEKYOLLA</tspan>
        </textPath>
      </text>

      {/*
        ── Heart ────────────────────────────────────────────────
        4 cubic bezier segments, 2 per side. Symmetric about x=100.

        V16 failure diagnosis: shoulder x=70 but lobe x=81 (11u gap)
        created small-bumps-on-wide-body → shield/vase silhouette.

        Fix: shoulder outer x = lobe outer x = 68.
        The outer edge rises VERTICALLY from shoulder to lobe top
        (CP1 same-x as shoulder endpoint), then sweeps inward to cleft.
        This matches Callia's straight-sided lobe character.

        V18 → V19 — bottom-only optical refinement:
          Near-tip CP x:  84/116 → 87/113  (3u toward centre)
          Tip y:          127    → 129      (2u lower)
          Near-tip CP y:  119    → 120      (1u up)
          Everything above the shoulder: UNCHANGED.

        Why: pulling near-tip CPs from x=84 toward x=87 (more centred)
        makes the final approach to the tip more diagonal (35° vs 27°),
        eliminating the rounded-closure sweep.
        Lower tip by 2u sharpens the V without elongating the body.

        Key points (V19):
          Shoulder / lobe outer  (70, 94) / (130, 94)   ← unchanged
          Cleft                  (100, 74)               ← unchanged
          Lobe top CP            (83, 65) / (117, 65)   ← unchanged
          Near-tip CP            (87, 120) / (113, 120)
          Tip                    (100, 129)

        Width: x 70–130 = 60u · Height: y 65–129 = 64u
        Ratio: 60/64 = 0.9375
        Tip tangent: symmetric ±35° → clean V (was ±27°)
        strokeWidth=4.5
      */}
      <path
        d={heartPath ?? "M 100 129 C 87 120 70 108 70 94 C 70 79 83 65 100 74 C 117 65 130 79 130 94 C 130 108 113 120 100 129 Z"}
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/*
        ── Bottom arc: GARANTİSİ ─────────────────────────────────
        Arc coverage: ~81° → ~98° (+17°) via letter-spacing increase.
        Slightly larger font for stronger bottom-arc presence.
      */}
      <text
        fontFamily="'DM Sans', sans-serif"
        fontWeight="700"
        fontSize="14"
        fill={color}
        letterSpacing="3.0"
      >
        <textPath href={`#${botId}`} startOffset="50%" textAnchor="middle">
          GARANTİSİ
        </textPath>
      </text>
    </svg>
  );
}

export default FlowerGuaranteeBadge;
