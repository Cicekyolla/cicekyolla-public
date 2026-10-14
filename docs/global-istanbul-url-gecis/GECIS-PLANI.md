# İstanbul Global (13 dil) Ticari URL Geçiş Planı

Durum (14 Eki 2026): **UYGULANDI, bayrak arkasında.** Kod bu PR'da (#255). Production'da bayrak boş olduğu için davranış değişmez.
Pilot (EN, DE, FR) yalnız bu dalın Vercel preview'ında açıldı ve test edildi (bölüm 8).

Tarih: 13 Ekim 2026.

Bu klasördeki dosyalar:
- `GECIS-PLANI.md` (bu belge)
- `istanbul-global-url-sozlugu.csv`: tam eşleştirme envanteri, 13.195 satır
- `anahtar-kelime-rakip-arastirmasi.md`: 13 dil sorgu ve rakip URL gözlemleri, kaynaklarıyla

## 1. Karar özeti

**Öneri: Toplu geçiş yapılmasın.** Gerekirse yalnız ölçümlü bir İngilizce pilot yapılsın (bölüm 5).

Gerekçe:
- **URL biçimi tek başına belirleyici görünmüyor.** "Send flowers to Kadikoy" ve "flower delivery Kadikoy" sonuçlarında anahtar kelimeli slug'lar da (flowerartistanbul, turkeyflowersshop) hiyerarşik adresler de (sendflowerstoturkey `/istanbul/kadikoy/florist/`, mondialflowers `/turkey/istanbul/kadikoy.aspx`) görünüyor.
  - Fleurop, MyGlobalFlowers, Aquarelle, Flowwow ve Udora şehir sayfalarında hiyerarşik `/…/istanbul` kullanıyor.
  - Ortak olan şey `<title>` ve H1'de o dilin satış ifadesi. ÇiçekYolla başlıkları bunu zaten yapıyor; örneğin `Flower Delivery Kadıköy — Same-Day Florist` ve `Blumen nach Maltepe (Istanbul) schicken`.
- **Ölçülemeyenler:**
  - Search Console (bu oturumdan erişim yok).
  - Keyword Planner (erişim yok).
  - Google sonuç sayfası ve otomatik tamamlama (ağdan erişilemedi).
  - Arama hacmi hiçbir yerde ölçülmedi ve tahmin edilmedi.
- **Risk:** 13.195 adresten 7.105'i 301'e taşınırdı. Bu sayfalar 13 Ekim itibarıyla 200 dönüyor, self-canonical ve hreflang kümesine bağlı. Kazanç kanıtı yokken bu yeniden dizinleme riski haklı çıkmıyor.

## 2. Envanter (canlı sitemap'ler, 13 Ekim 2026)

| Katman | Adet | Kaynak |
|---|---|---|
| TR İstanbul (il + 39 ilçe + 975 mahalle) | 1.015 | `locations.xml`, `neighborhoods-*.xml` |
| Global İstanbul, dil başına | 1.015 | `locale-{dil}.xml` (13 dilde birebir aynı anahtar kümesi) |
| Global İstanbul toplam | 13.195 | sözlük CSV |
| TR karşılığı olan Global satırı | 13.195 / 13.195 | yönetilen 301 haritası + TR kaydı location bloğu |

## 3. Önerilen URL sözlüğü (yalnız geçiş kararı verilirse)

| Dil | İl | İlçe | Mahalle | Kanıt güveni |
|---|---|---|---|---|
| en | `/en/flower-delivery-istanbul` | `/en/flower-delivery-{ilçe}-istanbul` | `/en/flower-delivery-{mahalle}-{ilçe}-istanbul` | orta |
| de | `blumen-verschicken-…-istanbul` | aynı kalıp | aynı kalıp | düşük-orta |
| fr | `livraison-fleurs-…-istanbul` | aynı kalıp | aynı kalıp | orta |
| it | `consegna-fiori-…-istanbul` | aynı kalıp | aynı kalıp | orta |
| nl | `bloemen-bezorgen-…-istanbul` | aynı kalıp | aynı kalıp | orta |
| es | `envio-de-flores-…-estambul` | aynı kalıp | aynı kalıp | düşük |
| pt | `entrega-de-flores-…-istambul` | aynı kalıp | aynı kalıp | düşük |
| ru, ar, ja, ko, zh, az | **değişmez** (`/{dil}/istanbul/…`) | | | rakiplerde yerel alfabeli ya da anahtar kelimeli slug kanıtı yok |

