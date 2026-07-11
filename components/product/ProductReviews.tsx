"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, ShieldCheck, Check, MessageSquare } from "lucide-react";

interface Review {
  id: number; author_name: string; rating: number;
  rating_product: number | null; rating_preparation: number | null; rating_delivery: number | null;
  title: string | null; body: string | null; is_verified_purchase: boolean; created_at: string;
  company_reply: string | null; company_reply_at: string | null;
}
interface Aspects { product: number | null; preparation: number | null; delivery: number | null }

function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} className={i <= n ? "fill-[#F59E0B] text-[#F59E0B]" : "fill-none text-[#D1D5DB]"} />
      ))}
    </span>
  );
}

// Yıldız seçici (form için)
function StarPicker({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[13px] font-medium text-[#4B5563]">{label}</span>
      <span className="inline-flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${label} ${i} yıldız`}>
            <Star className={`w-5 h-5 transition-colors ${i <= value ? "fill-[#F59E0B] text-[#F59E0B]" : "fill-none text-[#D1D5DB] hover:text-[#F59E0B]"}`} />
          </button>
        ))}
      </span>
    </div>
  );
}

function AspectBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="w-24 text-[#6B7280]">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#F1F0F5] overflow-hidden max-w-[160px]">
        <div className="h-full bg-[#7C3AED]" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="font-semibold text-[#111827] w-7">{value.toFixed(1)}</span>
    </div>
  );
}

