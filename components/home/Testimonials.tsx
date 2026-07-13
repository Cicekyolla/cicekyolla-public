"use client";

/**
 * §10 DEĞERLENDİRMELER — YALNIZ gerçek, onaylı Reviews API verisinden.
 * Örnek müşteri isimleri/yorumları ve sabit örnek istatistikler
 * KALDIRILDI. Veri /api/reviews (public onaylı yorumlar) üzerinden gelir.
 * Onaylı yorum yoksa veya API hata verirse bölüm güvenli biçimde GİZLENİR (null).
 * Genel puan UYDURULMAZ — yalnız gelen gerçek puanların ortalamasıdır.
 */

import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

interface Review { author?: string; rating?: number; title?: string; body?: string }

export function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/reviews", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const list: Review[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        // Yalnız metni olan gerçek yorumlar
        const real = list.filter((r) => (r.body ?? "").trim().length > 0);
        if (alive) setReviews(real);
      } catch {
        if (alive) setReviews([]);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Gerçek onaylı yorum yoksa bölümü gizle (sahte veri gösterme).
  if (!loaded || reviews.length === 0) return null;

  const rated = reviews.filter((r) => typeof r.rating === "number");
  const avg = rated.length
    ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length)
    : null;

  return (
    <section className="py-24" style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-14 gap-8">
          <div>
            <SectionLabel>Değerlendirmeler</SectionLabel>
            <SectionTitle>Müşterilerimiz<br />Ne Diyor?</SectionTitle>
          </div>
          {avg !== null && (
            <div
              className="flex items-center gap-5 rounded-2xl px-7 py-5"
              style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(139,92,246,0.08)", border: "1px solid rgba(255,255,255,0.8)" }}
            >
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", lineHeight: 1 }} className="font-semibold text-[#111827]">
                  {avg.toFixed(1)}
                </p>
                <div className="flex gap-0.5 mt-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(avg) ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#E5E7EB]"}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#6B7280] max-w-[120px]">{reviews.length} onaylı değerlendirme</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((r, idx) => (
            <div key={idx} className="rounded-2xl p-7 bg-white" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.05), 0 0 0 1px rgba(139,92,246,0.06)" }}>
              <Quote className="w-6 h-6 text-[#C4B5FD] mb-4" />
              {typeof r.rating === "number" && (
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < (r.rating ?? 0) ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#E5E7EB]"}`} />
                  ))}
                </div>
              )}
              {r.title && <p className="font-semibold text-[#111827] mb-1.5">{r.title}</p>}
              <p className="text-[#4B5563] text-sm leading-relaxed mb-4">{r.body}</p>
              {r.author && <p className="text-xs font-semibold text-[#6B7280]">{r.author}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
