// ============================================================================
// lib/categorySort.ts — EK / ADDITIVE (SEO YAYIN ZİNCİRİ — TEK KATEGORİ SIRASI).
// Yaprak modül: çalışma zamanı ithali YOK → sunucu, istemci (FilterBar) ve
// `node --test` aynı dosyayı doğrudan yükler (lib/categorySort.test.ts).
//
// SORUN: Türkçe kategori sayfası varsayılan olarak "en yeni" (created_at_desc) sırasını
// istiyordu; Global kategori sayfası ise operatörün Kategori Merkezi'nde verdiği ELLE
// sırayı kullanıyor. Aynı kategori iki yüzeyde iki farklı sırayla listeleniyordu.
//
// KURAL: Türkçe kategori listesinin VARSAYILAN sırası ("Önerilen Sıralama") operatörün
// kategori sırasıdır: sort=category_order (önce elle sıra, sonra created_at DESC, id DESC).
// SSR sayfa, sonsuz kaydırma (server action) ve dolayısıyla her ?page=N aynı sırayı kullanır;
// PDP "ilgili ürünler" de birincil kategorinin aynı sırasını okur. Müşterinin seçtiği
// fiyat / ad sıralamaları AYNEN. Varsayılan sıra URL'ye ve canonical'a YAZILMAZ (bugünkü
// varsayılanla aynı kural).
//
// DEPLOY SIRASI GÜVENLİĞİ: sort=category_order API'nin yeni sürümünde var; bugünkü API
// bilinmeyen sıralamayı HTTP 422 ile reddeder. Okuma katmanı (lib/api.ts fetchProductsPaged)
// reddedilen isteği AYNI parametrelerle, bugünkü sıralamayla (created_at_desc) bir kez
// tekrarlar → sayfa bugünkü gibi çizilir. Vitrin API'den önce de sonra da yayınlanabilir.
//
// EK (FAIL-OPEN — her başarısızlık): yalnız 422 değil; API'nin bu sırayı tanıdığı BİLİNMİYORKEN
// varsayılan sıra isteği HANGİ nedenle olursa olsun sonuç vermezse (ağ hatası, 5xx,
// CATEGORY_ORDER_DEADLINE_MS içinde yanıt yok) okuma katmanı AYNI isteği bugünkü sırayla, AYNI
// önbellek ayarıyla gönderir → bugünkü isteğin Data Cache kaydı (bayat da olsa) kullanılır; API
// kesintisinde kategori sayfası boşalmaz.
// "API bu sırayı tanımıyor" notu yine YALNIZ ret (422/400) + başarılı tekrar ile düşülür.
//
// EK (KABUL NOTU): API varsayılan sırayı bir kez KABUL edince (200) bu da not edilir. Not tazeyken
// istek, bugünkü isteğin akışıyla BİREBİR aynı yürür (süre sınırı yok; hata olursa aynı istek
// no-store ile bir kez daha; ikisi de düşerse boş sayfa) — yalnız `sort` değeri farklıdır. Böylece
// API yayınlandıktan sonra yavaş bir yanıt ya da geçici bir ağ hatası listeyi bugünkü sıraya
// ÇEVİRMEZ (sayfa 1 elle sırada, sayfa 2 en-yeni sırada kalmaz). Ret görülürse (API geri alındı)
// kabul notu silinir.
//
// NOT ÖMRÜ (bilinçli 5 dk): not süreç içidir. Vitrin API'den ÖNCE yayınlanırsa API yayınından
// sonraki en çok 5 dk boyunca örnekler arasında sıra karışık olabilir (notu taze örnek bugünkü
// sırayı, taze açılan örnek elle sırayı ister); süre dolunca kendiliğinden düzelir. Daha kısa
// not, API beklenirken her örneğe daha sık ret yoklaması bindirirdi. API önce yayınlanırsa bu
// pencere hiç oluşmaz (yayın sırası notu: PR gövdesi).
// ============================================================================

/** Kategori listesinin varsayılan sırası: operatörün elle kategori sırası. */
export const CATEGORY_DEFAULT_SORT = "category_order" as const;

/** API varsayılan sırayı tanımıyorsa kullanılan sıra (bugünkü varsayılan). */
export const CATEGORY_SORT_FALLBACK = "created_at_desc" as const;

/** Müşterinin seçebildiği sıralamalar (`?sort=`). */
export const CATEGORY_CUSTOMER_SORTS = ["price_asc", "price_desc", "name_asc"] as const;

export type CategoryListingSort = typeof CATEGORY_DEFAULT_SORT | (typeof CATEGORY_CUSTOMER_SORTS)[number];

