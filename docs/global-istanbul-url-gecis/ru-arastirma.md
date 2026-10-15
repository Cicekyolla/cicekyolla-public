# RU (Rusça) İstanbul ticari URL: araştırma ve karar (14 Eki 2026)

## 1. Veri kaynakları ve sınırlar
- **Search Console:** RU sorgu verisi bu oturumdan okunamadı. Veri API'de (`searchConsoleService`) senkronize ediliyor, ancak yalnız Admin token'ıyla okunuyor. **Hacim, gösterim veya sıralama verilmemiştir.**
- **Google Ads Keyword Planner / Yandex Wordstat:** erişim yok. **Arama hacmi uydurulmadı.**
- **Kullanılan tek kaynak:** oturumun WebSearch aracı. Bu bir ABD dizinidir; Google veya Yandex sonuç sayfası değildir. Buradan yalnız rakip başlıkları ve URL'leri gözlenebildi.

## 2. Sorgu kanıtı: rakip başlıkları
`доставка цветов в Стамбуле` sorgusu, alan adları çeşitlenmiş 9 floristte aynı ifadeyi döndürdü:

| Site | Başlık | URL |
|---|---|---|
| udora.tr | Цветы в Стамбуле с доставкой сегодня… | /ru/istanbul/ |
| flowerartistanbul.com | Доставка цветов в Кагитхане, Стамбул | /ru/flower-delivery-kagithane-istanbul/ |
| flowers4istanbul.com | Доставка цветов Стамбул, Турция | /ru/ |
| de-la-flor.ru | Доставка цветов в Стамбуле | /istanbul |
| felicita-flowers.com | Доставка цветов в Стамбуле | /ru/delivery-flowers-istanbul |
| florafox.com | Доставка цветов в Стамбуле от 2 838 ₺ | /tr/ru/**stambul**-106 |
| istanbul.floristik.ua | Доставка цветов Стамбул - Заказать цветы с доставкой | / |
| istanbulflowersdelivery.com | Доставка цветов и подарков в Стамбул | / |

Önceki tur (13 Eki) ek olarak şunları gözlemişti: flori1 `/turtsiya/stambul-4543/`, s-fl `/dostavka/Stambul`, annetflowers `/turciya/stambul/`.

- `заказать цветы в Стамбул`, `отправить цветы в Стамбул (из России)` ve `цветы с доставкой Стамбул Кадыкёй` sorguları **florist sonucu döndürmedi** (festival, emlak ve tur sayfaları geldi). Bu dizinde bu ifadeler için kanıt yok; hacim hakkında hiçbir şey söylemez.
- **Sonuç:** ana ifade "доставка цветов (в) Стамбул(е)". Güven: orta (başlık tutarlılığı), hacim: bilinmiyor.
- **Müşteri ülkesi ile teslimat yeri ayrımı:** ifade teslimat yerini (Стамбул) taşır, gönderenin ülkesini taşımaz. "из России" gibi ülke ekleri URL'ye konmadı.

## 3. URL kararı
| Konu | Karar | Gerekçe |
|---|---|---|
| Yazı sistemi | **Latin translit (ASCII)** | Rakiplerin neredeyse tamamı ASCII kullanıyor; tek Kiril örnek FAI. Kiril slug, paylaşımda yüzde-kodlu (%D0…) görünür ve mevcut kod yalnız `[a-z0-9-]` kabul ediyor. |
| İfade | `dostavka-tsvetov` (доставка цветов) | Başlıklardaki ana ifade. Çoğul ilgi hali ("цветов") doğal kullanım. "цветы с доставкой" ikincil olarak sayfa metninde kalır. |
| ц → | `ts` | Resmî bir Yandex kuralı bulunamadı. Gözlenen sitelerde `ts` (dostavka-tsvetov.com, protocol.ua, zoon) ve `c` (calend.ru, cvety.ru) birlikte kullanılıyor. Habr'daki yorum, translit varyantının sıralamaya belirgin etkisi olmadığını söylüyor. `ts` uluslararası okur için daha okunur ve 13 Eki dokümanındaki öneriyle tutarlı. |
| Şehir | `stambul` (Стамбул) | Rusça eksonim; florafox, flori1, s-fl ve annetflowers slug'ları. ES `estambul` ve PT `istambul` ile aynı yaklaşım. |
| İlçe/mahalle | TR ASCII anahtarı (`kadikoy`, `cevizli`) | Kiril adlardan translit (Кадыкёй → kadykjoj) tutarsız olur ve çakışma riski taşır. TR kimliğiyle birebir eşleşir; diğer 7 dille aynı. |
| Biçim | `/ru/dostavka-tsvetov-[{mahalle}-][{ilçe}-]stambul` | Mevcut `commercialUrl.ts` kalıbı; yeni sistem yok. |

## 4. Doğrulama (otomatik)
- 1.015 RU satırı: il 1, ilçe 39, mahalle 975.
- 1.015 benzersiz ticari adres; 13 dil içinde çakışma yok.
- Ticari adres hiçbir mevcut rotayı (ürün/kategori/blog/niyet/destinasyon) gölgelemiyor.
- En uzun adres 66 karakter.
- TR karşılıkları: 1.015/1.015, canlı 301 haritasıyla (`/api/public/redirects`, 3.071 kayıt) birebir aynı. Hepsi benzersiz.
- Tam harita: `ru-gecis-haritasi.csv`.

## 5. Açık riskler
- **Hacim kanıtı yok:** GSC veya Wordstat ile doğrulanmalı. Gerekirse kalıp tek satırda değiştirilir; RU bayrağı kapalıyken etkisizdir.
- **Dil onayı:** anadili Rusça bir editörün "доставка цветов" + `stambul` translitini onaylaması önerilir.
- **Rakip formatı karışık:** RU rakipleri arasında `istanbul` (ASCII İngilizce) kullananlar da var. Translit `stambul` bilinçli bir seçimdir.

## 6. Entegrasyon doğrulaması (15 Eki 2026)
- **Harita (`ru-gecis-haritasi.csv`):** yeniden üretilmedi, olduğu gibi doğrulandı. 1.015 satır (il 1, ilçe 39, mahalle 975); 0 hata, 0 çakışma. Kalıp, sözlük, canonical ve 301 alanları tutarlı.
- **TR ↔ RU:** 1.015/1.015 kayıt canlı 301 haritasıyla (`/api/public/redirects`) birebir.
  - Canlı `tr-location` API'si ile 144/144 eşleşme (örneklem).
  - Kalan 871 adres kullanıcı kararıyla API'den ayrıca sorgulanmadı (kullanım/rate-limit maliyeti).
- **301:** `lib/ruCommercialMiddleware.test.ts` middleware'i gerçekten çalıştırır.
  - 1.015 eski adresin her biri tek 301 ile ticari adrese gidiyor.
  - `gclid`/`utm` bayt bayt korunuyor; hedef yeniden yönlendirilmiyor (döngü yok).
  - Uydurma slug yönlendirilmiyor.
- **Preview (`dpl_5NT1cjXp…`):**
  - RU il, ilçe ve mahalle sayfaları: 200, self-canonical, 15 hreflang, kırıntı yeni adreslerle, 50 ürün.
  - RU sitemap 1.015 ticari / 0 eski.
  - `/ru` ana sayfasında eski `/ru/istanbul` bağlantısı 0.
  - Ürün sayfasında sepet var; `/sepet` ve `/checkout` 200.
  - Uydurma slug 404.
- **İçerik:** `ru-icerik-denetimi.md`. CMS ve ürün kayıtlarına dokunulmadı; düzeltmeler ayrı onaya sunulacak.
