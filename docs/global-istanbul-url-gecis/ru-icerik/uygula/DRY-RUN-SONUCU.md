# RU 41 kayıt: DRY-RUN sonucu (15 Eki 2026, 06:39–06:41 UTC)

Durum: **BAŞARILI. Hiçbir canlı veri değiştirilmedi.**

## Yöntem

- **Okuma kaynağı:** yalnız okuma, herkese açık API `GET /api/public/global/page?locale=ru&key=…` (41 istek) ve `GET /api/public/global/pages-inventory?locale=ru` (1 istek).
- **Yazma:** Admin oturumu, Console veya yazma ucu kullanılmadı.
- **Yedek:** `ru-icerik-yedek-dry-2026-10-15.json` (41 kayıt, `geri-al.js` biçiminde).

## Sonuç

| Kontrol | Sonuç |
|---|---|
| Okunan kayıt | 41 / 41 |
| Güncellenecek ilçe | 39 (hepsi canlıda `approved` + `index`) |
| Yeni oluşturulacak | 2 (`hotel-delivery`, `hospital-delivery`; bugün yok, `/ru/hotel-delivery` 404) |
| Envanter ile `updated_at` | 39 / 39 aynı, arada değişiklik yok |
| Canlıda doğrulanmamış kart vaadi içeren kayıt | 39 / 39 («Visa/Mastercard из-за рубежа», «международная карта»); yeni metin bunları kaldırıyor |
| Gerçek yedekle tam prova (sahte API) | 21 / 21: dry 41 okuma, pilot 3 yazma, rest 38 yazma, 409 koruması, geri alma |

## Kayıt planı

