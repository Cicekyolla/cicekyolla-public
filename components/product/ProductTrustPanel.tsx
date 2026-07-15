import { LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";

const assurances = [
  {
    icon: LockKeyhole,
    title: "Şifreli bağlantı",
    text: "Sipariş bilgileriniz güvenli HTTPS bağlantısı üzerinden iletilir.",
  },
  {
    icon: ShieldCheck,
    title: "Kart bilgisi saklanmaz",
    text: "Mevcut sipariş akışında kart bilgisi istenmez veya Çiçek Yolla sunucularında tutulmaz.",
  },
  {
    icon: MessageCircle,
    title: "Gerçek destek",
    text: "Sipariş öncesi ve sonrasında WhatsApp üzerinden bize ulaşabilirsiniz.",
  },
] as const;

export function ProductTrustPanel() {
  return (
    <aside
      aria-labelledby="product-trust-title"
      className="hidden lg:block mt-8 overflow-hidden rounded-[28px] border border-[#EAE4F1] bg-[linear-gradient(145deg,#FCFBF8_0%,#F8F5FC_55%,#F2ECFA_100%)] shadow-[0_24px_60px_-42px_rgba(72,39,104,0.45)]"
    >
      <div className="px-7 pb-6 pt-7">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.32em] text-[#8B5CF6]">
          Ödeme &amp; Sipariş Güvencesi
        </p>
        <h2
          id="product-trust-title"
          className="max-w-md text-[24px] font-semibold leading-[1.2] text-[#24182F]"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          Her adımda içiniz rahat.
        </h2>
        <p className="mt-3 max-w-md text-[13.5px] leading-6 text-[#71667C]">
          Sade, şeffaf ve ihtiyaç duyduğunuzda gerçek destek sunan bir sipariş deneyimi.
        </p>
      </div>

      <div className="mx-4 overflow-hidden rounded-[20px] border border-white/80 bg-white/70 backdrop-blur-sm">
        {assurances.map(({ icon: Icon, title, text }, index) => (
          <div
            key={title}
            className={`flex items-start gap-4 px-5 py-4.5 ${index > 0 ? "border-t border-[#EEE9F3]" : ""}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F1EAF9] text-[#7445A0]">
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
            </span>
            <div className="pt-0.5">
              <h3 className="text-[13.5px] font-semibold text-[#2E2437]">{title}</h3>
              <p className="mt-1 text-[12.5px] leading-5 text-[#7A7084]">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <details className="group mx-7 my-6 border-t border-[#DED5E8] pt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[12.5px] font-semibold text-[#493457] outline-none transition hover:text-[#7C3AED] focus-visible:ring-2 focus-visible:ring-[#C4B5FD] [&::-webkit-details-marker]:hidden">
          Ödeme güvenliği hakkında
          <span aria-hidden="true" className="text-lg font-light text-[#8B5CF6] transition-transform group-open:rotate-45">+</span>
        </summary>
        <p className="mt-3 pr-5 text-[12px] leading-5 text-[#7A7084]">
          Aktif olmayan kart veya taksit seçenekleri müşteriye gösterilmez. Online ödeme açıldığında yalnız doğrulanmış seçenekler ödeme adımında yayınlanır.
        </p>
      </details>

      <a
        href="https://wa.me/905074413474?text=Merhaba%2C%20%C3%B6deme%20ve%20sipari%C5%9F%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between border-t border-[#E4DCEB] bg-white/45 px-7 py-4 text-[12.5px] font-semibold text-[#5C3A73] transition hover:bg-white/70 hover:text-[#7C3AED]"
      >
        WhatsApp’tan bilgi alın
        <span aria-hidden="true" className="text-base">→</span>
      </a>
    </aside>
  );
}
