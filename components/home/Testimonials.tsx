"use client";

/**
 * Ana sayfa Google değerlendirmeleri.
 * Veri yalnız /api/reviews üzerinden Google Place Details (New) kaynağından gelir.
 * Sahte isim, yorum, tarih, puan veya fallback içerik yoktur.
 * Google hata verirse bölüm güvenli biçimde gizlenir.
 */

import { useEffect, useState } from "react";
import { ExternalLink, Quote, Star } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

interface GoogleReview {
  author: string;
  authorUri: string | null;
  rating: number | null;
  body: string;
  relativeTime: string | null;
  publishTime: string | null;
}

interface GooglePlace {
  id: string;
  name: string;
  address: string | null;
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
}

interface GoogleReviewsPayload {
  source: "google";
  place: GooglePlace;
  reviews: GoogleReview[];
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}

function RatingStars({
  rating,
  size = "small",
}: {
  rating: number;
  size?: "small" | "large";
}) {
  const iconClass = size === "large" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div
      className="flex gap-0.5"
      aria-label={`5 üzerinden ${rating} yıldız`}
    >
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={`${iconClass} ${
            index < Math.round(rating)
              ? "fill-[#F59E0B] text-[#F59E0B]"
              : "fill-[#EEEAF4] text-[#EEEAF4]"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  const [data, setData] = useState<GoogleReviewsPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/reviews", {
          headers: { Accept: "application/json" },
        });
        const json = (await res.json().catch(() => null)) as
          | GoogleReviewsPayload
          | null;

        const valid =
          res.ok &&
          json?.source === "google" &&
          typeof json.place?.rating === "number" &&
          typeof json.place?.userRatingCount === "number" &&
          typeof json.place?.googleMapsUri === "string" &&
          Array.isArray(json.reviews) &&
          json.reviews.some((review) => review.body.trim().length > 0);

        if (alive) setData(valid ? json : null);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!loaded || !data) return null;

  const { place, reviews } = data;
  const displayRating = place.rating.toLocaleString("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  // Kullanıcı tercihi: gerçek yorumları değiştirmeden 5 yıldızlıları öne al.
  // Array#sort modern tarayıcılarda stabildir; eşit puanlılar Google sırasını korur.
  const orderedReviews = [...reviews].sort(
    (a, b) => (b.rating ?? -1) - (a.rating ?? -1)
  );

  return (
    <section
      className="relative overflow-hidden py-24"
      style={{
        background:
          "radial-gradient(circle at 85% 12%, rgba(139,92,246,0.09), transparent 31%), linear-gradient(180deg, #FCFBFA 0%, #F6F3FB 100%)",
      }}
      aria-labelledby="google-reviews-title"
    >
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#EDE7F6]/55 blur-3xl" />

      <div className="relative mx-auto max-w-[1440px] px-6 lg:px-14">
        <div className="mb-14 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <SectionLabel>Google Değerlendirmeleri</SectionLabel>
            <SectionTitle>
              <span id="google-reviews-title">
                Müşterilerimiz
                <br />
                Ne Diyor?
              </span>
            </SectionTitle>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[#746C80]">
              Yorumlar Google işletme profilimizden doğrudan alınır; puan ve
              metinler değiştirilmez, 5 yıldızlı değerlendirmeler önce gösterilir.
            </p>
          </div>

          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[22px] border border-white/90 bg-white/90 px-7 py-6 shadow-[0_18px_55px_rgba(44,32,68,0.10)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
            aria-label={`Çiçek Yolla Google değerlendirmelerini aç: ${displayRating} puan, ${place.userRatingCount} değerlendirme`}
          >
            <div className="flex items-center gap-6">
              <div>
                <p
                  className="font-semibold leading-none text-[#171321]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "3.25rem",
                  }}
                >
                  {displayRating}
                </p>
                <div className="mt-2">
                  <RatingStars rating={place.rating} size="large" />
                </div>
              </div>

              <div className="h-16 w-px bg-[#E8E2EE]" />

              <div>
                <p className="font-semibold text-[#211B2D]">Google puanı</p>
                <p className="mt-1 text-sm text-[#90879C]">
                  {place.userRatingCount.toLocaleString("tr-TR")} değerlendirme
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C3AED]">
                  Google’da görüntüle
                  <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orderedReviews.slice(0, 6).map((review, index) => {
            const author = (
              <span className="font-semibold text-[#211B2D] transition-colors group-hover:text-[#7C3AED]">
                {review.author}
              </span>
            );

            return (
              <article
                key={`${review.author}-${review.publishTime ?? index}`}
                className="flex min-h-[310px] flex-col rounded-[24px] border border-white/90 bg-white/90 p-7 shadow-[0_14px_45px_rgba(49,37,72,0.07)] backdrop-blur-sm"
              >
                <header className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-[0_7px_18px_rgba(124,58,237,0.25)]"
                      style={{
                        background:
                          "linear-gradient(145deg, #A56CF5 0%, #7C3AED 100%)",
                      }}
                      aria-hidden="true"
                    >
                      {initials(review.author) || "G"}
                    </div>
                    <div className="min-w-0">
                      {review.authorUri ? (
                        <a
                          className="group block truncate"
                          href={review.authorUri}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {author}
                        </a>
                      ) : (
                        <p className="truncate">{author}</p>
                      )}
                      {review.relativeTime && (
                        <time
                          dateTime={review.publishTime ?? undefined}
                          className="mt-0.5 block text-xs text-[#9A92A5]"
                        >
                          {review.relativeTime}
                        </time>
                      )}
                    </div>
                  </div>
                  <Quote
                    className="h-7 w-7 shrink-0 text-[#DDD3F3]"
                    aria-hidden="true"
                  />
                </header>

                {typeof review.rating === "number" && (
                  <div className="mt-5">
                    <RatingStars rating={review.rating} />
                  </div>
                )}

                <p className="mt-5 line-clamp-7 text-sm leading-7 text-[#625A6D]">
                  {review.body}
                </p>

                <footer className="mt-auto flex items-center justify-between border-t border-[#F0ECF4] pt-5">
                  <span className="text-xs font-medium text-[#8E8599]">
                    Google yorumu
                  </span>
                  <a
                    href={review.authorUri ?? place.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
                  >
                    Kaynağı aç
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </footer>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#DED5EA] bg-white/80 px-5 py-3 text-sm font-semibold text-[#4B3F59] transition-colors hover:border-[#BCA8D8] hover:text-[#7C3AED]"
          >
            Tüm Google değerlendirmelerini gör
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
