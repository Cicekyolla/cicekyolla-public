/** @type {import('next').NextConfig} */

// Yüklenen ürün/kategori görselleri backend'de /uploads altında (Render kalıcı disk)
// servis edilir ve DB'ye RELATIVE yol olarak ("/uploads/...") yazılır. Storefront
// farklı origin'de (Vercel) çalıştığı için <img src="/uploads/..."> Vercel'e gider
// ve 404 olur. Aşağıdaki rewrite bu istekleri backend origin'ine proxy'ler; böylece
// hem MEVCUT hem GELECEK yüklenen görseller tek noktadan, component'e dokunmadan açılır.
// Tam https:// URL taşıyan seed görseller /uploads'a düşmediği için etkilenmez.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
