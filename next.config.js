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

  // ═══════════════════════════════════════════════════════════════
  // ESKİ URL'LERDEN YENİ URL'LERE 301 REDIRECT
  // ═══════════════════════════════════════════════════════════════
  async redirects() {
    return [
      // İL-İLÇE (ID'li): /adana-seyhan-cicekci-123 → /adana/seyhan
      { source: '/:il([a-z]+)-:ilce([a-z]+)-cicekci-:id(\\d+)', destination: '/:il/:ilce', permanent: true },

      // İL-İLÇE (ID'siz): /zonguldak-alapli-cicekci → /zonguldak/alapli
      { source: '/:il([a-z]+)-:ilce([a-z]+)-cicekci', destination: '/:il/:ilce', permanent: true },

      // İL-İLÇE (büyük harf): /tuncel-Mazgirt-cicekci-16 → /tuncel/mazgirt
      { source: '/:il([a-z]+)-:ilce([A-Z][a-z]+)-cicekci-:id(\\d+)', destination: '/:il/:ilce', permanent: true },

      // İL-İLÇE (yapışkan ID): /hatay-dortyol-cicekci7 → /hatay/dortyol
      { source: '/:il([a-z]+)-:ilce([a-z]+)-cicekci:id(\\d+)', destination: '/:il/:ilce', permanent: true },

      // İL MERKEZ: /erzincan-cicek-yolla-7 → /erzincan/merkez
      { source: '/:il([a-z]+)-cicek-yolla-:id(\\d+)', destination: '/:il/merkez', permanent: true },

      // İSTANBUL İLÇELERİ (ID'li): /uskudar-cicekci-43 → /istanbul/uskudar
      { source: '/:ilce(uskudar|kartal|beykoz|avcilar|taksim|levent|istinye|tarabya|cekmekoy|buyukcekmece|catalca|arnavutkoy|gaziosmanpasa|zeytinburnu|zekeriyakoy|atasehir|yesilkoy|tuzla|maltepe|kadikoy|sariyer|besiktas|bakirkoy|sisli|beyoglu|bayrampasa|basaksehir|beylikduzu|esenyurt|silivri|sile|adalar|cengelkoy|eminonu|halkali|merter|mecidiyekoy|nisantasi|ortakoy|pendik|samandira|sishane|yenikapi|zincirlikuyu)-cicekci-:id(\\d+)', destination: '/istanbul/:ilce', permanent: true },

      // İSTANBUL İLÇELERİ (ID'siz): /atasehir-cicekci → /istanbul/atasehir
      { source: '/:ilce(uskudar|kartal|beykoz|avcilar|taksim|levent|istinye|tarabya|cekmekoy|buyukcekmece|catalca|arnavutkoy|gaziosmanpasa|zeytinburnu|zekeriyakoy|atasehir|yesilkoy|tuzla|maltepe|kadikoy|sariyer|besiktas|bakirkoy|sisli|beyoglu|bayrampasa|basaksehir|beylikduzu|esenyurt|silivri|sile|adalar|cengelkoy|eminonu|halkali|merter|mecidiyekoy|nisantasi|ortakoy|pendik|samandira|sishane|yenikapi|zincirlikuyu)-cicekci', destination: '/istanbul/:ilce', permanent: true },

      // ÖZEL İLÇELER: /gaziantep-cicekci → /gaziantep/gaziantep
      { source: '/gaziantep-cicekci', destination: '/gaziantep/gaziantep', permanent: true },
      { source: '/gaziantep-cicekci-:id(\\d+)', destination: '/gaziantep/gaziantep', permanent: true },
      { source: '/muradiye-cicekci', destination: '/van/muradiye', permanent: true },
      { source: '/muradiye-cicekci-:id(\\d+)', destination: '/van/muradiye', permanent: true },

      // İSTANBUL İLÇELERİ (gonderme, ID'li): /beykoz-cicek-gonderme-78 → /istanbul/beykoz
      { source: '/:ilce(beykoz|uskudar|kartal|avcilar|taksim|levent|istinye|tarabya|cekmekoy|buyukcekmece|catalca|arnavutkoy|gaziosmanpasa|zeytinburnu|zekeriyakoy|atasehir|yesilkoy|tuzla)-cicek-gonderme-:id(\\d+)', destination: '/istanbul/:ilce', permanent: true },

      // İSTANBUL İLÇELERİ (gonderme, ID'siz): /beykoz-cicek-gonderme → /istanbul/beykoz
      { source: '/:ilce(beykoz|uskudar|kartal|avcilar|taksim|levent|istinye|tarabya|cekmekoy|buyukcekmece|catalca|arnavutkoy|gaziosmanpasa|zeytinburnu|zekeriyakoy|atasehir|yesilkoy|tuzla)-cicek-gonderme', destination: '/istanbul/:ilce', permanent: true },

      // İSTANBUL MAHALLELERİ (ID'li): /avcilar-cicek-siparisi-33 → /istanbul/avcilar
      { source: '/:mahalle(avcilar|yesilkoy|atasehir|cekmekoy|tuzla|gursel|orabayir|orhangazi|suluntepe|yesilbaglar|ahmediye|mehmetakihersoy|asmalimescit|kadi|abbasaga)-cicek-siparisi-:id(\\d+)', destination: '/istanbul/:mahalle', permanent: true },

      // İSTANBUL MAHALLELERİ (ID'siz): /avcilar-cicek-siparisi → /istanbul/avcilar
      { source: '/:mahalle(avcilar|yesilkoy|atasehir|cekmekoy|tuzla|gursel|orabayir|orhangazi|suluntepe|yesilbaglar|ahmediye|mehmetakihersoy|asmalimescit|kadi|abbasaga)-cicek-siparisi', destination: '/istanbul/:mahalle', permanent: true },

      // ÜRÜN: /52604-Renkli-Lavantali.html → /urun/renkli-lavantali
      { source: '/:id(\\d+)-:slug(.+)\\.html', destination: '/urun/:slug', permanent: true },

      // KATEGORİ: /guller-24 → /kategori/guller
      { source: '/:kategori([a-z]+)-:id(\\d+)', destination: '/kategori/:kategori', permanent: true },

      // ÖZEL GÜN: /anneler-gunu-cicekleri-45 → /kategori/anneler-gunu
      { source: '/:gun([a-z]+)-cicekleri-:id(\\d+)', destination: '/kategori/:gun', permanent: true },

      // KATEGORİ (cicek): /sevgiliye-cicek-13 → /kategori/sevgiliye
      { source: '/:kategori([a-z]+)-cicek-:id(\\d+)', destination: '/kategori/:kategori', permanent: true },
    ];
  },
};

module.exports = nextConfig;
