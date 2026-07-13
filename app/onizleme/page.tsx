// ============================================================================
// /onizleme — Admin içi "gerçek site önizleme" hedefi (public ile AYNI renderer).
// GÜVENLİK: yalnız kısa ömürlü, imzalı GRANT ile taslak okunur (kalıcı token YOK).
// noindex/nofollow/noarchive (metadata + middleware). Sipariş/ödeme/stok/analitik
// TETİKLEMEZ (yalnız render).
// ============================================================================
import type { Metadata } from "next";
import { getPreviewHomepage } from "@/lib/homepage";
import { getHomepageContext } from "@/lib/homepageContext";
import { HomepageRenderer } from "@/components/home/HomepageRenderer";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function OnizlemePage({ searchParams }: { searchParams: Promise<{ grant?: string }> }) {
  const sp = await searchParams;
  const grant = sp.grant ?? "";
  if (!grant) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Önizleme için geçerli grant gerekli.</div>;
  }
  const dto = await getPreviewHomepage(grant);
  if (!dto) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Önizleme bulunamadı, süresi geçmiş veya yetkisiz (grant geçersiz).</div>;
  }
  const ctx = await getHomepageContext();
  return (
    <div>
      <div style={{ background: "#7C3AED", color: "#fff", padding: "6px 14px", fontSize: 12, fontFamily: "sans-serif" }}>
        ÖNİZLEME · Taslak v{dto.version_no} · yayın DEĞİL · noindex
      </div>
      <HomepageRenderer dto={dto} ctx={ctx} />
    </div>
  );
}
