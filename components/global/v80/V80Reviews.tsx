"use client";
// GLOBAL VERSION 80 — "Onlar anlattı": GERÇEK Google 5★ yorumları (mevcut
// /api/reviews + lib/googleReviews seçimi). Uydurma yorum/ad/tarih YOK; toplu
// puan özeti operatör kararıyla BASILMAZ. Yorum yoksa bölüm hiç çizilmez.
import { useEffect, useState } from "react";
import { selectTrustReviews, type GoogleReviewItem, type GoogleReviewsPlace } from "@/lib/googleReviews";
import { StarIcon } from "./V80Icons";

export function V80Reviews({ t }: { t: Record<string, string> }) {
  const [data, setData] = useState<{ place: GoogleReviewsPlace; reviews: GoogleReviewItem[] } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/reviews", { headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => null);
        const secim = res.ok ? selectTrustReviews(json) : ({ visible: false } as const);
        if (alive) setData(secim.visible ? { place: secim.place, reviews: secim.reviews } : null);
      } catch {
        if (alive) setData(null);
      }
    })();
    return () => { alive = false; };
  }, []);
  if (!data) return null;
  const reviews = data.reviews.slice(0, 3);
  return (
    <section id="reviews" className="v80-section" style={{ background: "var(--v80-bg2)", borderTop: "1px solid #E0DBD4" }}>
      <div className="v80-wrap">
        <div data-v80-reveal className="on" style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="v80-eyebrow" style={{ letterSpacing: "0.2em" }}>{t["reviews.eyebrow"]}</p>
            <h2 className="v80-h2">{t["reviews.title"]}</h2>
          </div>
          <a href={data.place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="v80-link-caps" style={{ marginBottom: 4 }}>{t["reviews.source"]} ↗</a>
        </div>
        <div className="v80-reviews-grid">
          {reviews.map((r, i) => (
            <div key={`${r.author}-${i}`} style={{ background: "var(--v80-bg)", borderRadius: "var(--v80-radius-sm)", padding: "24px 24px 20px", border: "1px solid #E0DBD4", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 14 }} aria-label={`${r.rating} / 5`}>{[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} />)}</div>
              <p className="v80-serif" style={{ fontStyle: "italic", fontWeight: 200, fontSize: "0.9375rem", lineHeight: 1.65, letterSpacing: "-0.01em", color: "var(--v80-ink)", marginBottom: 18, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>“{r.body}”</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #E0DBD4", paddingTop: 14, marginTop: "auto", gap: 8 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--v80-ink)" }}>{r.author}</p>
                {r.relativeTime ? <p style={{ fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", letterSpacing: "0.06em" }}>{r.relativeTime}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
