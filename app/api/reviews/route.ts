import { NextResponse } from "next/server";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

// Kullanıcının doğruladığı Çiçek Yolla Google işletme kaydı.
// Place ID gizli değildir; API anahtarı yalnız ortam değişkeninden okunur.
const GOOGLE_PLACE_ID =
  process.env.GOOGLE_PLACE_ID ?? "ChIJt-IisKbGyhQRABzV6TIKFhY";
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_REFERRER =
  process.env.GOOGLE_MAPS_REFERRER ??
  "https://cicekyolla-public.vercel.app/";

const GOOGLE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "reviews",
].join(",");

interface GoogleLocalizedText {
  text?: string;
}

interface GoogleAuthorAttribution {
  displayName?: string;
  uri?: string;
}

interface GoogleReview {
  rating?: number;
  text?: GoogleLocalizedText;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: GoogleAuthorAttribution;
}

interface GooglePlace {
  id?: string;
  displayName?: GoogleLocalizedText;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GoogleReview[];
}

export const revalidate = 3600;

/**
 * Ana sayfa için gerçek Google işletme değerlendirmeleri.
 * - Google Place Details (New) verisini olduğu gibi kullanır.
 * - Puan/toplam sayı Google'ın işletme toplamıdır; gösterilen kartların ortalaması değildir.
 * - Yorum metni ve puanı değiştirilmez; arayüz 5 yıldızlıları önce gösterir.
 * - API yoksa sahte fallback üretmez.
 */
export async function GET() {
  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "google_reviews_not_configured" },
      { status: 503 }
    );
  }

  try {
    const url =
      `https://places.googleapis.com/v1/places/${encodeURIComponent(
        GOOGLE_PLACE_ID
      )}?languageCode=tr`;

    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": GOOGLE_FIELDS,
        Referer: GOOGLE_MAPS_REFERRER,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error("[google-reviews] Place Details failed", res.status);
      return NextResponse.json(
        { error: "google_reviews_unavailable" },
        { status: 502 }
      );
    }

    const place = (await res.json()) as GooglePlace;
    const reviews = (Array.isArray(place.reviews) ? place.reviews : [])
      .filter(
        (review) =>
          typeof review.text?.text === "string" &&
          review.text.text.trim().length > 0
      )
      .map((review) => ({
        author: review.authorAttribution?.displayName ?? "Google kullanıcısı",
        authorUri: review.authorAttribution?.uri ?? place.googleMapsUri ?? null,
        rating:
          typeof review.rating === "number"
            ? Math.max(0, Math.min(5, review.rating))
            : null,
        body: review.text?.text?.trim() ?? "",
        relativeTime: review.relativePublishTimeDescription ?? null,
        publishTime: review.publishTime ?? null,
      }));

    if (
      typeof place.rating !== "number" ||
      typeof place.userRatingCount !== "number" ||
      !place.googleMapsUri
    ) {
      return NextResponse.json(
        { error: "google_reviews_incomplete" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        source: "google",
        place: {
          id: place.id ?? GOOGLE_PLACE_ID,
          name: place.displayName?.text ?? "Çiçek Yolla",
          address: place.formattedAddress ?? null,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          googleMapsUri: place.googleMapsUri,
        },
        reviews,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("[google-reviews] unexpected error", error);
    return NextResponse.json(
      { error: "google_reviews_unavailable" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_ORIGIN}/api/public/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
