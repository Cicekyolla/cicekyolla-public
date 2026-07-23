"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, X, Loader2, MessageCircle } from "lucide-react";
import { paytrStatus, SUPPORT_WHATSAPP } from "@/lib/payment";

/* /checkout/sonuc — PayTR kart ödemesi dönüş sayfası.
   Ödeme onaylanınca (webhook) sipariş numarası GÖSTERİLİR; kural: no ödemeden sonra.
   Reddedilirse müşteri burada çözer: Tekrar Dene + WhatsApp destek. */

function Sonuc() {
  const params = useSearchParams();
  const oid = params.get("oid") ?? "";
  const failFlag = params.get("fail") === "1";

  const [state, setState] = useState<"checking" | "paid" | "failed">("checking");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!oid) { setState("failed"); return; }
    let alive = true;
    let tries = 0;
    const tick = async () => {
      try {
        const s = await paytrStatus(oid);
        if (!alive) return;
        if (s.paid && s.order_number) { setOrderNumber(s.order_number); setState("paid"); return; }
      } catch { /* ağ hatası → tekrar dene */ }
      tries += 1;
      // Webhook birkaç saniye gecikebilir → ~40 sn poll, sonra fail göster.
      if (tries >= 14) { if (alive) setState("failed"); return; }
      window.setTimeout(tick, 3000);
    };
    // fail param'ı gelse bile webhook başarıyı doğrulayabilir → yine de bir süre kontrol et,
    // ama başarısız bayrağı varsa daha kısa dene.
    if (failFlag) { window.setTimeout(() => { if (alive && state !== "paid") setState("failed"); }, 6000); }
    tick();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oid]);

  return (
    <main className="max-w-lg mx-auto px-5 py-20 text-center">
      {state === "checking" && (
        <>
          <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>Ödemeniz kontrol ediliyor…</h1>
          <p className="text-[#6B7280] mt-2">Bankadan onay bekleniyor. Lütfen bu sayfadan ayrılmayın.</p>
        </>
      )}

      {state === "paid" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-[#22C55E]" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>Ödemeniz alındı!</h1>
          <p className="text-[#6B7280] mt-2">Sipariş numaranız</p>
          <p className="text-[22px] font-bold text-[#7C3AED] mt-1 tracking-wide">{orderNumber}</p>
          <Link href={`/siparis-takip?order=${encodeURIComponent(orderNumber ?? "")}`} className="inline-block mt-6 rounded-2xl bg-[#7C3AED] text-white font-bold px-7 py-3.5 hover:bg-[#6D28D9] transition-colors">
            Siparişi Takip Et
          </Link>
        </>
      )}

      {state === "failed" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-5">
            <X className="w-8 h-8 text-[#EF4444]" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>Ödeme tamamlanamadı</h1>
          <p className="text-[#6B7280] mt-2">Kartınızdan çekim yapılmadı. Bilgileriniz korunuyor — tekrar deneyebilir ya da bize yazabilirsiniz.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
            <Link href="/sepet" className="rounded-2xl bg-[#7C3AED] text-white font-bold px-7 py-3.5 hover:bg-[#6D28D9] transition-colors">
              Tekrar Dene
            </Link>
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366] text-[#128C7E] font-bold px-7 py-3.5 hover:bg-[#F0FFF4] transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Destek
            </a>
          </div>
        </>
      )}
    </main>
  );
}

export default function CheckoutSonucPage() {
  return (
    <Suspense fallback={<main className="max-w-lg mx-auto px-5 py-20 text-center"><Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin mx-auto" /></main>}>
      <Sonuc />
    </Suspense>
  );
}
