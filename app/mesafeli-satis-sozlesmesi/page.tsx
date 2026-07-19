import type { Metadata } from "next";
import { fetchSeoPage } from "@/lib/api";
import { LegalExperience, type LegalBlock } from "@/components/legal/LegalExperience";

export const metadata:Metadata={title:"Mesafeli Satış Sözleşmesi — ÇiçekYolla",description:"ÇiçekYolla mesafeli satış sözleşmesi ve tüketici bilgilendirmesi."};

const FALLBACK:LegalBlock[]=[
 {title:"Taraflar ve Satıcı Bilgileri",text:"Satıcı: Çiçek Yolla İnternet Hizmetleri Sanayi ve Ticaret Limited Şirketi\nAdres: Altayçeşme Mahallesi, Atatürk Caddesi No:37, Adalı Sokak A, Maltepe/İstanbul\nVergi Dairesi / No: Küçükyalı / 2531536370\nWeb: www.cicekyolla.com.tr\nE-posta: info@cicekyolla.com.tr\nTelefon: 0507 441 34 74\n\nAlıcı, sipariş sırasında bilgilerini giren gerçek veya tüzel kişidir."},
 {title:"Konu ve Sözleşmenin Kurulması",text:"Bu sözleşme, Alıcı’nın www.cicekyolla.com.tr üzerinden elektronik ortamda sipariş verdiği ürünlerin satışı ve teslimine ilişkin tarafların hak ve yükümlülüklerini düzenler. Sipariş özeti, ürün, adet, fiyat, teslimat ve alıcı bilgileri bu sözleşmenin ayrılmaz parçasıdır."},
 {title:"Ön Bilgilendirme ve Onay",text:"Alıcı; ürünün temel nitelikleri, vergiler dâhil toplam fiyatı, teslimat masrafları, ödeme yöntemi, teslimat koşulları ve cayma hakkı hakkında siparişi onaylamadan önce bilgilendirildiğini ve ödeme yükümlülüğü doğuran siparişi açıkça onayladığını kabul eder."},
 {title:"Fiyat ve Ödeme",text:"Geçerli bedel, sipariş onayından önce gösterilen vergiler dâhil toplam tutardır. Kullanılabilir ödeme yöntemleri ödeme ekranında gösterilir. Ödeme güvenliği, ilgili ödeme hizmeti sağlayıcısının altyapısı üzerinden yürütülür."},
 {title:"Teslimat",text:"Teslimat, siparişte seçilen tarih, zaman aralığı ve adrese göre gerçekleştirilir. Alıcı; alıcı adı, telefon ve adres bilgilerinin doğru olmasından sorumludur. Elde olmayan nedenlerle teslimatın aksaması hâlinde Alıcı bilgilendirilir ve mevzuattan doğan seçimlik hakları korunur."},
 {title:"Cayma Hakkı ve İstisnalar",text:"Tüketici genel olarak mevzuattaki koşullarla 14 gün içinde cayma hakkına sahiptir. Ancak çiçek gibi çabuk bozulabilen veya son kullanma tarihi çabuk geçebilecek ürünler ile tüketicinin özel istekleri doğrultusunda hazırlanan kişiye özel ürünlerde cayma hakkı istisnası uygulanabilir."},
 {title:"İptal, Ayıplı Ürün ve İade",text:"Hazırlık başlamadan önce iletilen iptal/değişiklik talepleri sipariş durumuna göre değerlendirilir. Hasarlı, ayıplı veya siparişe esaslı biçimde aykırı teslimatlarda tüketicinin 6502 sayılı Kanun’dan doğan seçimlik hakları saklıdır. Talep, teslimat bilgileri ve mümkünse görsellerle info@cicekyolla.com.tr adresine iletilebilir."},
 {title:"Uyuşmazlık ve Başvuru",text:"Talepler öncelikle info@cicekyolla.com.tr üzerinden çözümlenmeye çalışılır. Tüketici; yürürlükteki parasal sınırlar dâhilinde ikametgâhının veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetine ya da Tüketici Mahkemesine başvurabilir."},
 {title:"Yürürlük",text:"Alıcı’nın elektronik onayıyla sözleşme kurulmuş olur. Siparişe özgü ön bilgilendirme, sipariş özeti ve ödeme kaydı sözleşmenin ayrılmaz parçalarıdır. Satıcı, sözleşme ve sipariş kayıtlarını mevzuatta öngörülen süre boyunca saklar."},
];

export default async function ContractPage(){
 const managed=await fetchSeoPage("/mesafeli-satis-sozlesmesi");
 const saved=(managed?.body_blocks??[]).filter(b=>b.type==="legal-section"&&typeof b.title==="string"&&typeof b.text==="string").map(b=>({title:String(b.title),text:String(b.text)}));
 return <LegalExperience eyebrow="Tüketici Bilgilendirmesi" title="Mesafeli Satış Sözleşmesi" description="Siparişiniz, ödeme öncesinde gösterilen ürün, fiyat ve teslimat bilgileriyle birlikte güvenli ve şeffaf biçimde oluşturulur." blocks={saved.length?saved:FALLBACK}/>;
}
