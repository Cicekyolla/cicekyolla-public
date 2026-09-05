"use client";

// ============================================================================
// GLOBAL TRUST — GERÇEK Google 5★ müşteri yorumları.
// ----------------------------------------------------------------------------
// Canlı ana sayfadaki Google bölümüyle AYNI kaynak ve AYNI seçim modülünü
// (lib/googleReviews) kullanır: tek kaynak, tek gerçek.
//
// KURAL:
//  • Uydurma testimonial, demo kişi, doğrulanmamış rozet/sayı YOKTUR.
//  • Yorum metni ve yazar adı Google'dan geldiği gibi basılır; çevrilmez,
//    kısaltılmaz, "premiumlaştırılmaz".
//  • Gösterilen puan/sayı Google'ın İŞLETME toplamıdır (5★ seçiminden
//    hesaplanmaz).
//  • Google API hata verirse ya da hiç 5★ yorum yoksa bölüm render EDİLMEZ —
//    sayfa kırılmaz, sahte içerik konmaz.
//  • Bu blok MARKA sosyal kanıtıdır; ürün puanı (Product.aggregateRating)
//    ile hiçbir ilişkisi yoktur.
// ============================================================================

import { useEffect, useState } from "react";
import { selectTrustReviews } from "@/lib/googleReviews";
import type { GoogleReviewItem, GoogleReviewsPlace } from "@/lib/googleReviews";
import type { GlobalLocale } from "@/lib/global/config";

interface Secim {
  place: GoogleReviewsPlace;
  reviews: GoogleReviewItem[];
}

/** Google'ın marka "G" işareti — attribution görünürlüğü için. */
function GoogleMark({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block font-black leading-none"
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: size,
        background:
          "conic-gradient(from -35deg, #4285F4 0 26%, #34A853 26% 42%, #FBBC05 42% 66%, #EA4335 66% 82%, #4285F4 82% 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      G
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[13px] tracking-[0.12em] text-[#C4974A]" aria-label={`${rating} / 5`}>
      {"★".repeat(Math.round(rating))}
    </span>
  );
}

export function GlobalGoogleTrust({ locale }: { locale: GlobalLocale }) {
  const [data, setData] = useState<Secim | null>(null);

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
    return () => {
      alive = false;
    };
  }, []);

  // Gerçek 5★ yoksa bölüm hiç yok: sahte doldurma yapılmaz.
  if (!data) return null;

  const { place, reviews } = data;
  const puan = place.rating.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl px-4">
      <div className="rounded-[20px] border border-[#EFE9E1] bg-white/70 px-5 py-6 md:px-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#C4974A]">
            Google Reviews
          </p>
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#1A1830] hover:underline"
          >
            <GoogleMark />
            {/* Google'ın İŞLETME toplamı — seçilen kartlardan hesaplanmaz. */}
            <span>{puan}</span>
            <span className="font-normal text-[#6B6478]">
              ({place.userRatingCount.toLocaleString(locale)})
            </span>
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((review, i) => (
            <figure
              key={`${review.author}-${review.publishTime ?? i}`}
              className="flex h-full flex-col rounded-[16px] border border-[#F1ECE4] bg-white px-4 py-4"
            >
              <Stars rating={5} />
              {/* Metin Google'dan geldiği gibi — değiştirilmez. */}
              <blockquote className="mt-2.5 line-clamp-6 text-[12.5px] leading-[1.6] text-[#4A4458]">
                {review.body}
              </blockquote>
              <figcaption className="mt-auto pt-3 text-[11.5px] text-[#6B6478]">
                {review.authorUri ? (
                  <a
                    href={review.authorUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#1A1830] hover:underline"
                  >
                    {review.author}
                  </a>
                ) : (
                  <span className="font-semibold text-[#1A1830]">{review.author}</span>
                )}
                {review.relativeTime ? <span> · {review.relativeTime}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
