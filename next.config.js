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
      {
        // ŞİFRE BELİRLEME — tek kullanımlık hesap devralma anahtarı taşır
        // (DESIGN §3.A.9). Bu sayfa:
        //   • hiçbir yere Referer SIZDIRMAZ ("?token=" biçimi hâlâ canlıyken
        //     bağlantıya tıklanan her dış kaynak token'ı görebilirdi),
        //   • ne tarayıcıda ne kenarda ÖNBELLEĞE alınmaz (ortak bilgisayarda
        //     geri tuşuyla forma dönülememesi için),
        //   • arama motoruna kapalıdır (page.tsx metadata.robots ek olarak).
        source: "/sifre-belirle",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        // E-POSTA TERCİHLERİ — kampanya postasındaki "Abonelikten çık"
        // bağlantısı kişiye özel bir jeton taşır (DESIGN §3.G.2): Referer'a
        // sızmaz, önbelleğe alınmaz, arama motoruna kapalıdır.
        source: "/e-posta-tercihleri",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },

  // ═══════════════════════════════════════════════════════════════
  // ESKİ URL'LERDEN YENİ URL'LERE 301 REDIRECT
  // Konum URL'leri gerçek 81 il / 973 ilçe lookup'ıyla middleware'de çözülür.
  // ═══════════════════════════════════════════════════════════════
  async redirects() {
    return [
      // ÜRÜN: /52604-Renkli-Lavantali.html → /urun/renkli-lavantali
      // Burada KALIR: middleware matcher noktalı yolları (.*\..*) dışladığı için
      // ".html" adresleri middleware'e hiç ulaşmaz.
      { source: '/:id(\\d+)-:slug(.+)\\.html', destination: '/urun/:slug', permanent: true },

      // EK (10 Eyl 2026): /urunler hiç var olmayan bir rota — ana sayfa CTA'sı ve
      // Google'da indeksli eski URL 404'e düşüyordu (GSC 90g: 116 gösterim / 6 tık).
      // Hedef: kodun güvenli katalog hedefi CATEGORY_FALLBACK ile aynı sayfa.
      // Statik kural burada güvenli: /urunler için yönetilen (DB) 301 kaydı yok,
      // dolayısıyla operatör onaylı bir yönlendirmeyi gölgelemez.
      { source: '/urunler', destination: '/kategori/cicekler', permanent: true },

      // ÖZEL GÜN "-cicekleri" kuralları buradan KALDIRILDI → middleware.ts.
      // Sebep: next.config redirect'leri middleware'den ÖNCE çalışır ve statiktir;
      // canlı yönetilen yönlendirme haritasına bakamadıkları için operatör onaylı
      // 301'leri gölgeliyorlardı (/masa-cicekleri → 308 /kategori/masa → 404).
      // Hedef hesabı değişmedi: lib/legacy-recovery.ts::resolveCicekleriLegacy.
    ];
  },
};

module.exports = nextConfig;
