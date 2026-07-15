"use client";

/**
 * Figma uyumlu gerçek Instagram galerisi.
 * Kaynaklar:
 * 1) Homepage CMS instagram_gallery.config.images (gerçek, onaylı URL listesi)
 * 2) /api/instagram üzerinden resmî Meta Graph API
 * Kaynak yoksa sahte/örnek görsel üretmez; bölüm güvenli biçimde gizlenir.
 */

import { useEffect, useState } from "react";
import { Instagram, Play } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

interface InstagramPost {
  id: string;
  image: string;
  permalink: string;
  caption: string | null;
  mediaType: string;
  timestamp: string | null;
}

interface InstagramPayload {
  source: "instagram_graph";
  handle: string;
  profileUrl: string;
  posts: InstagramPost[];
}

export interface InstagramGalleryConfig {
  handle?: unknown;
  source?: unknown;
  images?: unknown;
}

function cleanHandle(value: unknown): string {
  if (typeof value !== "string") return "cicekyolla";
  const handle = value.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
  return handle || "cicekyolla";
}

function isHttps(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function manualPosts(
  config: InstagramGalleryConfig | undefined,
  profileUrl: string
): InstagramPost[] {
  if (!Array.isArray(config?.images)) return [];

  return config.images
    .filter(isHttps)
    .slice(0, 24)
    .map((image, index) => ({
      id: `manual-${index}-${image}`,
      image,
      permalink: profileUrl,
      caption: "Çiçek Yolla Instagram gönderisi",
      mediaType: "IMAGE",
      timestamp: null,
    }));
}

export function InstagramGallery({
  config,
}: {
  config?: InstagramGalleryConfig;
} = {}) {
  const configuredHandle = cleanHandle(config?.handle);
  const configuredProfileUrl = `https://www.instagram.com/${configuredHandle}/`;
  const approvedManualPosts = manualPosts(config, configuredProfileUrl);
  const manualMode =
    config?.source === "manual" || approvedManualPosts.length > 0;

  const [posts, setPosts] = useState<InstagramPost[]>(approvedManualPosts);
  const [handle, setHandle] = useState(configuredHandle);
  const [profileUrl, setProfileUrl] = useState(configuredProfileUrl);
  const [loaded, setLoaded] = useState(manualMode);
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false,
  });

  useEffect(() => {
    if (manualMode) return;

    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/instagram", {
          headers: { Accept: "application/json" },
        });
        const json = (await res.json().catch(() => null)) as
          | InstagramPayload
          | null;

        const validPosts =
          res.ok &&
          json?.source === "instagram_graph" &&
          Array.isArray(json.posts)
            ? json.posts.filter(
                (post) =>
                  typeof post.id === "string" &&
                  isHttps(post.image) &&
                  isHttps(post.permalink)
              )
            : [];

        if (alive) {
          setPosts(validPosts);
          if (json?.handle) setHandle(cleanHandle(json.handle));
          if (isHttps(json?.profileUrl)) setProfileUrl(json.profileUrl);
        }
      } catch {
        if (alive) setPosts([]);
      } finally {
        if (alive) setLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [manualMode]);

  if (!loaded || posts.length === 0) return null;

  return (
    <section
      className="border-t border-[#F0EDF3] bg-white py-20 lg:py-24"
      aria-labelledby="instagram-gallery-title"
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-11">
        <div className="mb-10 flex items-end justify-between gap-6 lg:mb-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8B5CF6]">
              Instagram
            </p>
            <h2
              id="instagram-gallery-title"
              className="mt-6 font-semibold leading-none text-[#14101C]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 3.2vw, 3rem)",
              }}
            >
              @{handle}
            </h2>
          </div>

          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-[#E4DDED] bg-white px-4 py-2.5 text-sm font-semibold text-[#7C3AED] shadow-[0_8px_24px_rgba(72,49,105,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#CBBBE0] hover:shadow-[0_12px_30px_rgba(72,49,105,0.10)] sm:px-5"
            aria-label={`Instagram'da @${handle} hesabını takip et`}
          >
            <Instagram className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>Takip Et</span>
          </a>
        </div>

        <div
          ref={emblaRef}
          className="overflow-hidden"
          style={{ cursor: "grab" }}
        >
          <div className="flex gap-4">
            {posts.map((post, index) => {
              const alt =
                post.caption?.trim().slice(0, 140) ||
                `Çiçek Yolla Instagram gönderisi ${index + 1}`;

              return (
                <a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative min-w-0 flex-[0_0_74%] overflow-hidden rounded-[18px] bg-[#F6F3F8] shadow-[0_10px_28px_rgba(43,31,62,0.07)] sm:flex-[0_0_calc((100%-2rem)/3)] md:flex-[0_0_calc((100%-3rem)/4)] lg:flex-[0_0_calc((100%-4rem)/5)] xl:flex-[0_0_calc((100%-5rem)/6)] 2xl:flex-[0_0_calc((100%-6rem)/7)]"
                  style={{ aspectRatio: "1 / 1" }}
                  aria-label={`Instagram gönderisini aç: ${alt}`}
                  draggable={false}
                >
                  <img
                    src={post.image}
                    alt={alt}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />

                  <span
                    className="absolute inset-0 bg-gradient-to-t from-[#24152F]/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white shadow-lg backdrop-blur-md">
                      {post.mediaType === "VIDEO" ? (
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                      ) : (
                        <Instagram className="h-5 w-5" />
                      )}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] font-medium tracking-[0.18em] text-[#B0A6BA] sm:hidden">
          Kaydırarak keşfedin
        </p>
      </div>
    </section>
  );
}
