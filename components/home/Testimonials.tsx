"use client";

/**
 * Ana sayfa Google değerlendirmeleri.
 * Veri yalnız /api/reviews üzerinden Google Place Details (New) kaynağından gelir.
 * Sahte isim, yorum, tarih, puan veya fallback içerik yoktur.
 * Google hata verirse bölüm güvenli biçimde gizlenir.
 */

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Quote, Star } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
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

function GoogleMark({ size = 15 }: { size?: number }) {
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
              : "fill-[#ECE8F1] text-[#ECE8F1]"
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
    loop: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const syncCarousel = useCallback(
    (api: NonNullable<typeof emblaApi>) => {
      setSelectedIndex(api.selectedScrollSnap());
      setScrollSnaps(api.scrollSnapList());
    },
    []
  );

  useEffect(() => {
    if (!emblaApi) return;
    syncCarousel(emblaApi);
    emblaApi.on("select", syncCarousel).on("reInit", syncCarousel);
    return () => {
      emblaApi.off("select", syncCarousel).off("reInit", syncCarousel);
    };
  }, [emblaApi, syncCarousel]);

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

  // Gerçek yorumlar puana göre azalır: 5 → 4 → 3 → 2 → 1.
  // Eşit puanlı yorumlar Google'ın verdiği kendi sırasını korur.
  const orderedReviews = [...reviews].sort(
    (a, b) => (b.rating ?? -1) - (a.rating ?? -1)
  );

  return (
    <section
      className="relative overflow-hidden py-20 lg:py-24"
      style={{
        background:
          "radial-gradient(circle at 84% 8%, rgba(139,92,246,0.08), transparent 30%), linear-gradient(180deg, #FCFBFC 0%, #F5F2FB 100%)",
      }}
      aria-labelledby="google-reviews-title"
    >
      <div className="pointer-events-none absolute -left-28 top-24 h-80 w-80 rounded-full bg-[#EEE8F8]/60 blur-3xl" />

      <div className="relative mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-11">
        <div className="mb-12 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end lg:mb-14">
          <div>
            <SectionLabel>Google Değerlendirmeleri</SectionLabel>
            <SectionTitle>
              <span id="google-reviews-title">
                Müşterilerimiz
                <br />
                Ne Diyor?
              </span>
            </SectionTitle>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#7C7387]">
              Gerçek deneyimler, özenli hizmet anlayışımızın en değerli
              yansıması.
            </p>
          </div>

          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-full rounded-[22px] border border-[#E8E2ED] bg-white/90 px-6 py-5 shadow-[0_18px_55px_rgba(44,32,68,0.09)] backdrop-blur-xl transition-transform hover:-translate-y-0.5 sm:w-auto sm:px-7"
            aria-label={`Çiçek Yolla Google değerlendirmelerini aç: ${displayRating} puan, ${place.userRatingCount} değerlendirme`}
          >
            <div className="flex items-center justify-center gap-5 sm:gap-6">
              <div>
                <p
                  className="font-semibold leading-none text-[#15111E]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "3rem",
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
                <p className="mt-1 text-sm text-[#958C9F]">
                  {place.userRatingCount.toLocaleString("tr-TR")} değerlendirme
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#8A8194]">
                  <GoogleMark />
                  Google Reviews
                </span>
              </div>
            </div>
          </a>
        </div>

        <div className="relative">
          <div
            ref={emblaRef}
            className="overflow-hidden"
            style={{ cursor: "grab" }}
          >
            <div className="flex gap-5 lg:gap-6">
              {orderedReviews.map((review, index) => (
                <article
                  key={`${review.author}-${review.publishTime ?? index}`}
                  className="flex h-[370px] min-w-0 select-none flex-[0_0_86%] flex-col rounded-[24px] border border-[#EAE5EF] bg-white/95 p-6 shadow-[0_14px_42px_rgba(49,37,72,0.07)] sm:flex-[0_0_calc((100%-1.25rem)/2)] sm:p-7 lg:flex-[0_0_calc((100%-3rem)/3)] xl:flex-[0_0_calc((100%-4.5rem)/4)] 2xl:flex-[0_0_calc((100%-6rem)/5)]"
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
                            className="block truncate font-semibold text-[#211B2D] transition-colors hover:text-[#7C3AED]"
                            href={review.authorUri}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {review.author}
                          </a>
                        ) : (
                          <p className="truncate font-semibold text-[#211B2D]">
                            {review.author}
                          </p>
                        )}
                        {review.relativeTime && (
                          <time
                            dateTime={review.publishTime ?? undefined}
                            className="mt-0.5 block text-xs text-[#A096AA]"
                          >
                            {review.relativeTime}
                          </time>
                        )}
                      </div>
                    </div>
                    <Quote
                      className="h-7 w-7 shrink-0 text-[#DED5F1]"
                      aria-hidden="true"
                    />
                  </header>

                  {typeof review.rating === "number" && (
                    <div className="mt-5">
                      <RatingStars rating={review.rating} />
                    </div>
                  )}

                  <p className="mt-5 line-clamp-7 text-sm leading-7 text-[#665E70]">
                    {review.body}
                  </p>

                  <footer className="mt-auto flex items-center justify-between border-t border-[#F0ECF4] pt-5">
                    <time
                      dateTime={review.publishTime ?? undefined}
                      className="text-xs font-medium text-[#A890D0]"
                    >
                      {review.relativeTime ?? "Google değerlendirmesi"}
                    </time>
                    <a
                      href={review.authorUri ?? place.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8F8799] transition-colors hover:text-[#7C3AED]"
                      aria-label={`${review.author} tarafından yazılan Google yorumunu aç`}
                    >
                      <GoogleMark size={14} />
                      Google
                    </a>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </div>

        {scrollSnaps.length > 1 && (
          <div
            className="mt-10 flex items-center justify-center gap-2.5"
            aria-label="Yorum sayfaları"
          >
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === selectedIndex
                    ? "w-10 bg-[#8B5CF6]"
                    : "w-2 bg-[#DCD2F5] hover:bg-[#C4B5FD]"
                }`}
                aria-label={`${index + 1}. yorum sayfasına git`}
                aria-current={index === selectedIndex ? "true" : undefined}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
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
