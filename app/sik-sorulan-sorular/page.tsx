import type { Metadata } from "next";
import { fetchSeoPage } from "@/lib/api";
import { safeJsonLd } from "@/lib/jsonLdSafe";
import { FaqExperience, type FaqItem } from "@/components/faq/FaqExperience";

export const metadata:Metadata={title:"Sık Sorulan Sorular",alternates:{canonical:"/sik-sorulan-sorular"},description:"Sipariş, teslimat, ürün, ödeme ve kurumsal hizmetlerle ilgili sık sorulan sorular."};

const FALLBACK:FaqItem[]=[
 {category:"Sipariş & Teslimat",question:"Aynı gün teslimat için son sipariş saati nedir?",answer:"Atölyemize yakın bölgelerde saat 20:00'ye, Kadıköy–Beşiktaş bandında 18:00'e, daha uzak ilçelerde 17:00'ye kadar verilen siparişler aynı gün teslim edilir. Adresinize özel güncel son saat, sipariş adımında gösterilir."},
 {category:"Sipariş & Teslimat",question:"Teslimat ücretli midir?",answer:"İstanbul'da 45 km'ye kadar aynı gün teslimat ücretsizdir. Daha uzak bölgelerde özel araç ücreti, adresinizi girdiğinizde ödemeden önce gösterilir. Türkiye geneline kargo ücretsizdir."},
 {category:"Sipariş & Teslimat",question:"Siparişimi takip edebilir miyim?",answer:"Sipariş durumunuz hazırlanma ve teslimat aşamalarında tarafınıza iletilir."},
 {category:"Ürünler & Kalite",question:"Çiçekler ne kadar taze kalır?",answer:"Ürün türüne ve bakım koşullarına göre değişir. Serin ortam, temiz su ve düzenli bakım tazeliği uzatır."},
 {category:"Ürünler & Kalite",question:"Fotoğraftaki ürünün aynısı mı gelir?",answer:"Dilerseniz hazırlanan ürününüzün fotoğrafını teslimattan önce WhatsApp'tan paylaşırız; beğenmezseniz yeniden hazırlarız. Tasarımın ana görünümü korunur; mevsimsel tedarikte eşdeğer renk ve değerde küçük değişiklikler olabilir."},
 {category:"Ödeme & İade",question:"Hangi ödeme yöntemlerini kullanabilirim?",answer:"Kredi kartı veya banka kartıyla PayTR güvenli ödeme altyapısı üzerinden, 3D Secure onayıyla ödeyebilirsiniz; kart bilgileriniz sitemizde saklanmaz. Dilerseniz ödeme adımında Havale / EFT seçeneğini de seçebilirsiniz; IBAN ve açıklamaya yazacağınız sipariş numarası size gösterilir. Western Union ile ödemek isterseniz WhatsApp'tan yazmanız yeterli, birlikte ayarlayalım. Kartla ödemeler tek çekimdir."},
 {category:"Ödeme & İade",question:"İptal veya değişiklik yapabilir miyim?",answer:"Ürün hazırlanmaya başlamadan önce bize ulaşmanız halinde uygunluk durumuna göre yardımcı olabiliriz."},
 {category:"Ödeme & İade",question:"Siparişim teslim edilemezse ne olur?",answer:"Siparişinizi teslim edemezsek iptal eder, iadenizi aynı gün başlatırız. Kart iadesinin hesabınıza geçiş süresi bankanıza bağlıdır."},
 {category:"Kurumsal & Özel",question:"Kurumsal sipariş nasıl verebilirim?",answer:"Kurumsal talepleriniz için info@cicekyolla.com.tr adresinden veya 0507 441 34 74 numarasından bize ulaşabilirsiniz."},
 {category:"Kurumsal & Özel",question:"Kişiye özel tasarım yaptırabilir miyim?",answer:"Ürün ve stok uygunluğuna göre florist ekibimiz özel tasarım taleplerinizi değerlendirebilir."},
];

export default async function FaqPage(){
 const managed=await fetchSeoPage("/sik-sorulan-sorular");
 const saved=(managed?.body_blocks??[]).filter(b=>b.type==="faq-item"&&typeof b.title==="string"&&typeof b.text==="string").map(b=>({category:String(b.kind||"Genel"),question:String(b.title),answer:String(b.text)}));
 const items=saved.length?saved:FALLBACK;
 const jsonLd={"@context":"https://schema.org","@type":"FAQPage",mainEntity:items.map(item=>({"@type":"Question",name:item.question,acceptedAnswer:{"@type":"Answer",text:item.answer}}))};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(jsonLd)}}/><FaqExperience items={items}/></>;
}