Sözlük denetimi:
- 13.195 satır; geçiş önerilen 7.105, değişmeyen 6.090.
- Mükerrer yeni URL yok.
- Mevcut rota anahtarlarıyla (ürün ve kategori segmentleri, `blog`, şehir kökleri, niyet sayfaları) çakışma yok.
- En uzun URL 69 karakter.
- Mahalle slug'ındaki `-mah` eki yeni URL'de atılıyor. Yer adları mevcut ASCII slug'lardan alınıyor; çeviri yapılmıyor.

## 4. Uygulama tasarımı (geri alınabilir, additive)

İkinci bir CMS kurulmayacak. Aynı Global sayfa kaydı (`global_pages`, `page_key = istanbul/…`) iki adres sunmayacak; tek doğru adres olacak.

1. **Takma ad tablosu** (additive migration): `global_url_alias(locale, page_key, slug, status draft|active, created_at)`.
   - Admin'deki Global Merkezi'nden onaylanır.
   - Varsayılan `draft`, yani etkisiz.
2. **Public rota:** `parseLocalePath`, tek segmentli `/{dil}/{slug}` için aktif takma adı `page_key`'e çözer. Sayfa motoru aynı kalır (içerik, vitrin, sayfalama).
   - Canonical takma ad yoludur.
   - Eski yol aktif takma adı olan bir anahtarı gösteriyorsa render edilmez.
