# RU içerik düzeltme hazırlığı: otel ve satış niyetleri (15 Eki 2026)

Durum: **ONAY TASLAĞI.** CMS'e yazılmadı; yayın, merge veya production deploy yapılmadı. 1.015 RU URL'si, 7 canlı dil, hreflang, canonical, sitemap ve 301 aynı kaldı.

## Dosyalar
| Dosya | İçerik |
|---|---|
| `ilceler.json` | 39 ilçe için özgün RU içerik: h1, seo_title, meta, intro_html, content_html, 3 SSS; ayrıca kaynak ve editör notları |
| `niyet-sayfalari.json` | `/ru/hotel-delivery` ve `/ru/hospital-delivery` taslakları; düğün notu |
| `teslimat-motor-kararlari.tsv` | 39 ilçe için canlı motor kararı (`/api/public/global/reach`) |
| `../ru-yer-adlari.csv` | 39 ilçe + İstanbul Kiril yazımı |

## 1. Arama niyeti kanıtı (dürüst sınır)
- WebSearch (ABD dizini, Google/Yandex değil) ile aranan sorgular:
  - `доставка цветов в отель Стамбул`
  - `доставка цветов в больницу Стамбул`
  - `цветы на свадьбу Стамбул заказать`
  - `отправить розы девушке в Стамбул доставка`
- Sonuç: **hiçbiri florist sonucu döndürmedi.** Gelenler tur, otel tanıtımı (Kempinski Çırağan düğün sayfası) ve lale festivali sayfalarıydı.
- **Hacim, sıralama ve rakip yoğunluğu bilinmiyor; uydurulmadı.** GSC ve Wordstat ile doğrulanmalı.
- Doğal Rusça kullanım:
  - Otel: «доставка цветов в отель», «цветы в номер отеля», «передать букет через ресепшен».
  - Hasta: «цветы с пожеланием выздоровления», «доставка цветов в больницу».
  - Sevgili: «цветы любимой/любимому», «розы девушке».
  - Düğün: «букет на свадьбу».

## 2. Otel önceliği: mevcut altyapıyla zincir
**Akış:** Arama → `/ru/dostavka-tsvetov-{ilçe}-stambul` (her ilçede otel bölümü + SSS) → ürün (`/ru/product/...`) → sepet → checkout → teslimat.

Checkout'ta otel için gereken her şey zaten var; yeni sistem gerekmiyor:
- Adres alanı Google Places kullanıyor ve tür kısıtı yok, yani otel adı aranabiliyor.
- Seçenekler:
  - «Можно оставить на ресепшене»
  - «Сюрприз (не предупреждать)»
  - «Не называть отправителя»
  - «Позвонить мне перед доставкой»
  - «Текст открытки»
- Telefonlar ülke koduyla giriliyor.

İçerikte müşteriye söylenenler:
- Gereken bilgiler: otel adı, misafirin rezervasyondaki tam adı, varsa oda numarası, misafirin telefonu.
- Teslim resepsiyona yapılır; odaya çıkarma yalnız otel izin verirse. **Garanti yok.**

Kurallar:
- **Gerçek otel adı kullanılmadı.** Çiçek kabul ettikleri doğrulanamadı ve ortaklık iması riski var.
- Yalnız semt ve landmark adları geçiyor (Таксим, Галата, Султанахмет, Нишанташи…).

**Bulgu:** RU `hotel-delivery` ve `hospital-delivery` kayıtları yok, iki sayfa da bugün 404. EN `hotel-delivery` var (yalnız EN). Taslaklar `niyet-sayfalari.json`'da.

**Küçük öneri (kod/sözlük, onaya bağlı):** RU adres placeholder'ında otel geçmiyor:
- Bugün: «Введите район, улицу, больницу, школу, ТЦ или адрес».
- Öneri: «…, отель, больницу…».

## 3. Teslimat vaatleri: motorla karşılaştırma
Kaynak, checkout'un kullandığı motor kararı: Maltepe şubesinden yol mesafesi + bantlar.

