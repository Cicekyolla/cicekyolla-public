# RU 41 kayıt: kuru çalıştırma → 3 kayıt pilot → 38 kayıt (15 Eki 2026)

Durum: **HAZIR, ONAY BEKLİYOR.** Bu dosya canlı CMS yazma veya deploy onayı değildir. RU ticari URL bayrağı açılmaz. Merge ve production deploy yapılmaz.

## Çalıştırılacak dosya

`docs/global-istanbul-url-gecis/ru-icerik/uygula/ru-icerik-uygula.js`

Değiştirilecek ayarlar yalnız 13. ve 14. satırdadır:

```js
const STAGE = "dry";     // "dry" → "pilot" → "rest"
const API_ORIGIN = "";   // Admin API'yi kendi alan adındaki /api üzerinden çağırıyorsa ""
```

- **PAYLOAD'a dokunmayın.** 41 kayıt sabittir. Pilot ve kalan kayıt ayrımını betik kendi yapar.
- **Pilot kayıtları:** `hotel-delivery`, `istanbul/kadikoy`, `istanbul/silivri`.

## Ortak hazırlık (her aşamada aynı)

1. Admin paneline **editör veya admin** hesabıyla giriş yapın.
2. Aynı sekmede Global sayfalar ekranını açın. DevTools → Network sekmesinde `/api/admin/global/pages` isteğinin hangi alan adına gittiğine bakın.
   - Admin alan adıyla aynıysa `API_ORIGIN = ""` kalır.
   - Farklıysa `API_ORIGIN` o adres olur (ör. `https://...`), sonunda `/` olmaz.
3. DevTools → Console'u açın. Chrome yapıştırmayı engellerse bir kez `allow pasting` yazın.
4. Dosyanın **tamamını** yapıştırın ve Enter'a basın.

## Aşama 1: `STAGE = "dry"` (yazma yok)

- 41 kaydı okur ve `ru-icerik-yedek-dry-<zaman>.json` dosyasını indirir. **Hiçbir şey yazmaz.**
- **Beklenen çıktı:** `AŞAMA: dry — 41 kayıt`, 41 satırlık plan tablosu ve `DRY_RUN: hiçbir şey yazılmadı (41 kayıt okundu)`.
- **Tabloda kontrol:**
  - 39 ilçe satırında `mevcut` sütunu `approved/index ...` göstermeli.
  - `hotel-delivery` ve `hospital-delivery` satırları `YOK (yeni kayıt)` göstermeli.
- **Dur ve bana bildir:**
  - `Yetki yok` (401/403) → editör girişi yok.
  - `API'ye ulaşılamadı` → `API_ORIGIN` yanlış.
  - Bir ilçe `YOK` görünüyor.
- **Yedek dosyasını saklayın.** Bu, 41 kaydın yayın öncesi tam kopyasıdır.

## Aşama 2: `STAGE = "pilot"` (3 kayıt yazılır)

- Yalnız 3 pilot kaydını okur, `ru-icerik-yedek-pilot-<zaman>.json` dosyasını indirir ve sonra yazar.
- **Beklenen çıktı:** 3 satırlık sonuç tablosu ve `Bitti: 3 / 3 yazıldı.`
- **`ATLANDI: bu arada değişmiş (409)` görünürse:** o kayıt ezilmedi. Durun, kaydı kimin değiştirdiğine bakın, sonra aynı aşamayı yeniden çalıştırın.
- **Yazma davranışı:**
  - İlçe kayıtlarının status/indexable alanları gönderilmez.
  - `hotel-delivery` approved ve indexable olarak oluşturulur.

## Pilot sonrası canlı kontrol (ben yaparım; "rest" aşamasından önce)

Önce temel durumu aldım (15 Eki 2026, production dpl_Bai6FoqnpXHKLyM3SPFw5svCRDva):

