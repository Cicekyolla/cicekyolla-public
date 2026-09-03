"use client";

/**
 * PaytrFrame — PayTR'nin RESMİ güvenli ödeme formunu ÇiçekYolla checkout'unun
 * içinde gösterir.
 * ---------------------------------------------------------------------------
 * NE DEĞİŞTİ: backend zaten PayTR'nin **iFrame API**'sini kullanıyor
 * (`/odeme/api/get-token` → `https://www.paytr.com/odeme/guvenli/<token>`).
 * Eksik olan tek şey vitrindeydi: dönen adres bir <iframe>'e konmak yerine
 * `window.location.href` ile TAM SAYFA YÖNLENDİRME yapılıyordu — müşteri
 * ÇiçekYolla'dan çıkıp paytr.com'a gidiyordu.
 *
 * KIRMIZI ÇİZGİLER (hiçbiri ihlal edilmedi)
 *   • Kart verisi bize DEĞMEZ: form PayTR'nin kendi sayfasıdır, biz yalnız
 *     çerçeveyi çiziyoruz. Sahte/özel kart formu YOK.
 *   • Token üretimi, hash doğrulaması, callback ve sipariş akışı DEĞİŞMEDİ.
 *   • İkinci bir ödeme motoru kurulmadı; aynı `initPaytr` yanıtı kullanılıyor.
 *
 * ÖLÇÜM KAZANCI: tarayıcı hiç paytr.com'a gitmediği için GA4 oturumu kopmuyor
 * ve dönüşte `paytr.com / referral` kaynağı oluşmuyor (yönlendirmede oluşuyordu).
 *
 * YÜKSEKLİK: PayTR'nin resmi `iframeResizer` betiği içerik yüksekliğine göre
 * çerçeveyi büyütür. Betik yüklenemezse çerçeve kendi içinde kaydırılabilir
 * kalır (içerik ASLA kırpılmaz) — sessiz bozulma yok.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ShieldCheck, Lock, ArrowLeft, MessageCircle } from "lucide-react";
import { SUPPORT_WHATSAPP } from "@/lib/payment";

const RESIZER_SRC = "https://www.paytr.com/js/iframeResizer.min.js";
const FRAME_ID = "paytriframe";

declare global {
  interface Window {
    iFrameResize?: (options: Record<string, unknown>, target: string) => void;
  }
}

export function PaytrFrame({
  url,
  amountLabel,
  productName,
  onCancel,
}: {
  /** initPaytr'ın döndürdüğü resmi PayTR adresi (değiştirilmez). */
  url: string;
  amountLabel: string;
  productName: string;
  onCancel: () => void;
}) {
  const [resizerReady, setResizerReady] = useState(false);
  const [resizerFailed, setResizerFailed] = useState(false);
  /** Çerçevenin `load` olayı geldi mi? Gelmezse sayfa hiç açılmamış demektir. */
  const [frameLoaded, setFrameLoaded] = useState(false);
  /** Çerçeve açılmadı → müşteriyi mevcut ÇALIŞAN yönlendirme akışına taşı. */
  const [fellBack, setFellBack] = useState(false);
  const attached = useRef(false);
  const bailedOut = useRef(false);

  /* GÜVENLİ GERİ DÜŞÜŞ — kırmızı çizgi: hiçbir koşulda bugünkü çalışan akıştan
     KÖTÜ olmayacağız. Çerçeve açılmazsa (ağ, engelleme, PayTR tarafı) müşteri
     ödemesiz kalmaz; aynı resmi adrese TAM SAYFA yönlendirilir. */
  const goToRedirectFlow = useCallback(() => {
    if (bailedOut.current || typeof window === "undefined") return;
    bailedOut.current = true;
    setFellBack(true);
    window.location.href = url;
  }, [url]);

  const attach = useCallback(() => {
    if (attached.current || typeof window === "undefined") return;
    if (typeof window.iFrameResize !== "function") return;
    try {
      // PayTR'nin dokümante ettiği çağrı (varsayılan ayarlar).
      // DİKKAT: "ready" bayrağı çağrı BAŞARILI olunca DEĞİL, çerçeve GERÇEKTEN
      // yeniden boyutlanınca kalkar. Aksi hâlde alt sayfa yanıt vermezse
      // scrolling="no" + sabit yükseklikte içerik KIRPILIRDI.
      window.iFrameResize({ checkOrigin: false, onResized: () => setResizerReady(true) }, `#${FRAME_ID}`);
      attached.current = true;
    } catch {
      setResizerFailed(true);
    }
  }, []);

  useEffect(() => {
    attach();
    // Betik geç yüklenirse kısa süre dene; olmazsa kaydırmalı çerçeveye düş.
    const timer = window.setInterval(attach, 400);
    const giveUp = window.setTimeout(() => {
      window.clearInterval(timer);
      if (!attached.current) setResizerFailed(true);
    }, 6000);
    return () => { window.clearInterval(timer); window.clearTimeout(giveUp); };
  }, [attach]);

  /* Yükleme nöbetçisi: 10 sn içinde `load` gelmediyse çerçeve AÇILMAMIŞTIR
     (ağ hatası, engelleme, bozuk yanıt). Bu noktada müşteri henüz hiçbir şey
     yazmamıştır — otomatik geri düşüş güvenlidir ve akışı kesmez. */
  useEffect(() => {
    if (frameLoaded) return;
    const watchdog = window.setTimeout(() => {
      if (!frameLoaded) goToRedirectFlow();
    }, 10_000);
    return () => window.clearTimeout(watchdog);
  }, [frameLoaded, goToRedirectFlow]);

  return (
    <div className="mx-auto max-w-[680px]">
      <Script src={RESIZER_SRC} strategy="afterInteractive" onLoad={attach} onError={() => setResizerFailed(true)} />

      {/* ÇiçekYolla kimliği ve güven unsurları çerçevenin DIŞINDA kalır —
          içerideki form PayTR'nindir ve ona hiç dokunulmaz. */}
      <div className="rounded-t-[22px] border border-b-0 border-[#EDE9FE] bg-[#FBFAFF] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7C3AED] text-white">
              <Lock className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-[#1F2937]">Güvenli Ödeme</div>
              <div className="truncate text-[11.5px] text-[#9CA3AF]">{productName}</div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[11px] text-[#9CA3AF]">Ödenecek</div>
            <div className="text-[16px] font-bold text-[#7C3AED]">{amountLabel}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#F1F0F5] bg-white px-3 py-2 text-[11.5px] text-[#6B7280]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#22C55E]" />
          Kart bilgileriniz PayTR&apos;nin 3D Secure korumalı formuna girilir; ÇiçekYolla sunucularında
          tutulmaz ve görülmez.
        </div>
      </div>

      <iframe
        id={FRAME_ID}
        src={url}
        title="PayTR güvenli ödeme formu"
        onLoad={() => setFrameLoaded(true)}
        onError={goToRedirectFlow}
        // Resizer devredeyse yükseklik içerikten gelir; devrede değilse çerçeve
        // kendi içinde kaydırılır → içerik hiçbir durumda kırpılmaz.
        scrolling={resizerReady ? "no" : "auto"}
        className="w-full border border-[#EDE9FE] bg-white"
        style={{ minHeight: resizerReady ? 320 : 640, border: 0, borderLeft: "1px solid #EDE9FE", borderRight: "1px solid #EDE9FE" }}
      />

      <div className="rounded-b-[22px] border border-t-0 border-[#EDE9FE] bg-white px-5 py-4">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E9E7F0] px-5 py-2.5 text-[13.5px] font-bold text-[#4B5563] transition-colors hover:border-[#C4B5FD] hover:text-[#7C3AED]"
          >
            <ArrowLeft className="h-4 w-4" /> Ödeme yöntemine dön
          </button>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-[#128C7E] hover:underline"
          >
            <MessageCircle className="h-4 w-4" /> Yardım gerekirse WhatsApp
          </a>
        </div>
        {/* HER ZAMAN görünür kaçış yolu: çerçeve boş kalır ya da banka 3D
            Secure sayfası çerçeveyi reddederse müşteri kilitlenmez; aynı resmi
            PayTR adresine tam sayfa gider (bugünkü çalışan akış). */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={goToRedirectFlow}
            disabled={fellBack}
            className="text-[11.5px] font-semibold text-[#9CA3AF] underline decoration-dotted underline-offset-4 transition-colors hover:text-[#7C3AED] disabled:opacity-60"
          >
            {fellBack ? "Güvenli ödeme sayfasına yönlendiriliyorsunuz…" : "Ödeme formu açılmadıysa güvenli sayfada devam edin"}
          </button>
          {resizerFailed && !fellBack && (
            <p className="mt-1.5 text-[11px] text-[#C4B5FD]">Ödeme formu kendi penceresinde kaydırılabilir.</p>
          )}
        </div>
      </div>
    </div>
  );
}
