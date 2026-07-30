export interface SiteMapCategory {
  title: string;
  slug: string;
  desc: string;
  section: string;
  isPage?: boolean;
}

export const categories: SiteMapCategory[] = [
  { title: "Çiçekler", slug: "cicekler", desc: "Mevsimin en taze çiçeklerini ve özel tasarım aranjmanları keşfedin.", section: "Koleksiyonlar" },
  { title: "Güller", slug: "guller", desc: "Kırmızı, pembe, beyaz ve her renkte taze gül buketleri; aşkın en güzel ifadesi.", section: "Koleksiyonlar" },
  { title: "Kırmızı Gül Buketleri", slug: "kirmizi-gul-buketleri", desc: "Romantik anlara özel, etkileyici kırmızı gül buketleri.", section: "Koleksiyonlar" },
  { title: "Beyaz Gül Buketleri", slug: "beyaz-gul-buketleri", desc: "Zarafeti ve saf duyguları yansıtan beyaz gül buketleri.", section: "Koleksiyonlar" },
  { title: "Pembe Gül Buketleri", slug: "pembe-gul-buketleri", desc: "Sevgi dolu anlar için zarif pembe gül tasarımları.", section: "Koleksiyonlar" },
  { title: "Orkideler", slug: "orkideler", desc: "Uzun ömürlü ve sofistike premium orkide çeşitleri.", section: "Koleksiyonlar" },
  { title: "Beyaz Orkide", slug: "beyaz-orkide", desc: "Modern yaşam alanları ve özel hediyeler için beyaz orkideler.", section: "Koleksiyonlar" },
  { title: "Pembe Orkide", slug: "pembe-orkide", desc: "Romantik ve zarif pembe orkide aranjmanları.", section: "Koleksiyonlar" },
  { title: "Buketler", slug: "buketler", desc: "Her duyguya uygun, taptaze ve özenle hazırlanan çiçek buketleri.", section: "Koleksiyonlar" },
  { title: "Premium Buketler", slug: "premium-buketler", desc: "Seçkin çiçeklerle hazırlanan imza niteliğinde premium buketler.", section: "Koleksiyonlar" },
  { title: "Kutuda Çiçekler", slug: "kutuda-cicekler", desc: "Şık kutularda sunulan modern ve kalıcı çiçek tasarımları.", section: "Koleksiyonlar" },
  { title: "Vazoda Çiçekler", slug: "vazoda-cicekler", desc: "Özel vazolarla tamamlanan kullanıma hazır çiçek aranjmanları.", section: "Koleksiyonlar" },
  { title: "Çiçek Aranjmanları", slug: "cicek-aranjmanlari", desc: "Usta floristlerin hazırladığı özgün çiçek aranjmanları.", section: "Koleksiyonlar" },
  { title: "Solmayan Çiçekler", slug: "solmayan-cicekler", desc: "Güzelliğini uzun süre koruyan dekoratif solmayan çiçekler.", section: "Koleksiyonlar" },
  { title: "Saksı Bitkileri", slug: "saksi-bitkileri", desc: "Ev ve ofislere canlılık katan dayanıklı saksı bitkileri.", section: "Koleksiyonlar" },
  { title: "Salon Bitkileri", slug: "salon-bitkileri", desc: "İç mekânlara doğal bir atmosfer kazandıran salon bitkileri.", section: "Koleksiyonlar" },
  { title: "Sukulent ve Kaktüs", slug: "sukulent-ve-kaktus", desc: "Bakımı kolay, dekoratif sukulent ve kaktüs çeşitleri.", section: "Koleksiyonlar" },
  { title: "Teraryumlar", slug: "teraryumlar", desc: "Cam fanuslarda yaşayan, özgün ve minyatür bitki dünyaları.", section: "Koleksiyonlar" },
  { title: "Bonsai", slug: "bonsai", desc: "Dengeyi ve doğanın zarafetini yansıtan bonsai çeşitleri.", section: "Koleksiyonlar" },
  { title: "Yapay Çiçekler", slug: "yapay-cicekler", desc: "Her mevsim kusursuz görünen kaliteli yapay çiçek tasarımları.", section: "Koleksiyonlar" },
  { title: "Yapay Dekorasyon", slug: "yapay-dekorasyon", desc: "Ev, ofis ve işletmeler için kalıcı yapay dekorasyon çözümleri.", section: "Koleksiyonlar" },
  { title: "Çelenkler", slug: "celenkler", desc: "Açılış, tören ve özel anlara uygun gösterişli çelenkler.", section: "Koleksiyonlar" },
  { title: "Düğün & Nikah", slug: "dugun-ve-nikah", desc: "Düğün ve nikâh günlerini tamamlayan romantik çiçek tasarımları.", section: "Koleksiyonlar" },
  { title: "Cenaze ve Taziye", slug: "cenaze-ve-taziye", desc: "Başsağlığı ve taziye duygularını zarafetle ifade eden çiçekler.", section: "Koleksiyonlar" },
  { title: "Gelin Buketleri", slug: "gelin-buketleri", desc: "Gelin stiline özel hazırlanan zarif ve unutulmaz buketler.", section: "Koleksiyonlar" },
  { title: "Kurumsal Hizmetler", slug: "kurumsal-hizmetler", desc: "Markalara özel düzenli çiçek, etkinlik ve dekorasyon hizmetleri.", section: "Koleksiyonlar" },
  { title: "Hediye ve Tamamlayıcı Ürünler", slug: "hediye-ve-tamamlayici-urunler", desc: "Çiçek siparişinizi anlamlı hediyelerle tamamlayın.", section: "Koleksiyonlar" },
  { title: "Kampanyalar", slug: "kampanyalar", desc: "Avantajlı fiyatlar ve dönemsel fırsatlarla seçili çiçekler.", section: "Koleksiyonlar" },
  { title: "İndirimli Ürünler", slug: "indirimli-urunler", desc: "Bütçe dostu fiyatlarla seçili çiçek ve hediye seçenekleri.", section: "Koleksiyonlar" },

  { title: "Sevgiliye Çiçek", slug: "sevgiliye-cicek", desc: "Sevginizi unutulmaz bir çiçekle ifade edin.", section: "Gönderim Amacına Göre" },
  { title: "Anneye Çiçek", slug: "anneye-cicek", desc: "Annenize sevginizi anlatan zarif çiçek seçenekleri.", section: "Gönderim Amacına Göre" },
  { title: "Babaya Çiçek", slug: "babaya-cicek", desc: "Babanıza özel, güçlü ve şık bitki ve çiçek alternatifleri.", section: "Gönderim Amacına Göre" },
  { title: "Arkadaşa Çiçek", slug: "arkadasa-cicek", desc: "Dostluğunuzu kutlayan enerjik ve samimi çiçekler.", section: "Gönderim Amacına Göre" },
  { title: "Öğretmene Çiçek", slug: "ogretmene-cicek", desc: "Öğretmeninize teşekkür etmenin en zarif yolu.", section: "Gönderim Amacına Göre" },
  { title: "Doğum Günü Çiçekleri", slug: "dogum-gunu-cicekleri", desc: "Doğum günlerini renklendiren neşeli ve özel çiçekler.", section: "Gönderim Amacına Göre" },
  { title: "Yıldönümü Çiçekleri", slug: "yildonumu-cicekleri", desc: "Birlikte geçen güzel yılları romantik çiçeklerle kutlayın.", section: "Gönderim Amacına Göre" },
  { title: "Seni Seviyorum Çiçekleri", slug: "seni-seviyorum-cicekleri", desc: "En özel iki kelimeyi çiçeklerin diliyle söyleyin.", section: "Gönderim Amacına Göre" },
  { title: "Özür Çiçekleri", slug: "ozur-cicekleri", desc: "İçten bir özrü anlamlı ve zarif çiçeklerle iletin.", section: "Gönderim Amacına Göre" },
  { title: "Tebrik Çiçekleri", slug: "tebrik-cicekleri", desc: "Başarıları ve mutlu haberleri şık çiçeklerle kutlayın.", section: "Gönderim Amacına Göre" },
  { title: "Geçmiş Olsun Çiçekleri", slug: "gecmis-olsun-cicekleri", desc: "Moral ve iyi dileklerinizi taze çiçeklerle ulaştırın.", section: "Gönderim Amacına Göre" },
  { title: "Yeni İş Tebriği", slug: "yeni-is-tebrigi-cicekleri", desc: "Yeni başlangıçlara başarı dileyen modern çiçek ve bitkiler.", section: "Gönderim Amacına Göre" },
  { title: "Yeni Bebek Çiçekleri", slug: "yeni-bebek-cicekleri", desc: "Yeni bir hayatı yumuşak renkli çiçeklerle karşılayın.", section: "Gönderim Amacına Göre" },
  { title: "Yeni Ev Çiçekleri", slug: "yeni-ev-cicekleri", desc: "Yeni yuvalara huzur ve canlılık katan çiçekler.", section: "Gönderim Amacına Göre" },

  { title: "Sevgililer Günü", slug: "sevgililer-gunu", desc: "14 Şubat'a özel romantik çiçek koleksiyonları.", section: "Özel Günler" },
  { title: "Anneler Günü", slug: "anneler-gunu", desc: "Anneler Günü'nde sevginizi anlatan özel tasarımlar.", section: "Özel Günler" },
  { title: "Babalar Günü", slug: "babalar-gunu", desc: "Babalar Günü için seçkin bitki ve hediye alternatifleri.", section: "Özel Günler" },
  { title: "Kadınlar Günü", slug: "kadinlar-gunu", desc: "8 Mart'a özel zarif ve ilham veren çiçekler.", section: "Özel Günler" },
  { title: "Öğretmenler Günü", slug: "ogretmenler-gunu", desc: "24 Kasım için anlamlı teşekkür çiçekleri.", section: "Özel Günler" },
  { title: "Yılbaşı", slug: "yilbasi", desc: "Yeni yıl ruhunu taşıyan çiçek ve dekorasyon seçenekleri.", section: "Özel Günler" },
  { title: "Ramazan Bayramı", slug: "ramazan-bayrami", desc: "Bayram ziyaretlerine ve sevdiklerinize özel çiçekler.", section: "Özel Günler" },
  { title: "Kurban Bayramı", slug: "kurban-bayrami", desc: "Bayram sevincini paylaşmak için zarif çiçek seçenekleri.", section: "Özel Günler" },

  { title: "İstanbul Aynı Gün Teslimat", slug: "istanbul-teslimat", desc: "İstanbul'un seçili bölgelerine uygun ürünlerde aynı gün teslimat.", section: "Teslimat Bölgeleri" },
  { title: "Ankara Teslimat", slug: "teslimat-bolgeleri", desc: "Ankara için uygun çiçek ve hediye teslimat seçeneklerini genel teslimat rehberimizde inceleyin.", section: "Teslimat Bölgeleri", isPage: true },
  { title: "İzmir Teslimat", slug: "teslimat-bolgeleri", desc: "İzmir'e gönderilebilen çiçek ve hediyeleri genel teslimat rehberimizde keşfedin.", section: "Teslimat Bölgeleri", isPage: true },
  { title: "Türkiye Geneli Kargo", slug: "turkiye-geneli-kargo", desc: "Uygun ürünlerde Türkiye geneline 1–3 iş günü kargo.", section: "Teslimat Bölgeleri" },

  { title: "Hakkımızda", slug: "hakkimizda", desc: "1986'dan beri İstanbul'da çiçekçilik tutkumuzu ve hikâyemizi keşfedin.", section: "Bilgi Sayfaları", isPage: true },
  { title: "İletişim", slug: "iletisim", desc: "ÇiçekYolla ekibine ulaşın; sipariş ve hizmetler hakkında destek alın.", section: "Bilgi Sayfaları", isPage: true },
  { title: "Blog", slug: "blog", desc: "Çiçek bakımı, hediye önerileri ve özel gün fikirlerini okuyun.", section: "Bilgi Sayfaları", isPage: true },
  { title: "Sıkça Sorulan Sorular", slug: "blog", desc: "Sipariş, teslimat ve ürünler hakkında faydalı yanıtlara ulaşın.", section: "Bilgi Sayfaları", isPage: true },
  { title: "KVKK Aydınlatma Metni", slug: "kvkk", desc: "Kişisel verilerin korunmasına ilişkin bilgilendirme metnimizi inceleyin.", section: "Bilgi Sayfaları", isPage: true },
  { title: "Mesafeli Satış Sözleşmesi", slug: "mesafeli-satis-sozlesmesi", desc: "Online alışverişlerin sözleşme koşullarını inceleyin.", section: "Bilgi Sayfaları", isPage: true },
  { title: "İptal ve İade Koşulları", slug: "mesafeli-satis-sozlesmesi", desc: "Sipariş iptali ve iade süreçleriyle ilgili geçerli sözleşme koşullarını inceleyin.", section: "Bilgi Sayfaları", isPage: true },
  { title: "Gizlilik Politikası", slug: "kvkk", desc: "Gizlilik ve veri güvenliği uygulamalarımızı KVKK aydınlatma metninde inceleyin.", section: "Bilgi Sayfaları", isPage: true },
];

