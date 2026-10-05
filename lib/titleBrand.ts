// =============================================================================
// <title>'da marka YALNIZ BİR KEZ.
//
// KÖK NEDEN: kök layout'un başlık şablonu ("%s | ÇiçekYolla") markayı her sayfaya
// ekler. Kayıtlı bir SEO başlığı zaten markayla bitiyorsa (API'nin otomatik
// başlık üreticisi "<ad> | Cicekyolla" / "… - Cicekyolla" yazar; AI ve operatör
// başlıkları da böyle olabilir) sayfa "… | Cicekyolla | ÇiçekYolla" basar.
//
// KURAL: şablona verilmeden önce başlığın SONUNDAKİ marka parçası (ayraçla
// birlikte) atılır; markayı şablon tek yazımla ekler. Kayıtlı veri değişmez.
// Başlık yalnız markadan ibaretse dokunulmaz. Bağımlılığı yoktur.
// =============================================================================

// Sondaki "<ayraç> <marka>" — marka yazımları: ÇiçekYolla, Çiçekyolla, Cicekyolla, Cicek Yolla,
// isteğe bağlı .com / .com.tr. Ayraç: | - – — · : ,
const TRAILING_BRAND = /\s*[|\-–—·:,]\s*[çc]i[çc]ek\s?yolla(?:\.com(?:\.tr)?)?\s*$/iu;

/** Başlığın sonundaki marka parçasını atar (birden fazlaysa hepsini). Marka dışında metin kalmıyorsa başlığı aynen döndürür. */
export function stripTrailingBrand<T extends string | null | undefined>(title: T): T {
  if (typeof title !== "string") return title;
  let out: string = title;
  while (TRAILING_BRAND.test(out)) out = out.replace(TRAILING_BRAND, "");
  out = out.trim();
  return (out.length > 0 ? out : title) as T;
}
