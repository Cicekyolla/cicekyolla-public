# AGENTS.md — Çalışma Kuralları

Bu dosya Codex'in bu repoda nasıl davranacağını belirler. Amaç: işi doğru yapmak
ve gereksiz token/kredi harcamamak. Aşağıdaki kurallara HER görevde uy.

## 1. Deploy Disiplini (EN ÖNEMLİ)
- Ben AÇIKÇA "deploy et" / "canlıya al" demedikçe **deploy ETME.**
- Varsayılan davranış: kodu yaz, değişiklikleri göster, DUR ve onay bekle.
- Ben onayladıktan sonra deploy'u **tek seferde** yap. Her küçük değişiklikte
  ayrı deploy tetikleme.
- Test/deneme amaçlı değişiklikleri canlıya değil, mümkünse preview/local'de dene.

## 2. Değişiklikleri Topla
- Birden çok küçük değişiklik istediğimde hepsini **tek turda** yap, ayrı ayrı
  tur açma.
- Her adımda baştan dosya taramak yerine, o görev için gereken minimum dosyayla
  çalış.

## 3. Kapsamı Dar Tut
- Sadece istenen dosya/fonksiyonu değiştir. İstenmeyen dosyalara **dokunma.**
- Yeni dosya/klasör oluşturmadan önce gerçekten gerekli mi diye teyit et.
- Emin olmadığın bir şeyi denemeden önce kısa bir plan söyle, onay bekle.
  Deneme-yanılmayla tur harcama.

## 4. Gereksiz Bağlam Okuma
- Tüm repoyu tarama. Sadece görevle doğrudan ilgili dosyaları oku.
- Aşağıdaki klasörleri okuma/işleme dahil etme:
  - node_modules
  - .next / dist / build / .vercel
  - .git
  - public/ içindeki büyük statik varlıklar (görsel, video vb.)

## 5. Çıktı Kısalığı
- Uzun uzun kodun tamamını tekrar yazma; sadece değişen kısmı göster.
- Gereksiz açıklama yapma, kısa ve net ol.

## 6. Test / Doğrulama
- Deploy'dan önce (istersem) ilgili testleri çalıştır, hepsi geçmeden deploy etme.
- Yeni başarısız test ekleme.

---
NOT: Model seçimi ve "high compute" ayarı bu dosyadan DEĞİL, Codex arayüzündeki
model seçicisinden yapılır. Basit işler için mini/hafif model + normal compute
kullan; Sol + high compute'u sadece gerçekten karmaşık işlerde aç, bitince geri düşür.