| URL | Bugün | Pilottan sonra beklenen |
|---|---|---|
| `/ru/hotel-delivery` | 404 | 200, h1 «Доставка цветов в отель в Стамбуле», self-canonical, hreflang en+ru (+x-default), ürün vitrini |
| `/ru/istanbul/kadikoy` | 200, h1 «Отправить цветы в Kadıköy, Стамбул», canonical kendisi, 15 hreflang, 50 ürün linki | 200, yeni h1 «Доставка цветов в Кадыкёй…», canonical ve 15 hreflang aynı, ürünler aynı |
| `/ru/istanbul/silivri` | 200, h1 «Доставка цветов в Silivri (Стамбул)», canonical kendisi, 15 hreflang | 200, yeni h1 «Доставка цветов в Силиври…», canonical ve hreflang aynı |
| `/sitemaps/locale-ru.xml` | 4.387 URL; 1.015 İstanbul URL'si eski biçimde (bayrak kapalı) | 4.388 URL (`/ru/hotel-delivery` eklenir), diğerleri aynı |
| `/istanbul/kadikoy` (TR) | 200, h1 «Kadıköy Çiçekçi — Çiçek Siparişi ve Gönderimi», canonical `/kadikoy-cicek-siparisi` | **Değişmez** |
| `/en/hotel-delivery` | 200 | **Değişmez** (hreflang'a `ru` eklenir) |

Ayrıca kontrol edilecekler:

- Sayfa içi linkler 200 dönmeli.
- Otel sayfasındaki kategori linkleri vitrine, sepete ve ödeme adımına kadar açılmalı.

PayTR'de ödeme veya test siparişi oluşturulmaz.

Cache nedeniyle yeni içerik birkaç dakika gecikebilir. Kontrol bu süre sonunda yapılır.

**Herhangi bir sapma olursa** "rest" aşamasına geçilmez ve pilot geri alınır.

## Aşama 3: `STAGE = "rest"` (38 kayıt yazılır, ayrı onayla)

- Pilot dışındaki 38 kaydı okur, `ru-icerik-yedek-rest-<zaman>.json` dosyasını indirir ve yazar.
- **Pilot kayıtları bu aşamada ne okunur ne yazılır.**
- **Beklenen çıktı:** `Bitti: 38 / 38 yazıldı.`
- **Sonrasında kontrol:**
  - 39 ilçe sayfası 200 dönmeli.
  - `/ru/hospital-delivery` 200 dönmeli ve sitemap'te görünmeli (4.389 URL).
  - Satış metinleri, ödeme ifadeleri ve sipariş akışı ödeme sayfasına kadar çalışmalı.

## Geri alma (her aşamaya hazır)

Dosya: `uygula/geri-al.js`.

1. `API_ORIGIN` değerini aynı ayarla girin.
2. `YEDEK = [...]` kısmına o aşamanın yedek dosyasının içeriğini yapıştırın.
3. Önce `DRY_RUN = true` ile çalıştırıp planı görün, sonra `DRY_RUN = false` ile çalıştırın.

| Ne geri alınacak | Kullanılacak yedek |
|---|---|
| Yalnız pilot | `ru-icerik-yedek-pilot-*.json`: 2 ilçe eski hâline döner, `hotel-delivery` silinir (yeniden 404) |
| Yalnız kalan 38 kayıt | `ru-icerik-yedek-rest-*.json` |
| Tamamı | Önce rest yedeği, sonra pilot yedeği. `dry` yedeği 41 kaydın tam kopyası olarak elde kalır |

Yedekte boş (null) olan alanlar `clear` ile boşaltılır. Status ve indexable alanları da eski hâline döner.

## Simülasyonla doğrulandı (sahte API, 21/21 PASS)

| Aşama | Doğrulanan davranış |
|---|---|
| `dry` | 41 GET, yazma yok, 41 kayıtlık yedek (2'si yeni kayıt, null) |
| `pilot` | Tam 3 PUT; Adalar'a dokunulmadı; ilçe status/indexable korundu; EN kaydı etkilenmedi; yedek 3 kayıt |
| `rest` | Tam 38 PUT; pilot kayıtları okunmadı ve yazılmadı |
| Eşzamanlı düzenleme | 409 alan kayıt atlandı, ezilmedi |
| Geçersiz STAGE | Hiç istek gönderilmedi |
| Geri alma | Rest+pilot yedekleriyle başlangıç durumuna tam dönüş: null meta dahil, yeni niyet sayfaları silindi |
