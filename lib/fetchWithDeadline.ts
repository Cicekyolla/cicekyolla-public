// ============================================================================
// fetchWithDeadline — süre sınırı + tek tekrar (9 Eyl 2026, ADDITIVE)
// ----------------------------------------------------------------------------
// Render'a giden okumaların hiçbirinde süre sınırı yoktu. Vercel runtime hata
// kümesi (38 olay / 35 kullanıcı, 5 Tem–8 Eyl; uzak uç 216.24.57.x = Render'ın
// Cloudflare kenarı): keep-alive soketi karşı tarafça sessizce kapanınca istek
// "other side closed" ile düşüyor ya da uzun süre askıda kalıyordu. Lokasyon
// (ISR) rotasında bu hatalar yutulduğu için sonuç sentetik/eksik sayfa olarak
// 300 sn önbelleğe giriyordu. Bu sarmalayıcı:
//   • süre dolunca isteği iptal eder (AbortController),
//   • bir kez, taze bağlantıyla tekrar dener ("x-cy-retry" başlığı, Next'in
//     istek içi tekilleştirmesinin iptal edilmiş sözü geri vermesini önler),
//   • yine olmazsa HATAYI FIRLATIR → çağıranın mevcut catch/fallback yolu aynen.
// Normal yolda davranış, yanıt ve önbellek anahtarları değişmez. Yalnız lokasyon
// sayfasının okumalarında kullanılır; diğer çağrılar dokunulmadan kaldı.
// Bağımsız modül (Next/DOM bağımlılığı yok) → lib/fetchWithDeadline.test.ts.
//
// EN KÖTÜ BEKLEME = 2 × timeoutMs (ilk deneme + tekrar). Süre, yanıt BAŞLIKLARI
// gelene kadar işler; gövde okuması kapsam dışıdır.
// EK (SEO yayın zinciri) — retryOnTimeout=false: SÜRE DOLDUYSA tekrar denenmez
// (en kötü bekleme = 1 × timeoutMs); kopan soket gibi hızlı hatalar yine bir kez
// tekrar denenir. Yedek yolu olan okumalar (hreflang, product-urls) bunu kullanır:
// yanıt vermeyen bir uç iki kez beklenmez. Varsayılan (true) → davranış AYNEN.
// ============================================================================
export async function fetchWithDeadline(
  url: string,
  init: RequestInit & { headers?: Record<string, string> },
  timeoutMs: number,
  fetchFn: typeof fetch = fetch,
  retryOnTimeout: boolean = true,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const headers = attempt === 0 ? init.headers : { ...(init.headers ?? {}), "x-cy-retry": "1" };
      return await fetchFn(url, { ...init, headers, signal: controller.signal });
    } catch (err) {
      lastErr = err;
      if (timedOut && !retryOnTimeout) break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