export function ProductReviews({ productId, productName }: { productId: number; productName: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [aspects, setAspects] = useState<Aspects>({ product: null, preparation: null, delivery: null });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ author_name: "", rating: 5, rating_product: 5, rating_preparation: 5, rating_delivery: 5, title: "", body: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/product/${productId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({ data: [] }));
      setReviews(Array.isArray(json.data) ? json.data : []);
      if (json.aspects) setAspects(json.aspects);
    } catch { setReviews([]); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  const submit = async () => {
    setError(null);
    if (!form.author_name.trim()) { setError("Lütfen adınızı girin."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId, author_name: form.author_name.trim(), rating: form.rating,
          rating_product: form.rating_product, rating_preparation: form.rating_preparation, rating_delivery: form.rating_delivery,
          title: form.title.trim() || null, body: form.body.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || "Yorum gönderilemedi. Lütfen tekrar deneyin.");
      }
      setSent(true); setOpen(false);
      setForm({ author_name: "", rating: 5, rating_product: 5, rating_preparation: 5, rating_delivery: 5, title: "", body: "" });
    } catch (e) { setError(e instanceof Error ? e.message : "Yorum gönderilemedi. Lütfen tekrar deneyin."); }
    finally { setSubmitting(false); }
  };

  return (
    <section aria-label="Ürün yorumları" className="max-w-[1440px] mx-auto px-5 md:px-8 pb-20">
      <div className="border-t border-black/[0.06] pt-14">
        <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-3">Değerlendirmeler</p>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }} className="text-2xl lg:text-3xl font-semibold text-[#111827]">
              Müşteri Yorumları
            </h2>
            {count > 0 ? (
              <>
                <div className="flex items-center gap-2.5 mt-2">
                  <Stars n={Math.round(avg)} />
                  <span className="text-[15px] font-bold text-[#111827]">{avg.toFixed(1)}</span>
                  <span className="text-[13.5px] text-[#6B7280]">· {count} değerlendirme</span>
                </div>
                <div className="mt-4 space-y-1.5">
                  <AspectBar label="Ürün kalitesi" value={aspects.product} />
                  <AspectBar label="Hazırlanış" value={aspects.preparation} />
                  <AspectBar label="Teslimat" value={aspects.delivery} />
                </div>
              </>
            ) : (
              <p className="text-[13.5px] text-[#6B7280] mt-2">İlk yorumu siz yazın.</p>
            )}
          </div>
          <button onClick={() => { setOpen((v) => !v); setSent(false); }}
            className="rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[14px] font-bold px-6 py-3 transition-colors shrink-0">
            Yorum Yaz
          </button>
        </div>

        {sent && (
          <div className="mb-8 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-[13.5px] font-medium px-5 py-4 flex items-center gap-2">
            <Check className="w-4 h-4" /> Yorumunuz alındı. Onaylandıktan sonra burada yayınlanacaktır. Teşekkürler!
          </div>
        )}

        {open && (
          <div className="mb-10 rounded-[22px] border border-[#F1F0F5] bg-white p-6 lg:p-7 shadow-[0_10px_40px_-24px_rgba(124,58,237,0.25)]">
            <h3 className="text-[17px] font-bold text-[#111827] mb-4">“{productName}” için yorumunuz</h3>
            <div className="grid sm:grid-cols-2 gap-x-8 mb-4 pb-4 border-b border-[#F1F0F5]">
              <StarPicker label="Genel puanınız" value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} />
              <StarPicker label="Ürün kalitesi" value={form.rating_product} onChange={(n) => setForm((f) => ({ ...f, rating_product: n }))} />
              <StarPicker label="Hazırlanış kalitesi" value={form.rating_preparation} onChange={(n) => setForm((f) => ({ ...f, rating_preparation: n }))} />
              <StarPicker label="Teslimat" value={form.rating_delivery} onChange={(n) => setForm((f) => ({ ...f, rating_delivery: n }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input className="px-4 py-3 rounded-2xl border border-[#E9E7F0] bg-[#FCFCFD] text-[15px] focus:outline-none focus:border-[#C4B5FD] focus:ring-4 focus:ring-[#F5F3FF]" placeholder="Adınız *" value={form.author_name} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} />
              <input className="px-4 py-3 rounded-2xl border border-[#E9E7F0] bg-[#FCFCFD] text-[15px] focus:outline-none focus:border-[#C4B5FD] focus:ring-4 focus:ring-[#F5F3FF]" placeholder="Başlık (opsiyonel)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <textarea className="w-full px-4 py-3 rounded-2xl border border-[#E9E7F0] bg-[#FCFCFD] text-[15px] min-h-[110px] resize-y focus:outline-none focus:border-[#C4B5FD] focus:ring-4 focus:ring-[#F5F3FF]" placeholder="Deneyiminizi paylaşın…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} maxLength={2000} />
            <p className="text-[11.5px] text-[#9CA3AF] mt-2">Not: Yorumlar CICEKYOLLA onayından sonra yayınlanır. Müşteri fotoğrafı kabul edilmez.</p>
            {error && <p className="text-[13px] text-[#B91C1C] mt-2">{error}</p>}
            <div className="flex items-center gap-3 mt-4">
              <button onClick={submit} disabled={submitting} className="rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[14px] font-bold px-6 py-3 transition-colors disabled:opacity-70">
                {submitting ? "Gönderiliyor…" : "Gönder"}
              </button>
              <button onClick={() => setOpen(false)} className="text-[13.5px] font-medium text-[#6B7280] hover:text-[#374151]">Vazgeç</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-[14px] text-[#9CA3AF]">Yorumlar yükleniyor…</p>
        ) : count === 0 ? (
          <p className="text-[14px] text-[#9CA3AF]">Henüz onaylı yorum yok. İlk yorumu siz bırakın.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-[18px] border border-[#F1F0F5] bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1F2937] text-[14px]">{r.author_name}</span>
                    {r.is_verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#047857]"><ShieldCheck className="w-3.5 h-3.5" /> Doğrulanmış</span>
                    )}
                  </div>
                  <Stars n={r.rating} size={13} />
                </div>
                {(r.rating_product || r.rating_preparation || r.rating_delivery) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11.5px] text-[#6B7280]">
                    {r.rating_product ? <span>Ürün: <b className="text-[#374151]">{r.rating_product}/5</b></span> : null}
                    {r.rating_preparation ? <span>Hazırlanış: <b className="text-[#374151]">{r.rating_preparation}/5</b></span> : null}
                    {r.rating_delivery ? <span>Teslimat: <b className="text-[#374151]">{r.rating_delivery}/5</b></span> : null}
                  </div>
                )}
                {r.title && <p className="font-semibold text-[#111827] text-[14px] mb-1">{r.title}</p>}
                {r.body && <p className="text-[13.5px] text-[#4B5563] leading-relaxed">{r.body}</p>}
                {r.company_reply && (
                  <div className="mt-3 rounded-xl bg-[#F5F3FF] border border-[#EDE9FE] p-3">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#6D28D9] mb-1">
                      <MessageSquare className="w-3.5 h-3.5" /> CICEKYOLLA yanıtı
                    </div>
                    <p className="text-[12.5px] text-[#4B5563] leading-relaxed">{r.company_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
