import { mediaUrl } from "@/lib/media";

/** Footer rozet logosu (yuvarlak altın ÇiçekYolla). Operatör varlığı: public/brand/ */
const BADGE_LOGO = "/brand/cicekyolla-badge.webp";

/**
 * Marka wordmark'ı — CMS'te yüklenen logo dosyasını AYNEN gösterir.
 *
 * TARİHSEL SORUN (çözüldü): eski uygulama, kare çerçeveyi taşan bir <img>'i
 * `left:-34px top:-22px h:108px` gibi SABİT sayılarla kaydırıp
 * `overflow-hidden` ile kırpıyordu. Bu sayılar tek bir dosyanın (1805×871,
 * sol boşluğu 274px) şeffaf boşluğuna göre elle kalibre edilmişti:
 *   • o dosya            → logonun %99.6'sı görünüyordu (doğru)
 *   • sıkı kırpılmış PNG → logonun yalnız %31.5'i görünüyordu (sağdan 656px
 *     kesiliyor, "Yolla" ve çiçek kayboluyordu)
 * Yani operatörün yüklediği görsel ile sitede çizilen görsel AYNI DEĞİLDİ.
 *
 * YENİ DAVRANIŞ: kırpma yok. Görsel çerçeveye `object-contain` ile sığar →
 * en-boy oranı korunur, hiçbir kenar kesilmez, hangi dosya yüklenirse yüklensin
 * yüklenen görsel birebir görünür. `object-left` yalnız hizalamadır; kırpmaz.
 *
 * Beklenen varlık: şeffaf PNG/WebP/SVG, kenarları sıkı kırpılmış, en-boy ≈ 3:1.
 * (Sıkı kırpılmış dosyada logo çerçeve yüksekliğini tam doldurur.)
 */
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
  // badge: kırpma YOK — kare/yuvarlak rozet logosu (footer'ın eski görünümü).
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
  // Çerçeve genişlikleri, sıkı kırpılmış ~3:1 wordmark'ın yüksekliği tam
  // doldurabilmesi için hesaplandı (h × 3.0 + pay). object-contain sayesinde
  // daha geniş/dar dosyalar da kırpılmadan sığar.
  const frameClass = isFooter
    ? "h-[76px] w-[250px] xl:h-[82px] xl:w-[270px]"
    : isCompact
      ? "h-[46px] w-[146px]"
      : "h-[46px] w-[168px] xl:h-[50px] xl:w-[182px]";
  const taglineClass = isFooter
    ? "mt-2 text-[9px] xl:text-[10px]"
    : isCompact
      ? "mt-1 text-[8px]"
      : "mt-1.5 text-[8.5px] xl:text-[9px]";
  // Açık zeminde tagline logodan GÜÇLÜ olmamalı: yardımcı bir satırın ait olduğu
  // markanın önüne geçmesi hiyerarşiyi bozuyordu (#51247A 11.15:1 > logo 9.25:1).
  // #6D28D9 -> 7.10:1: logodan net zayıf, WCAG AA'nın (4.5) rahat üstünde ve
  // marka moru olduğu için kimliği pekiştiriyor. inverse (koyu zemin) #C084FC.
  const taglineColor = inverse ? "text-[#C084FC]" : "text-[#6D28D9]";

  return (
    <div className="flex w-fit flex-col" aria-label={alt}>
      <div className={`${frameClass} relative`}>
        <img
          src={mediaUrl(logoUrl || "/brand-logo")}
          alt={alt}
          className="block h-full w-full object-contain object-left"
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
