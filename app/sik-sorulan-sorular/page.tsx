import type { Metadata } from "next";
import { fetchSeoPage } from "@/lib/api";
import { FaqExperience, type FaqItem } from "@/components/faq/FaqExperience";

export const metadata:Metadata={title:"Sık Sorulan Sorular — ÇiçekYolla",description:"Sipariş, teslimat, ürün, ödeme ve kurumsal hizmetlerle ilgili sık sorulan sorular."};

const FALLBACK:FaqItem[]=[
 {category:"Sipariş & Teslimat",question:"Aynı gün teslimat için son sipariş saati nedir?",answer:"Uygun son sipariş saati teslimat bölgesi ve güncel yoğunluğa göre sipariş adımında gösterilir."},
 {category:"Sipariş & Teslimat",question:"Teslimat ücretli midir?",answer:"Teslimat ücreti seçilen bölge ve teslimat seçeneğine göre sipariş özetinde açıkça gösterilir."},
 {category:"Sipariş & Teslimat",question:"Siparişimi takip edebilir miyim?",answer:"Sipariş durumunuz hazırlanma ve teslimat aşamalarında tarafınıza iletilir."},
 {category:"Ürünler & Kalite",question:"Çiçekler ne kadar taze kalır?",answer:"Ürün türüne ve bakım koşullarına göre değişir. Serin ortam, temiz su ve düzenli bakım tazeliği uzatır."},
 {category:"Ürünler & Kalite",question:"Fotoğraftaki ürünün aynısı mı gelir?",answer:"Tasarımın ana görünümü korunur. Mevsimsel tedarikte eşdeğer renk ve değerde küçük değişiklikler yapılabilir."},
 {category:"Ödeme & İade",question:"Hangi ödeme yöntemlerini kullanabilirim?",answer:"Aktif ödeme yöntemleri ödeme adımında güvenli biçimde gösterilir."},
 {category:"Ödeme & İade",question:"İptal veya değişiklik yapabilir miyim?",answer:"Ürün hazırlanmaya başlamadan önce bize ulaşmanız halinde uygunluk durumuna göre yardımcı olabiliriz."},
 {category:"Kurumsal & Özel",question:"Kurumsal sipariş nasıl verebilirim?",answer:"Kurumsal talepleriniz için info@cicekyolla.com.tr adresinden veya 0507 441 34 74 numarasından bize ulaşabilirsiniz."},
 {category:"Kurumsal & Özel",question:"Kişiye özel tasarım yaptırabilir miyim?",answer:"Ürün ve stok uygunluğuna göre florist ekibimiz özel tasarım taleplerinizi değerlendirebilir."},
];

export default async function FaqPage(){
 const managed=await fetchSeoPage("/sik-sorulan-sorular");
 const saved=(managed?.body_blocks??[]).filter(b=>b.type==="faq-item"&&typeof b.title==="string"&&typeof b.text==="string").map(b=>({category:String(b.kind||"Genel"),question:String(b.title),answer:String(b.text)}));
 const items=saved.length?saved:FALLBACK;
 const jsonLd={"@context":"https://schema.org","@type":"FAQPage",mainEntity:items.map(item=>({"@type":"Question",name:item.question,acceptedAnswer:{"@type":"Answer",text:item.answer}}))};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><FaqExperience items={items}/></>;
}