| Sınıf | İlçe | Kural | Yeni metin |
|---|---|---|---|
| in (≤40 km) | 28 | Aynı gün mümkün. Cutoff: 0–7 km 20:00, 7–15 km 19:00, 15–25 km 18:00, 25–45 km 17:00 | «При заказе до HH:00 по стамбульскому времени доставка возможна в тот же день; интервалы — при оформлении» |
| mixed (40–55 km) | 5: Avcılar, Başakşehir, Esenyurt, Küçükçekmece, Sultangazi | Adrese göre | «проверяется по точному адресу при оформлении»; kesin aynı gün yok |
| far (>55 km) | 6: Arnavutköy, Beylikdüzü, Büyükçekmece, Çatalca, Şile, Silivri | 45–150 km özel araç bandı: ürün ≥ 2.500 ₺, cutoff 12:00; diğerleri kargo 1–3 iş günü | «в тот же день» yazılmadı; 2.500 ₺ / 12:00 / 1–3 gün |

- **Mevcut RU sayfalarıyla karşılaştırma:** sınıflar motorla uyumlu (28/5/6). Asıl sorun, 25.08 tarihli "in" şablonlarının cutoff saatsiz ve koşulsuz «в тот же день» demesi. Yeni metinlerin hepsi saatli ve koşullu.
- **Operasyonun teyit etmesi gerekenler:**
  - **Adalar:** motor 7 km / 20:00 "in" diyor, ama vapur lojistiği var. TR sayfası saat vaat etmiyor.
  - **Beykoz:** kuzey köyleri için TR metni temkinli.

## 4. Dil bilgisi ve kalıp düzeltmeleri
| Mevcut | Düzeltme |
|---|---|
| «до ежедневного крайнего срока» (41 sayfa) | «до HH:00 по стамбульскому времени» |
| «мы охотно принимаем заказ и из-за рубежа» (16) | «Заказ можно оформить из любой страны» |
| «вашей собственной картой» (12) | «картой, выпущенной в вашей стране» |
| «оформление заказа покажет» (18) | «при оформлении вы увидите» |
| «Мы никогда не обещаем того, что адрес не может получить» (6) | «Мы показываем только те варианты доставки, которые реально доступны для адреса» |
| «фото-подтверждение» | «по запросу пришлём фото букета перед отправкой» |
| «во все 24/43/22/62 кварталов» | «во все 24 квартала / 43 квартала / 22 квартала / 62 квартала» |
| Şehir sayfası: «…районы… подтверждаются адрес за адресом» | «…в пограничных районах возможность доставки проверяется по каждому адресу» |
| «5.levent» | «5. Левент (5. Levent)», kaynak veri düzeltilmeli |

## 5. 39 ilçe: özgünlük ve kalite (otomatik QA)
- **Ana ifade:** 39/39 H1 ve title'da «Доставка цветов в …» var.
- **Benzersizlik:** title, H1 ve meta 39/39 benzersiz; title ≤ 65 karakter, meta 140–160.
- **Benzerlik:** kelime düzeyinde en yüksek 0,32 (Pendik–Tuzla), ortalama 0,15. Eski şablonlarda grup içi benzerlik 1,00'dı.
  - Ortak cümleler yalnız zorunlu teslimat cümlesi ve 2 ilçede tekrarlanan bir otel cümlesi.
- **Yer adları:** Kiril, ilk geçişte Türkçe parantez içinde.
- **Otel ve teslimat:** her ilçede otel paragrafı ve resepsiyon seçeneği var; teslimat cümlesi sınıfa uygun. Far ilçelerde aynı gün vaadi yok (yalnız "vaat etmiyoruz" şeklinde olumsuz SSS cevabı).
- **Linkler:** hepsi geçerli. Kategoriler izinli listeden; mahalle ve ilçe linkleri `ru-gecis-haritasi.csv`'de.
- **Kaynak:** yerel bilgiler TR ilçe sayfalarından (insan yazımı). Bazı otel yoğunluğu ifadeleri genel bilgiye dayanıyor (Bakırköy, Pendik, Sarıyer, Şişli, Ümraniye, Üsküdar, Zeytinburnu, Tuzla) ve `editor_notu` alanında işaretli.
- **Hastane adı yazılmadı.**

