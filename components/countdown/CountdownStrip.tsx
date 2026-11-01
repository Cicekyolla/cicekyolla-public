// ============================================================================
// ÖZEL GÜN GERİ SAYIM ŞERİDİ — sunucu sarmalayıcısı (1 Kas 2026, ADDITIVE)
// Panelden yönetilir (Admin → SEO Merkezi → Geri Sayım; db/123). Bu yola eşleşen açık öğe yoksa
// HİÇBİR ŞEY çizmez (DOM aynen). Eşleşirse sabit yükseklikli kutu SSR'da yer ayırır (CLS 0);
// sayaç metni yalnız istemcide yazılır (CountdownBar) — H1/H2 değildir, SEO metnine girmez.
// ============================================================================
import { fetchCountdowns } from "@/lib/api";
import { pickCountdown } from "@/lib/countdown";
import { CountdownBar } from "./CountdownBar";

export async function CountdownStrip({ path }: { path: string }) {
  const item = pickCountdown(await fetchCountdowns(), path);
  if (!item) return null;
  return (
    <CountdownBar
      label={item.label}
      targetDate={item.target_date}
      subText={item.sub_text}
      dayText={item.day_text}
      ctaLabel={item.cta_label}
      ctaHref={item.cta_href}
    />
  );
}