/**
 * `?sort` ham değeri → uygulanacak sıralama. Parametre yoksa, tanınmıyorsa ya da eski varsayılanın
 * açık yazımıysa (`created_at_desc` — arayüz bu değeri URL'ye hiç yazmadı) varsayılan sıra.
 */
export function categorySortOf(raw: unknown): CategoryListingSort {
  return typeof raw === "string" && (CATEGORY_CUSTOMER_SORTS as readonly string[]).includes(raw)
    ? (raw as CategoryListingSort)
    : CATEGORY_DEFAULT_SORT;
}

/** URL'ye / sayfalama bağlantılarına yazılacak `sort` değeri: varsayılan sıra YAZILMAZ (undefined). */
export function categorySortParam(sort: string | null | undefined): string | undefined {
  return sort && sort !== CATEGORY_DEFAULT_SORT ? sort : undefined;
}

/** API "bu sıralamayı tanımıyorum" dedi mi? (bugünkü API: 422; doğrulama katmanı değişirse 400) */
export function isSortRejectedStatus(status: number): boolean {
  return status === 422 || status === 400;
}

/** "API varsayılan sırayı tanımıyor" notunun ömrü (süreç içi). */
export const SORT_REJECTED_MEMO_MS = 5 * 60_000;

/** EK: "API varsayılan sırayı tanıyor" (kabul) notunun ömrü — her başarılı yanıtta yenilenir (süreç içi). */
export const SORT_ACCEPTED_MEMO_MS = 5 * 60_000;

/**
 * EK (FAIL-OPEN): varsayılan sıra isteğine tanınan süre. Aşılırsa istek bugünkü sırayla gönderilir
 * (yavaş API'de sayfa, bugünkü isteğin önbellek kaydını beklemeden kullanır).
 */
export const CATEGORY_ORDER_DEADLINE_MS = 2_500;

/**
 * EK (FAIL-OPEN) — sözü süreyle sınırlar: `ms` içinde sonuçlanırsa değeri, reddedilirse ya da
 * süre dolarsa null döner; ASLA fırlatmaz. AbortSignal BİLEREK kullanılmaz: React, `signal`
 * taşıyan fetch'i istek içinde tekilleştirmez (generateMetadata + sayfa aynı okumayı iki kez
 * yapardı). Süre dolduğunda asıl söz arka planda sürer (sonucu yutulur; başarılıysa Next onu
 * yine Data Cache'e yazar → sonraki render önbellekten okur).
 * `ms` null ise süre sınırı YOKTUR (yalnız ret null'a çevrilir).
 */
export function settledWithin<T>(work: Promise<T>, ms: number | null): Promise<T | null> {
  if (ms === null) return work.then((value) => value, () => null);
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

export interface SortFallback {
  /** İsteğin GERÇEKTEN gönderileceği sıralama: not tazeyse varsayılan sıra yerine yedek sıra. */
  effective<T extends string | undefined>(sort: T): T | typeof CATEGORY_SORT_FALLBACK;
  /** API varsayılan sırayı reddetti ve aynı istek yedek sırayla BAŞARILI oldu → not düşülür. */
  noteRejected(): void;
  /** EK: API varsayılan sırayı KABUL etti (başarılı yanıt) → kabul notu düşülür / yenilenir. */
  noteAccepted(): void;
  /** EK: API'nin varsayılan sırayı tanıdığı biliniyor mu? (taze kabul notu) */
  accepted(): boolean;
}

/**
 * Süreç içi not (saat enjekte edilebilir → birim testi). API yayınlanana kadar her kategori
 * isteği önce 422 alıp sonra tekrarlanmasın: ret bir kez görülünce SORT_REJECTED_MEMO_MS
 * boyunca istek doğrudan yedek sırayla gönderilir (upstream'e ek yük binmez). Süre dolunca
 * varsayılan sıra yeniden denenir → API yayınlandıktan en geç 5 dk sonra yeni sıra devrede.
 */
export function createSortFallback(now: () => number = () => Date.now()): SortFallback {
  let rejectedUntil = 0;
  let acceptedUntil = 0;
  return {
    effective(sort) {
      return sort === CATEGORY_DEFAULT_SORT && rejectedUntil > now() ? CATEGORY_SORT_FALLBACK : sort;
    },
    noteRejected() {
      rejectedUntil = now() + SORT_REJECTED_MEMO_MS;
      acceptedUntil = 0;
    },
    noteAccepted() {
      acceptedUntil = now() + SORT_ACCEPTED_MEMO_MS;
    },
    accepted() {
      return acceptedUntil > now();
    },
  };
}