## 6. Gerçek komşu mahalle doğrulaması
- **Mevcut RU listeleri yanlış:** 70 listenin 49'u ilçenin alfabetik ilk 3 mahallesi.
  - Ç ve Ş ile başlayanlar atlanıyor (Kağıthane'de Çağlayan ve Çeliktepe yok).
  - Aynı ilçedeki her mahalle aynı listeyi gösteriyor.
- **Doğru kaynak (mevcut veri):** TR SEO mahalle ve ilçe sayfalarındaki elle yazılmış iç linkler. Örnek: Caferağa → Osmanağa, Rasimpaşa.
  - 39 ilçede bu linkler çıkarıldı ve yeni metinler yalnız bunları kullanıyor.
  - Mahalle düzeyi için aynı yöntem önerilir; 975 TR sayfasının iç linkleri admin tarafında toplu okunabilir.
  - İkinci kaynak: `neighborhoods.latitude/longitude` (DB) ile en yakın 3 mahalle. Admin yetkisi gerekir, public endpoint yok.
- **Veri tuhaflığı:** `kucukcekmece-ikitelliosb-mah` slug'ı TR kaynağından geliyor. URL dondurulduğu için değiştirilmedi.

## 7. 975 mahalle: kopyasız uygulama planı (mevcut CMS)
Hedef, ad değiştirerek çoğaltılmış metin üretmemek. Mahalleler önceliğe göre üç kademeye ayrılır.

**Kademe 1, elle yazılır (yaklaşık 60–80 mahalle):**
- Otel, hastane ve iş merkezi yoğun mahalleler. Örnekler:
  - Beyoğlu: Kocatepe, Bereketzade, Asmalı Mescit, Cihangir
  - Fatih: Sultanahmet çevresi
  - Şişli: Harbiye, Mecidiyeköy
  - Beşiktaş: Levent, Etiler
  - Kadıköy: Caferağa, Suadiye, Acıbadem, Kozyatağı
  - Bakırköy: Ataköy
- TR mahalle sayfası kaynak alınır. İlçe metinleri gibi özgün yazılır ve aynı QA'dan geçer.

**Kademe 2, veri odaklı kısa sayfa (yaklaşık 400):**
- İçerik:
  - Kiril ad
  - Gerçek komşular (TR iç linklerinden)
  - O mahallenin motor kararı (reach/cutoff, `/reach?neighborhood=`)
  - TR sayfasından 1–2 yerel ayrıntı
  - İlçe sayfasına güçlü link
- Ortak cümle oranı ölçülür; ilçe benzerliği 0,5 üstündeyse yayınlanmaz.

**Kademe 3, yerel bilgisi olmayan mahalleler:**
- İçerik zenginleşene kadar mevcut kaydın `indexable` bayrağıyla değerlendirilir (bayrak CMS'de zaten var).
- URL ve sitemap mantığı değişmez. Yalnız onaylı karar uygulanır; noindex kararı ayrıca onaya sunulur.

Uygulama yolu (onaydan sonra):
- Mevcut Admin global_pages düzenleyicisi veya mevcut toplu güncelleme. Yeni endpoint yok.
- Her kademe ayrı onay ve preview kontrolüyle ilerler.

## 8. Preview geçerliliği (yeniden doğrulandı)
- Son preview `dpl_Nyu5pWJsFdmWzsxACGMi7cYZd9Wv` (`7c3981a`). Bu görevde kod değişmedi; yalnız dokümanlar.
- RU mahalle sayfası: 200, self-canonical, 15 hreflang, 50 ürün.
- RU sitemap: 1.015 ticari / 0 eski.
- Birim testleri 1.080/1.080; buna 1.015 adreslik gerçek middleware 301 testi dahil.

## 9. Açık riskler
- **Hacim ve kanıt:** otel, hastane ve düğün niyetleri için Rusça arama hacmi veya rakip kanıtı bulunamadı.
- **Dil onayı:** anadili Rusça editör onayı şart. Kiril mahalle yazımları ve çekimler (в Чаталджу, в Байрампаша, в Тузлу) `editor_notu` alanında.
- **Teslimat teyidi:** Adalar ve Beykoz için aynı gün iddiası operasyon teyidi istiyor.
- **Otel garantisi yok:** resepsiyonun kabul ve odaya teslim politikası otele bağlı. Metinler bunu açıkça söylüyor.
- **Düğün:** RU'da düğün kategorisi yok. Gelin buketi veya mekân süslemesi vaat edilmedi.
- **Ödeme:** TRY tahsilat ve yurt dışı kart ifadeleri EN otel sayfasıyla uyumlu; ödeme ekibi teyit etmeli.
