import { mediaUrl } from "@/lib/media";

/** Footer rozet logosu (yuvarlak altın ÇiçekYolla). Operatör varlığı: public/brand/ */
const BADGE_LOGO = "/brand/cicekyolla-badge.webp";

export function BrandWordmark({
  logoUrl,
  alt = "ÇiçekYolla",
  tagline,
  size = "header",
  inverse = false,
}: {
  logoUrl?: string;
  alt?: string;
  tagline?: string;
  size?: "header" | "compact" | "footer" | "badge";
  inverse?: boolean;
}) {
  // badge: kırpma YOK — kare/yuvarlak rozet logosu (footer). Header/compact/footer modları DEĞİŞMEDİ.
  if (size === "badge") {
    return (
      <div className="flex w-fit flex-col items-center" aria-label={alt}>
        <img
          src={mediaUrl(logoUrl || BADGE_LOGO)}
          alt={alt}
          className="block h-[112px] w-[112px] xl:h-[124px] xl:w-[124px] rounded-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          decoding="async"
          draggable={false}
        />
        <span className={`mt-3 text-[9px] xl:text-[10px] ${inverse ? "text-[#C084FC]" : "text-[#6D28D9]"} text-center font-bold uppercase leading-none tracking-[0.32em]`}>
          {tagline || "Premium Çiçekçi"}
        </span>
      </div>
    );
  }
  const isFooter = size === "footer";
  const isCompact = size === "compact";
  const frameClass = isFooter
    ? "h-[76px] w-[230px] xl:h-[82px] xl:w-[250px]"
    : isCompact
      ? "h-[46px] w-[142px]"
      : "h-[52px] w-[168px] xl:h-[56px] xl:w-[182px]";
  const imageClass = isFooter
    ? "left-[-45px] top-[-29px] h-[145px] xl:left-[-49px] xl:top-[-32px] xl:h-[158px]"
    : isCompact
      ? "left-[-27px] top-[-18px] h-[88px]"
      : "left-[-31px] top-[-20px] h-[100px] xl:left-[-34px] xl:top-[-22px] xl:h-[108px]";
  const taglineClass = isFooter
    ? "mt-2 text-[9px] xl:text-[10px]"
    : isCompact
      ? "mt-1 text-[8px]"
      : "mt-1.5 text-[8.5px] xl:text-[9px]";
  // Açık zeminde tagline logodan GÜÇLÜ olmamalı: yardımcı bir satırın ait olduğu
  // markanın önüne geçmesi hiyerarşiyi bozuyordu (#51247A 11.15:1 > logo 9.25:1).
  // #6D28D9 -> 7.10:1: logodan net zayıf, WCAG AA'nın (4.5) rahat üstünde ve
  // marka moru olduğu için kimliği pekiştiriyor. inverse (footer) DEĞİŞMEDİ.
  const taglineColor = inverse ? "text-[#C084FC]" : "text-[#6D28D9]";

  return (
    <div className="flex w-fit flex-col" aria-label={alt}>
      <div className={`${frameClass} relative overflow-hidden`}>
        <img
          src={mediaUrl(logoUrl || "/brand-logo")}
          alt={alt}
          className={`${imageClass} absolute block w-auto max-w-none object-contain`}
          decoding="async"
          draggable={false}
        />
      </div>
      <span className={`${taglineClass} ${taglineColor} pl-0.5 text-center font-bold uppercase leading-none tracking-[0.32em]`}>
        {tagline || "Premium Çiçekçi"}
      </span>
    </div>
  );
}
