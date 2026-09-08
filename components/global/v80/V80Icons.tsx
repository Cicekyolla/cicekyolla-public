// Figma Version 80 çizgi ikonları (SVG, currentColor). İkon kütüphanesi eklenmez.
import type { V80Icon } from "@/lib/global/v80/schema";

export function BrandMark({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M32 12C28 7.5 22.5 5 17 5C8.5 5 2 11.5 2 20C2 28.5 8.5 35 17 35C22.5 35 28 32.5 32 28" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <line x1="17" y1="35" x2="17" y2="43" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 45C13 45 14.8 46.5 17 46.5C19.2 46.5 21 45 21 45" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="17" cy="2.5" rx="2.5" ry="2.5" fill={color} />
      <path d="M19.5 4C21 2.5 23 2 23 2C23 2 23 4.5 21 6.5" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M14.5 4C13 2.5 11 2 11 2C11 2 11 4.5 13 6.5" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Flourish({ color = "var(--v80-border-soft)" }: { color?: string }) {
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" fill="none" style={{ display: "block", margin: "18px 0 22px", opacity: 0.7 }} aria-hidden="true">
      <path d="M2 14 C12 14 18 6 28 6 C38 6 44 14 54 14 C58 14 61 12 62 10" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" />
      <circle cx="62" cy="5" r="2" fill={color} opacity="0.6" />
      <path d="M60 3.5 C61 2 63 2 63 2 C63 2 63 4 61.5 5.2" stroke={color} strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M62 3.5 C62.5 1.8 61 1.5 61 1.5 C61 1.5 60.5 3 61.5 4" stroke={color} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 11.5C21 16.75 16.75 21 11.5 21C9.8 21 8.2 20.55 6.8 19.76L3 21L4.27 17.33C3.46 15.9 3 14.25 3 12.5C3 7.25 7.25 3 12.5 3C16.14 3 19.3 5.01 20.87 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BagIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2L3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 10C16 12.2 14.2 14 12 14C9.8 14 8 12.2 8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
      <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ size = 10, fill = "var(--v80-primary)" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function LineIcon({ name, size = 14 }: { name: V80Icon; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "lock":
      return <svg {...s} aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
    case "whatsapp":
      return <WhatsAppIcon size={size} />;
    case "clock":
      return <svg {...s} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
    case "leaf":
      return <svg {...s} aria-hidden="true"><path d="M5 19C5 10 11 5 20 4c-1 9-6 15-15 15z" /><path d="M5 19c3-4 6-7 10-9" /></svg>;
    case "truck":
      return <svg {...s} aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
    case "shield":
      return <svg {...s} aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" /></svg>;
    case "card":
      return <svg {...s} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>;
    case "map":
      return <svg {...s} aria-hidden="true"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    default:
      return <StarIcon size={size} fill="currentColor" />;
  }
}