| # | Anahtar | İşlem | Canlı durum | Son güncelleme | Şimdiki H1 | Yeni H1 |
|---|---|---|---|---|---|---|
| 1 | `istanbul/adalar` | GÜNCELLE | approved/index | 2026-08-25 | Доставка цветов в Adalar (Стамбул) | Доставка цветов на Принцевы острова, Стамбул |
| 2 | `istanbul/arnavutkoy` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в Arnavutköy (Стамбул) | Доставка цветов в Арнавуткёй, Стамбул |
| 3 | `istanbul/atasehir` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Ataşehir — доставка в тот же день | Доставка цветов в Аташехир, Стамбул |
| 4 | `istanbul/avcilar` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в район Avcılar (Стамбул) | Доставка цветов в Авджылар, Стамбул |
| 5 | `istanbul/bagcilar` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Bağcılar — доставка в тот же день | Доставка цветов в Багджылар, Стамбул |
| 6 | `istanbul/bahcelievler` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Bahçelievler — доставка в тот же день | Доставка цветов в Бахчелиэвлер, Стамбул |
| 7 | `istanbul/bakirkoy` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Bakırköy — доставка в тот же день | Доставка цветов в Бакыркёй, Стамбул |
| 8 | `istanbul/basaksehir` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в район Başakşehir (Стамбул) | Доставка цветов в Башакшехир, Стамбул |
| 9 | `istanbul/bayrampasa` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Bayrampaşa — доставка в тот же день | Доставка цветов в Байрампаша, Стамбул |
| 10 | `istanbul/besiktas` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Beşiktaş, Стамбул | Доставка цветов в Бешикташ, Стамбул |
| 11 | `istanbul/beykoz` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Beykoz, Стамбул | Доставка цветов в Бейкоз, Стамбул |
| 12 | `istanbul/beylikduzu` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в Beylikdüzü (Стамбул) | Доставка цветов в Бейликдюзю, Стамбул |
| 13 | `istanbul/beyoglu` | GÜNCELLE | approved/index | 2026-08-25 | Доставка цветов в Beyoğlu (Стамбул) | Доставка цветов в Бейоглу, Стамбул |
| 14 | `istanbul/buyukcekmece` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в Büyükçekmece (Стамбул) | Доставка цветов в Бююкчекмедже, Стамбул |
| 15 | `istanbul/catalca` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в Çatalca (Стамбул) | Доставка цветов в Чаталджу, Стамбул |
| 16 | `istanbul/cekmekoy` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Çekmeköy, Стамбул | Доставка цветов в Чекмекёй, Стамбул |
| 17 | `istanbul/esenler` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Esenler, Стамбул | Доставка цветов в Эсенлер, Стамбул |
| 18 | `istanbul/esenyurt` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в район Esenyurt (Стамбул) | Доставка цветов в Эсеньюрт, Стамбул |
| 19 | `istanbul/eyupsultan` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Eyüpsultan, Стамбул | Доставка цветов в Эюпсултан, Стамбул |
| 20 | `istanbul/fatih` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Fatih — доставка в тот же день | Доставка цветов в Фатих, Стамбул |
| 21 | `istanbul/gaziosmanpasa` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Gaziosmanpaşa, Стамбул | Доставка цветов в Газиосманпаша, Стамбул |
| 22 | `istanbul/gungoren` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Güngören — доставка в тот же день | Доставка цветов в Гюнгёрен, Стамбул |
| 23 | `istanbul/kadikoy` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Kadıköy, Стамбул | Доставка цветов в Кадыкёй, Стамбул |
| 24 | `istanbul/kagithane` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Kağıthane, Стамбул | Доставка цветов в Кягытхане, Стамбул |
| 25 | `istanbul/kartal` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Kartal, Стамбул | Доставка цветов в Картал, Стамбул |
| 26 | `istanbul/kucukcekmece` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в район Küçükçekmece (Стамбул) | Доставка цветов в Кючюкчекмедже, Стамбул |
| 27 | `istanbul/maltepe` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Maltepe, Стамбул | Доставка цветов в Мальтепе, Стамбул |
| 28 | `istanbul/pendik` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Pendik — доставка в тот же день | Доставка цветов в Пендик, Стамбул |
| 29 | `istanbul/sancaktepe` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Sancaktepe, Стамбул | Доставка цветов в Санджактепе, Стамбул |
| 30 | `istanbul/sariyer` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Sarıyer — доставка в тот же день | Доставка цветов в Сарыер, Стамбул |
| 31 | `istanbul/sile` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в Şile (Стамбул) | Доставка цветов в Шиле, Стамбул |
| 32 | `istanbul/silivri` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в Silivri (Стамбул) | Доставка цветов в Силиври, Стамбул |
| 33 | `istanbul/sisli` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Şişli — доставка в тот же день | Доставка цветов в Шишли, Стамбул |
| 34 | `istanbul/sultanbeyli` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Sultanbeyli — доставка в тот же день | Доставка цветов в Султанбейли, Стамбул |
| 35 | `istanbul/sultangazi` | GÜNCELLE | approved/index | 2026-09-25 | Доставка цветов в район Sultangazi (Стамбул) | Доставка цветов в Султангази, Стамбул |
| 36 | `istanbul/tuzla` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Tuzla — доставка в тот же день | Доставка цветов в Тузлу, Стамбул |
| 37 | `istanbul/umraniye` | GÜNCELLE | approved/index | 2026-08-25 | Отправить цветы в Ümraniye, Стамбул | Доставка цветов в Умрание, Стамбул |
| 38 | `istanbul/uskudar` | GÜNCELLE | approved/index | 2026-08-25 | Цветы в Üsküdar — доставка в тот же день | Доставка цветов в Ускюдар, Стамбул |
| 39 | `istanbul/zeytinburnu` | GÜNCELLE | approved/index | 2026-08-25 | Доставка цветов в Zeytinburnu (Стамбул) | Доставка цветов в Зейтинбурну, Стамбул |
| 40 | `hotel-delivery` | YENİ | yok | - | — | Доставка цветов в отель в Стамбуле |
| 41 | `hospital-delivery` | YENİ | yok | - | — | Доставка цветов в больницу в Стамбуле |
