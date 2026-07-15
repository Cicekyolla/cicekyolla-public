import { NextResponse } from "next/server";

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_HANDLE =
  process.env.INSTAGRAM_HANDLE?.trim().replace(/^@/, "") ?? "cicekyolla";
const INSTAGRAM_GRAPH_ENDPOINT =
  process.env.INSTAGRAM_GRAPH_ENDPOINT ??
  "https://graph.instagram.com/me/media";

const INSTAGRAM_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "permalink",
  "thumbnail_url",
  "timestamp",
].join(",");

interface InstagramGraphMedia {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
}

interface InstagramGraphResponse {
  data?: InstagramGraphMedia[];
  error?: { message?: string; type?: string; code?: number };
}

export const revalidate = 3600;

function isAllowedGraphEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "graph.instagram.com" ||
        url.hostname === "graph.facebook.com")
    );
  } catch {
    return false;
  }
}

function isHttps(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resmî Meta Graph API üzerinden gerçek Instagram gönderilerini normalize eder.
 * Token yalnız sunucuda kalır. Entegrasyon yoksa sahte/örnek veri üretmez.
 */
export async function GET() {
  if (!INSTAGRAM_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "instagram_not_configured" },
      { status: 503 }
    );
  }

  if (!isAllowedGraphEndpoint(INSTAGRAM_GRAPH_ENDPOINT)) {
    return NextResponse.json(
      { error: "instagram_endpoint_invalid" },
      { status: 500 }
    );
  }

  try {
    const url = new URL(INSTAGRAM_GRAPH_ENDPOINT);
    url.searchParams.set("fields", INSTAGRAM_FIELDS);
    url.searchParams.set("limit", "12");

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error("[instagram] Graph API failed", res.status);
      return NextResponse.json(
        { error: "instagram_unavailable" },
        { status: 502 }
      );
    }

    const payload = (await res.json()) as InstagramGraphResponse;
    const posts = (Array.isArray(payload.data) ? payload.data : [])
      .map((item) => {
        const image =
          item.media_type === "VIDEO"
            ? item.thumbnail_url
            : item.media_url ?? item.thumbnail_url;

        if (
          !item.id ||
          !isHttps(image) ||
          !isHttps(item.permalink)
        ) {
          return null;
        }

        return {
          id: item.id,
          image,
          permalink: item.permalink,
          caption:
            typeof item.caption === "string"
              ? item.caption.trim().slice(0, 500)
              : null,
          mediaType: item.media_type ?? "IMAGE",
          timestamp: item.timestamp ?? null,
        };
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);

    if (posts.length === 0) {
      return NextResponse.json(
        { error: "instagram_empty" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        source: "instagram_graph",
        handle: INSTAGRAM_HANDLE,
        profileUrl: `https://www.instagram.com/${INSTAGRAM_HANDLE}/`,
        posts,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("[instagram] unexpected error", error);
    return NextResponse.json(
      { error: "instagram_unavailable" },
      { status: 502 }
    );
  }
}
