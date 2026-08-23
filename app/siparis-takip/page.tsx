"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n, Num } from "@/lib/i18n";

const STATUS_TR: Record<string, string> = {
  new: "Yeni", confirmed: "Onaylandı", preparing: "Hazırlanıyor", designing: "Tasarımda",
  ready: "Hazır", courier: "Kuryede", delivering: "Yolda", delivered: "Teslim Edildi", cancelled: "İptal",
};

export default function SiparisTakipPage() {
  const { t, locale, intl } = useI18n();
  // Backend enum ÇEVRİLMEZ; yalnız gösterim etiketi locale'e göre seçilir (TR: mevcut STATUS_TR).
  const statusLabel = (st: string) => {
    if (locale === "tr") return STATUS_TR[st] ?? st;
    const map: Record<string, string> = { new: t("track.st.pending"), pending: t("track.st.pending"), confirmed: t("track.st.confirmed"), preparing: t("track.st.preparing"), designing: t("track.st.designing"), ready: t("track.st.ready"), courier: t("track.st.shipped"), delivering: t("track.st.shipped"), shipped: t("track.st.shipped"), delivered: t("track.st.delivered"), cancelled: t("track.st.cancelled") };
    return map[st] ?? st;
  };
  const [no, setNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ order_number: string; status: string; delivery_date: string | null; delivery_time_slot: string | null; timeline: { new_status: string; note: string | null; created_at: string }[] } | null>(null);

  const track = useCallback(async (requested?: string) => {
    const orderNumber = (requested ?? no).trim();
    if (!orderNumber) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(orderNumber)}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setResult(json.data);
    } catch { setError(t("track.notFound")); }
    finally { setLoading(false); }
  }, [no, t]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order") ?? params.get("no") ?? params.get("tracking");
    if (order) {
      setNo(order);
      void track(order);
    }
    // Query yalnız ilk açılışta okunur; kullanıcı sonraki sorguları butonla yapar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[#111827] mb-2" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{t("track.title")}</h1>
        <p className="text-[#6B7280] mb-8">{t("track.desc")}</p>
        <div className="flex gap-2">
          <input value={no} onChange={(e) => setNo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && track()}
            placeholder={t("track.placeholder")} className="flex-1 px-4 py-3 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#C4B5FD]" />
          <button onClick={() => void track()} disabled={loading} className="px-6 py-3 rounded-xl bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] disabled:opacity-60">
            {loading ? "…" : t("track.button")}
          </button>
        </div>
        {error && <p className="text-[13px] text-[#B91C1C] mt-4">{error}</p>}
        {result && (
          <div className="mt-8 rounded-2xl border border-[#EDE9FE] bg-[#FAFAFF] p-6">
            <p className="text-[13px] text-[#6B7280]">{t("track.orderNo")}</p>
            <p className="text-lg font-bold text-[#7C3AED] mb-4"><Num>{result.order_number}</Num></p>
            <div className="flex justify-between py-2 border-t border-black/5"><span className="text-[#6B7280]">{t("track.status")}</span><span className="font-semibold text-[#111827]">{statusLabel(result.status)}</span></div>
            {result.delivery_date && <div className="flex justify-between py-2 border-t border-black/5"><span className="text-[#6B7280]">{t("track.delivery")}</span><Num className="font-semibold text-[#111827]">{result.delivery_date} {result.delivery_time_slot ?? ""}</Num></div>}
            {result.timeline?.length > 0 && <div className="mt-5 border-t border-black/5 pt-4"><p className="mb-3 text-[12px] font-bold uppercase tracking-[.14em] text-[#8B5CF6]">Durum zamanları</p><ol className="space-y-3">{result.timeline.map((entry, index) => <li key={`${entry.new_status}-${entry.created_at}-${index}`} className="flex items-start justify-between gap-4 text-sm"><div><strong className="text-[#111827]">{statusLabel(entry.new_status)}</strong>{entry.note && <p className="mt-1 text-[#6B7280]">{entry.note}</p>}</div><time className="shrink-0 text-right text-[12px] text-[#6B7280]">{new Date(entry.created_at).toLocaleString(intl, { dateStyle: "short", timeStyle: "short" })}</time></li>)}</ol></div>}
          </div>
        )}
      </div>
    </main>
  );
}
