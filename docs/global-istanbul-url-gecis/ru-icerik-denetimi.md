# RU lokasyon sayfaları içerik denetimi (ÇiçekYolla, İstanbul)

Kapsam: 39 ilçe + 31 mahalle örneği (CSV'deki mahalle satırlarından her 32.si) + şehir sayfası `istanbul`. Kaynak: `GET /api/public/global/page?locale=ru&key=…` (15 Ekim 2026). Ham veri denetim oturumunda tutuldu (71 anahtar; repoya eklenmedi). Alanlar: h1, seo_title, meta_description, intro_html, content_html, faq, updated_at. Metinlerin hepsi API yanıtlarından alındı. Aynı şablondaki sayfalar şablon ve parametreler kullanılarak kaydedildi ve birebir doğrulandı. Arama hacmi verisi kullanılmadı.

## a) Şablon tespiti

Normalizasyon: ilçe/mahalle adı, 3'lü mahalle listesi, mahalle sayısı ve (mahallede) "европейском/азиатском" kelimesi yer tutucuya çevrildi. Ardından difflib ile >0,90 eşiğinde gruplandı.

**İlçeler: 39 sayfanın 39'u şablon. Benzersiz ilçe sayfası yok (0).** Her grubun içindeki metin, normalizasyondan sonra **birebir aynı** (benzerlik oranı 1,00).

| Şablon | H1 kalıbı | Sayfa | İlçeler |
|---|---|---|---|
| A "en sık" | Доставка цветов в X (Стамбул) | 3 | Adalar, Beyoğlu, Zeytinburnu |
| B | Цветы в X — доставка в тот же день | 13 | Ataşehir, Bağcılar, Bahçelievler, Bakırköy, Bayrampaşa, Fatih, Güngören, Pendik, Sarıyer, Şişli, Sultanbeyli, Tuzla, Üsküdar |
| C | Отправить цветы в X, Стамбул | 12 | Beşiktaş, Beykoz, Çekmeköy, Esenler, Eyüpsultan, Gaziosmanpaşa, Kadıköy, Kağıthane, Kartal, Maltepe, Sancaktepe, Ümraniye |
| F uzak | Доставка цветов в X (Стамбул) / 1–3 дня | 6 | Arnavutköy, Beylikdüzü, Büyükçekmece, Çatalca, Silivri, Şile |
| Bo sınır | Доставка цветов в район X (Стамбул) | 5 | Avcılar, Başakşehir, Esenyurt, Küçükçekmece, Sultangazi |

- Gruplar arasındaki benzerlik 0,05–0,31 arasında. Yani metin farkı yalnızca 5 şablon arasında var, ilçeye özgü içerik yok. Bir ilçe sayfasında yer adı, 3 mahalle adı ve sayı dışında hiçbir yerel bilgi bulunmuyor: semt karakteri, hastaneler, landmark'lar, teslimat notları yok. A/B/C metinleri çok kısa: yaklaşık 2 paragraf ve 1 SSS.
- A, B ve C şablonlarının üçü de aynı "aynı gün" teslimat sınıfına ait. Hangi ilçenin hangi şablonu aldığına dair bir mantık görünmüyor. A'daki "один из районов Стамбула, куда мы доставляем чаще всего" iddiası rastgele 3 ilçeye (Adalar dahil) dağıtılmış.

**Mahalleler (31 örnek): 31'in 31'i şablon, 0 benzersiz.** 5 grup var:

| Şablon | H1 | Sayfa |
|---|---|---|
| M1 "yurt dışı" | Доставка цветов в N (D) | 4 (Burgazada, Türkali, Piyalepaşa, Çağlayan) |
| M2 "aynı gün" | Отправить цветы в N, D | 13 |
| M3 "mağaza" | Цветы в N — D, Стамбул | 4 (Mahmutşevketpaşa, Binbirdirek, Mecidiyeköy, Atatürk) |
| MF uzak | Отправить цветы в N, D | 6 |
| MB sınır | Отправить цветы в N, D | 4 |

- Mahallenin şablonu ilçesinin şablonuyla tutarlı değil. Örnek: Fatih (B) altında Binbirdirek M3 ile, Sarıdemir M2 ile üretilmiş. Örneklem 975 mahallenin yaklaşık %3'ü. Oran korunursa tüm mahalle sayfaları birkaç şablonun kopyası olmalı.

## b) Olgusal tutarlılık

Şehir sayfası politikası şöyle: `"В дальние районы (Arnavutköy, Beylikdüzü, Büyükçekmece, Çatalca, Silivri, Şile) заказы едут курьером с отслеживанием за 1–3 рабочих дня"`. Sınır ilçeler için: `"…подтверждаются адрес за адресом при оформлении"`.

- **Uzak 6 ilçe ve 6 uzak mahalle örneği:** "в тот же день" hiç geçmiyor (0). 1–3 iş günü vurgusu tutarlı, politikayla **çelişki yok**. Bu sayfalar 25.09.2026 güncellemesinde düzeltilmiş.
- **Sınır 5 ilçe ve 4 sınır mahalle örneği:** "в тот же день" 3–4 kez geçiyor, ama her seferinde koşullu (`"курьер в тот же день там, куда доходят наши зоны, иначе курьером за 1–3 дня — подтверждается при оформлении"`). **Çelişki yok.**
- **Kalan riskler (doğrulanmalı):**
  - A/B/C ilçe şablonlarında ve M1/M2/M3 mahalle şablonlarında (son güncelleme 25.08.2026, politikadan eski) aynı gün koşulsuz vaat ediliyor: `"Заказ до ежедневного крайнего срока — букет доставляется в Beykoz в тот же день."` Bu ifade Beykoz, Sarıyer, Eyüpsultan, Çekmeköy, Tuzla, Pendik ve Sultanbeyli gibi şehir dışına uzanan köy/mahallelere de uygulanıyor (Beykoz-Riva, Sarıyer-Kilyos, Eyüpsultan-Ağaçlı vb.). Şehir sayfası aynı günü yalnızca "в пределах наших курьерских зон" diye sınırlıyor. Bu ilçelerin tamamı zone içindeyse sorun yok, değilse çelişki var. Adalar'da (vapur) da koşulsuz `"доставка в тот же день в Burgazada, Heybeliada, Kınalıada"` vaadi var. Kesim saati hiçbir sayfada belirtilmiyor.
  - Beşiktaş ve Türkali sayfaları komşu olarak "Arnavutköy" mahallesini sayıyor. Rus okur bunu uzak ilçe Arnavutköy (1–3 gün) ile karıştırabilir. Benzer şekilde Silivri/Kavaklı İstiklal sayfası komşu olarak "Kadıköy" diyor (Silivri'deki köy).
- **"Соседние кварталы" listeleri:**
  - A/B/C ilçe şablonlarında (28 sayfa) ve M1/M2/M3 mahalle şablonlarında (21 örnek) liste, ilçedeki mahallelerin Unicode/kod noktası sırasına göre **alfabetik ilk 3**'ü. Sayfanın kendi mahallesi hariç tutuluyor. Türkçe özel harfle başlayan adlar (Ç, Ş, İ, Ü, Ağ…) sona düştüğü için atlanıyor. Kanıtlar: Kağıthane'de Çağlayan ve Çeliktepe atlanıp `"Emniyet Evleri, Gültepe, Gürsel"` seçilmiş. Bağcılar'da Bağlar yerine "Barbaros" var. Bayrampaşa'da İsmetpaşa yerine "Kartaltepe" var. Kartal'da Çavuşoğlu atlanmış.
  - Bunun sonucu olarak aynı ilçedeki her mahalle aynı "komşuları" gösteriyor. Fatih'te Binbirdirek ve Sarıdemir sayfalarının ikisi de `"Aksaray, Akşemsettin, Alemdar"` diyor. Ümraniye'de Atatürk ve Yukarı Dudullu sayfalarının ikisi de `"Adem Yavuz, Altınşehir, Armağanevler"` diyor. Eyüpsultan'da Çırçır sayfası `"5.levent, Akpınar, Akşemsettin"` gösteriyor.
  - Bu listeler gerçek komşuluk değil. **70 komşu listesinin 49u alfabetik.**
  - F/Bo ilçe sayfalarında liste "включая" ile verilmiş bir örnekleme (ilk–orta–son). Bu kabul edilebilir.
  - MF/MB mahalle sayfalarındaki listeler (ör. Geredeli: `"Korucu, Yeniköy и Bucaklı"`, Uğur Mumcu: `"Cebeci, Gazi и Yunus Emre"`) alfabetik değil ve gerçek komşulara benziyor, ama doğrulanmadı.
- F/Bo sayfalarındaki mahalle sayıları CSV ile 11/11 uyumlu.

## c) Dil kalitesi (öneriler anadili Rusça editör onayı gerektirir)

| Mevcut ifade (sayfa sayısı) | Sorun | Öneri |
|---|---|---|
| «до ежедневного крайнего срока» (25), «до нашего ежедневного крайнего срока» (16) | kalk, bürokratik | «при заказе до 15:00 по стамбульскому времени» (saati yazın) / «если успеете оформить заказ до …» |
| «Для района Beşiktaş мы охотно принимаем заказ и из-за рубежа» (16) | kalk, doğal değil | «Заказать доставку в Бешикташ можно из любой страны» |
| «вашей собственной картой» (12) | gereksiz «собственной» | «картой любого банка» / «картой, выпущенной в вашей стране» |
| Şehir: «Пограничные районы … подтверждаются адрес за адресом при оформлении»; FAQ: «оформление подтверждает адрес за адресом» | dilbilgisi/özne hatası: ilçe "onaylanmaz" | «Для пограничных районов возможность доставки проверяется для каждого адреса при оформлении заказа» |
| «во все 24 его кварталов» (Büyükçekmece), «во все 43 кварталов» (Esenyurt), «22 кварталов» (Küçükçekmece), «62 его кварталов» (Şile) | sayı uyumu hatası, sayfa başına 2 kez | «24 квартала», «43 квартала», «22 квартала», «62 квартала». Şablonda 2-3-4 ile biten sayılar için plural kuralı gerekli |
| «оформление заказа покажет / показывает оформление заказа» (18), «Оформление заказа принимает только то, что может доехать…» | kişileştirme, kalk | «при оформлении заказа вы увидите…», «при оформлении доступны только товары, которые можно доставить по этому адресу» |
| «Мы никогда не обещаем того, что адрес не может получить» (6) | anlamsız/kalk | «Мы не обещаем того, что не сможем выполнить для вашего адреса» |
| «товары, пригодные к пересылке» (16) | resmi/hantal | «товары, которые можно отправить курьерской службой» |
| «курьером с отслеживанием» | eksik | «курьерской службой с трек-номером» |
| «фото-подтверждение включено» (17) | yazım (tek kelime) ve kalk | «фотоотчёт перед вручением — бесплатно» |
| «фото реально собранного букета» (17) | konuşma dili | «фото именно вашего букета перед доставкой» |
| «Кварталы вроде …» (13) | «вроде» günlük dil | «такие кварталы, как …» |
| «Частные адреса, офисы и кабинеты» (M3) | «кабинеты» belirsiz | «квартиры, офисы, клиники» |
| «Международная карта принимается, личное сообщение вкладывается в открытку» | telgraf üslubu, edilgen | «Оплата международной картой; ваше пожелание мы напечатаем на открытке» |
| «5.levent» (Eyüpsultan + Çırçır) | veri hatası | «5. Levent» |

**Yer adları:** 71 sayfanın hiçbirinde Kiril yer adı yok. Kiril olarak yalnızca «Стамбул» geçiyor. 53/71 H1'de Türkçe özel harf var (ş, ı, ğ, ç, ü, ö), örneğin «Отправить цветы в Kadıköy, Стамбул». Rusça arayan kullanıcı çoğunlukla Kiril yazar (Кадыкёй, Бешикташ, Ускюдар, Шишли, Бейоглу, Фатих, Аташехир, Сарыер, Бейликдюзю…). Öneri: H1, title ve ilk paragrafta Kiril formu, ilk geçişte Latin parantez içinde: «Доставка цветов в Кадыкёй (Kadıköy), Стамбул». Latin ad Rusça çekime de girmiyor («в Beşiktaş»), Kiril ad girer («в Бешикташе» veya «в район Бешикташ»). Mahalle adlarında da en azından tanınmış olanlar (Мечидиеккёй, Бостанджи, Аджыбадем, Левент, Ататюрк) Kirilleştirilmeli.

## d) Anahtar kelime uyumu ("Доставка цветов в …")

| | Доставка цветов в | Доставка цветов в район | Отправить цветы в | Цветы в | Цветочный магазин с доставкой в | Diğer |
|---|---|---|---|---|---|---|
| İlçe H1 (39) | 9 | 5 | 12 | 13 | – | – |
| İlçe title (39) | 3 | – | 12 | 11 | 13 | – |
| Mahalle H1 (31) | 4 | – | 23 | 4 | – | – |
| Mahalle title (31) | 0 | – | 13 | – | 4 | «Доставка цветов: N…» 4, «Доставка цветов N…» 6, «Цветы N…» 4 |

- Hedef URL kalıbı (`/ru/dostavka-tsvetov-…`, CSV `onerilen_ticari_url`) "Доставка цветов" ifadesini birincil anahtar olarak varsayıyor. Ama ilçe H1'lerinin yalnızca 14/39'u, ilçe title'larının 3/39'u ve mahalle title'larının 0/31'i tam "Доставка цветов в …" ile başlıyor.
- Aynı ilçe için title ve H1 farklı kalıplar kullanıyor (B şablonu: H1 «Цветы в X — доставка в тот же день», title «Цветочный магазин с доставкой в X»).
- Öneri: tüm ilçe ve mahalle H1/title'larında tek kalıp kullanın. İlçe için «Доставка цветов в {Kiril} ({Latin}), Стамбул», mahalle için «Доставка цветов в {N}, {D} — Стамбул». "Отправить цветы", "в тот же день", "1–3 дня" gibi ifadeler ikincil olarak title'ın sonunda veya meta açıklamada kalsın.

## Öncelik sırası

1. İlçe ve mahalle sayfaları için şablonları birleştirip lokal içerik eklemek (39/39 ilçe şablon, ilçeye özgü içerik yok).
2. Kiril yer adlarını H1, title ve metne eklemek.
3. H1 ve title'ları "Доставка цветов в …" kalıbında standardize etmek.
4. Alfabetik "соседние кварталы" listelerini gerçek komşularla değiştirmek ya da kaldırmak.
5. Sayı uyumu hatalarını (24/43/22/62 кварталов) ve «адрес за адресом» cümlesini düzeltmek, kalk ifadeleri sadeleştirmek.
6. A/B/C ve M1/M2/M3 sayfalarındaki koşulsuz aynı gün vaadini kurye bölge haritasıyla doğrulamak, kesim saatini yazmak.
