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
};

module.exports = nextConfig;