3. **301:** Eski yol → yeni yol, tek adım. Mevcut yönetilen 301 sistemiyle yapılır (`seo_redirect`; locale yolları `resolveManagedLocaleRedirect` ile zaten tek adımda düzleştiriliyor; zincir/döngü korumalı).
   - 13.195 değil, yalnız aktif takma adlar yazılır.
   - Aktif 301 tavanı 20.000 (PR #255). Bugün 3.071 kayıt var; tam geçiş +7.105 ekler, toplam ~10.200.
4. **Hreflang:**
   - `locationHreflangFamily` locale yolu olarak takma ad yolunu kullanır. TR adresleri değişmez.
   - İki tarafın kümesi yine tek kaynaktan kurulur.
5. **Sitemap:** `locale-{dil}.xml` yalnız yeni yolu listeler, eski yolu listelemez.
6. **İç bağlantılar:** Breadcrumb, ilçe/mahalle ızgarası, footer ve vitrin bağlantıları aynı çözücüden geçer. Hiçbir sayfa 301'e bağlantı vermez.
7. **Geri alma:** Takma ad `draft` yapılır, 301 kaydı devre dışı bırakılır ve gerekirse ters 301 (yeni → eski) yazılır. Kayıt silinmez, şema daraltılmaz.

## 5. Önerilen pilot (karar ölçümle verilir)

- **Kapsam:** Yalnız EN, 5 ilçe sayfası. Örnek: Kadıköy, Beşiktaş, Şişli, Üsküdar, Maltepe. Kontrol grubu benzer trafikli 5 ilçe (değişmez).
- **Önkoşul:** Bu PR production'a alındıktan sonra Search Console'da en az 28 gün temel veri.
  - Ülke × sorgu × sayfa bazında gösterim, tıklama ve ortalama pozisyon.
  - Ayrıca dizinleme durumu ve Google'ın seçtiği canonical.
- **Süre:** 8 hafta.
- **Başarı ölçütü:**
  - Pilot sayfaların, kontrol grubuna göre ülke bazlı tıklama ve gösterimde anlamlı artışı.
  - Gerçek sipariş: Global checkout'tan gelen İstanbul siparişleri.
- **Durdurma ölçütü:** 4. haftada pilot gösterimleri kontrole göre belirgin düşükse geri alınır (bölüm 4.7).

## 6. Geçiş yapılmadan uygulanabilecek kanıtlı iyileştirmeler

Bunlar içerik işi; Admin'den yapılır, kod değişikliği gerektirmez.

- **DE:** "Blumen nach Istanbul schicken" kalıbı aramada ilgili ticari sayfa getirmedi. "Blumen verschicken / Blumenversand Istanbul" daha yaygın. DE başlık ve H1'lerde bu ifadeye geçilmesi değerlendirilmeli.
- **AR:** Başlıklarda "زهور" (توصيل الزهور) "ورد"dan daha sık görülüyor.
- **RU:** "Доставка цветов в Стамбул(е)" baskın ifade. İlçe adı Kiril transliterasyonuyla verilmeli (Кадыкёй).
- **JA / KO / ZH / AZ:** İstanbul'a özgü yerel rakip sayfa bulunamadı; sorgu kalıbı kanıtlanamadı. Değişiklik önerilmiyor.
- **İnce mahalle sayfaları:** Yabancı dillerde mahalle düzeyinde talep yalnız bilinen semtlerde (Bebek, Nişantaşı, Levent) görüldü. GSC verisiyle gösterim almayan mahalle sayfaları için birleştirme ya da noindex ayrıca değerlendirilmeli. Bu belgede uygulanmadı.

## 7. Kesin olmayanlar

- Google indeks durumu (13 dilin her birinde kaç İstanbul URL'si indeksli): **bilinmiyor.** Search Console verisi gerekiyor.
- Rakip canonical ve hreflang etiketleri: sayfalar bu ortamdan çekilemedi, **gözlenmedi.**
- Sorgu hacimleri: **ölçülmedi, tahmin edilmedi.**

## 8. Uygulama (14 Ekim 2026) — tek mekanizma

- **Tek kaynak:** `lib/global/commercialUrl.ts`. Canonical, hreflang (TR sayfası dahil), sitemap, kırıntı (görsel ve JSON-LD), ilçe/mahalle ızgarası, sayfalama, v80 şehir kartları, v80 footer, site footer'ı ve içerik bağlantıları buradan geçer.
- **Bayrak:** `NEXT_PUBLIC_GLOBAL_COMMERCIAL_URL_LOCALES` (ör. `en,de,fr`). Kalıbı olmayan dil yok sayılır. Boşken çıktı bugünküyle aynı (13.195 satır testle doğrulandı).
- **Rota:** `/<dil>/<ticari-slug>` o dilin yayındaki envanterinden ileri yönde eşleştirilir; tahmin yok. Eşleşme yoksa 404, envanter okunamazsa 5xx.
- **301 (middleware, tek adım):**
  - Açık dilde `/<dil>/istanbul[/ilçe[/mahalle]]` → ticari adres.
  - Kapalı dilde ticari adres → eski adres (geri alma).
  - Yalnız yayındaki (approved + indexable) anahtarlar yönlendirilir; envanter okunamazsa yönlendirme yapılmaz (fail-open).
  - Yönetilen 301'den sonra bakılır. Sorgu dizesi (gclid) korunur.
- **Noindex satır** ticari adrese taşınmaz; eski adreste kendi canonical'ıyla kalır.

### Dil kapsamı

| Durum | Diller | URL sayısı |
|---|---|---|
| Pilot (açılacak) | en, de, fr | 3.045 |
| Hazır (kalıp var, bayrakla açılır) | it, nl, es, pt | 4.060 |
| Dilsel doğrulama bekliyor (adres değişmez) | ru, ar, ja, ko, zh, az | 6.090 |
| **Toplam** | 13 | 13.195 |

### Release sırası

1. API #255 deploy edilir: `tr-location` ucu, 301 tavanı, teşhis düzeltmesi. Public tarafa bağımlılığı yok.
2. Public #255 production'a **bayrak boş** deploy edilir. Hreflang, 5xx ve soft-404 düzeltmeleri devreye girer; URL'ler değişmez.
3. Production ortamına `NEXT_PUBLIC_GLOBAL_COMMERCIAL_URL_LOCALES=en,de,fr` eklenip yeniden deploy edilir; pilot başlar.
   - Search Console'da EN/DE/FR sitemap'leri yeniden gönderilir.
   - 4–8 hafta ülke × sorgu izlenir.
4. Pilot başarılıysa değer `en,de,fr,it,nl,es,pt` yapılır (+4.060 URL).
5. ru, ar, ja, ko, zh, az için önce dil kanıtı toplanır; sonra kalıp eklenir (kod değişikliği).

**Geri alma:** Değişken boşaltılıp yeniden deploy edilir. Ticari adresler tek adım 301 ile eski adreslere döner; kayıt silinmez.
