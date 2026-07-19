import type { Metadata } from "next";
import { fetchSeoPage } from "@/lib/api";
import { LegalExperience, type LegalBlock } from "@/components/legal/LegalExperience";

export const metadata:Metadata={title:"KVKK Aydınlatma Metni — ÇiçekYolla",description:"ÇiçekYolla kişisel verilerin korunması ve aydınlatma metni."};

const FALLBACK:LegalBlock[]=[
 {title:"Veri Sorumlusunun Kimliği",text:"6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu Çiçek Yolla İnternet Hizmetleri Sanayi ve Ticaret Limited Şirketi’dir.\n\nAdres: Altayçeşme Mahallesi, Atatürk Caddesi No:37, Adalı Sokak A, Maltepe/İstanbul\nVergi Dairesi / No: Küçükyalı / 2531536370\nWeb: www.cicekyolla.com.tr\nE-posta: info@cicekyolla.com.tr\nTelefon: 0507 441 34 74"},
 {title:"İşlenen Veriler ve Toplama Yöntemi",text:"Kimlik, iletişim, teslimat, sipariş, işlem güvenliği, müşteri hizmetleri ve pazarlama tercihleri; web sitesi, üyelik ve sipariş formları, çerezler, telefon, WhatsApp, e-posta ve sosyal medya kanalları üzerinden otomatik veya kısmen otomatik yöntemlerle toplanabilir. Tam kart bilgileri ödeme hizmeti sağlayıcısı tarafından işlenir."},
 {title:"İşleme Amaçları ve Hukuki Sebepler",text:"Veriler; siparişin kurulması ve ifası, ödeme ve teslimatın yürütülmesi, müşteri desteği, güvenlik, muhasebe ve mevzuat yükümlülükleri için işlenir. İşleme; sözleşmenin kurulması veya ifası, hukuki yükümlülük, bir hakkın tesisi/kullanılması, meşru menfaat ve gerekli hâllerde açık rıza sebeplerine dayanır."},
 {title:"Verilerin Aktarılması",text:"Gerekli veriler; ödeme kuruluşları, kargo/kurye ve teslimat iş ortakları, barındırma ve bilişim hizmeti sağlayıcıları, muhasebe/hukuk hizmeti sağlayıcıları ile kanunen yetkili kamu kurumlarına, yalnız ilgili hizmet ve yükümlülüklerin yerine getirilmesi amacıyla aktarılabilir."},
 {title:"Saklama ve Güvenlik",text:"Kişisel veriler, işleme amacı ve ilgili mevzuatta öngörülen süre boyunca saklanır; süre sonunda silinir, yok edilir veya anonim hâle getirilir. Yetkisiz erişim, kayıp ve kötüye kullanımı önlemeye yönelik teknik ve idari tedbirler uygulanır."},
 {title:"KVKK Kapsamındaki Haklarınız",text:"KVKK’nın 11. maddesi uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi isteme, amacı ve aktarılan üçüncü kişileri öğrenme, düzeltme, silme/yok etme talep etme, otomatik analiz sonucuna itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini isteme haklarına sahipsiniz."},
 {title:"Başvuru ve İletişim",text:"Başvurularınızı kimliğinizi doğrulamaya elverişli bilgilerle info@cicekyolla.com.tr adresine veya şirket adresimize yazılı olarak iletebilirsiniz. Başvurular, mevzuatta öngörülen süre içinde ve kural olarak ücretsiz sonuçlandırılır."},
];

export default async function KvkkPage(){
 const managed=await fetchSeoPage("/kvkk");
 const saved=(managed?.body_blocks??[]).filter(b=>b.type==="legal-section"&&typeof b.title==="string"&&typeof b.text==="string").map(b=>({title:String(b.title),text:String(b.text)}));
 return <LegalExperience eyebrow="Kişisel Verilerin Korunması" title="KVKK Aydınlatma Metni" description="Kişisel verilerinizi yalnızca belirli, açık ve meşru amaçlarla işliyoruz. Sorularınız için info@cicekyolla.com.tr adresine yazabilirsiniz." blocks={saved.length?saved:FALLBACK}/>;
}
