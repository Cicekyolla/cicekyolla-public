/** @type {import('next').NextConfig} */

// Yüklenen görseller backend origin'i (Render) üzerinden /uploads altında da
// servis edilebilir; farklı origin (Vercel) olduğundan relative "/uploads/..."
// istekleri proxy'lenir. (Legacy uploads yolu için korunur.)
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

// Cloudflare R2 public "dev" URL'i (pub-*.r2.dev) Türkiye ağlarında bağlantı
// reset'i (ERR_CONNECTION_RESET) aldığı için, medya same-origin /r2/... yoluna
// çevrilip (lib/media.ts) buradan Vercel edge üzerinden R2'ye proxy'lenir.
// TR müşterisi yalnız Vercel'e bağlanır, r2.dev'e hiç gitmez → görsel/video açılır.
// Not: R2 bucket'a özel domain bağlanınca (cdn.cicekyolla.com.tr) bu proxy kaldırılabilir.
const R2_PUBLIC_BASE =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE ??
  "https://pub-34f640508a014b148011844b087a4e48.r2.dev";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
      {
        source: "/r2/:path*",
        destination: `${R2_PUBLIC_BASE}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // Yükleme adları zaman damgalı ve değişmezdir. Vercel edge ile tarayıcı
        // bir kez alınan medyayı kalıcı saklar; R2 geçici olarak yavaşlasa bile
        // galeride daha önce yüklenen görseller kesintisiz gösterilir.
        source: "/r2/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "CDN-Cache-Control", value: "public, s-maxage=31536000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
