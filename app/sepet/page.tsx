"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Gift, Minus, Plus, ShoppingBag, Tag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useState } from "react";

const checkoutSteps = ["Sepet", "Ek Ürünler", "Alıcı", "Teslimat", "Onay"];

function money(minor: number) {
  return `₺${(minor / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

export default function CartPage() {
  const { items, subtotalMinor, setQuantity, removeItem } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState(false);
  const [discountMinor, setDiscountMinor] = useState(0);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code || items.length === 0) return;
    setCouponLoading(true);
    setCouponMessage(null);
    setCouponError(false);
    try {
      const storedCustomerId = window.localStorage.getItem("cicekyolla.customer_id");
      const customerId = storedCustomerId && /^\\d+$/.test(storedCustomerId) ? Number(storedCustomerId) : undefined;
      const response = await fetch("/api/public/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
          ...(customerId ? { customer_id: customerId } : {}),
        }),
      });
      const body = await response.json() as { data?: { valid?: boolean; discount_minor?: number; total_minor?: number; message?: string }; error?: string; message?: string };
      const result = body.data;
      if (!response.ok || !result?.valid) {
        setDiscountMinor(0);
        setCouponError(true);
        setCouponMessage(result?.message ?? body.message ?? "Kupon uygulanamadı. Kodu kontrol edin.");
        return;
      }
      setDiscountMinor(Number(result.discount_minor ?? 0));
      setCouponMessage(result.message ?? "Kupon uygulandı.");
    } catch {
      setDiscountMinor(0);
      setCouponError(true);
      setCouponMessage("Kupon kontrol edilemedi. Lütfen tekrar deneyin.");
    } finally {
      setCouponLoading(false);
    }
  }

  return (
    <main className="bg-[#fbfafc] text-[#111827]">
      <section className="border-b border-[#eee9f6] bg-white px-6 py-8 lg:px-14">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 overflow-x-auto">
          {checkoutSteps.map((step, index) => (
            <div key={step} className="flex min-w-[120px] flex-1 items-center gap-3">
              <div className="flex flex-col items-center gap-2">
                <span className={`grid h-11 w-11 place-items-center rounded-full text-sm font-bold ${index === 0 ? "bg-[#8b5cf6] text-white shadow-[0_12px_30px_rgba(139,92,246,.32)]" : "bg-[#f1f2f5] text-[#9aa1ad]"}`}>{index + 1}</span>
                <span className={`text-xs font-semibold ${index === 0 ? "text-[#8b5cf6]" : "text-[#9aa1ad]"}`}>{step}</span>
              </div>
              {index < checkoutSteps.length - 1 ? <span className="h-px flex-1 bg-[#e5e7eb]" /> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="px-6 py-14 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
          <p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">Adım 1 / 5</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold text-[#111827] md:text-6xl">Sepetim <span className="font-sans text-2xl text-[#a1a7b3]">({items.reduce((sum, item) => sum + item.quantity, 0)} ürün)</span></h1>
          {items.length === 0 ? (
            <div className="mt-12 rounded-[28px] border border-[#ede9fe] bg-white p-12 text-center shadow-[0_24px_70px_rgba(45,22,72,.07)]">
              <ShoppingBag className="mx-auto h-12 w-12 text-[#c4b5fd]" />
              <h2 className="mt-5 text-2xl font-bold">Sepetiniz henüz boş</h2>
              <p className="mt-2 text-[#6f7482]">Beğendiğiniz çiçekleri sepetinize ekleyebilirsiniz.</p>
              <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#8b5cf6] px-7 py-3.5 font-bold text-white"><ArrowLeft className="h-4 w-4" /> Alışverişe Başla</Link>
            </div>
          ) : (
            <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_470px]">
              <div className="space-y-6">
                {items.map((item) => (
                  <article key={item.key} className="rounded-[28px] border border-[#ede9fe] bg-white p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)]">
                    <div className="flex gap-6">
                      <div className="h-36 w-36 flex-shrink-0 overflow-hidden rounded-[20px] bg-[#f3edf7]">
                        {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-contain" /> : null}
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-6">
                        <div className="flex items-start justify-between gap-4">
                          <div><h2 className="text-xl font-bold">{item.name}</h2>{item.variantTitle ? <p className="mt-1 text-sm text-[#8b94a6]">{item.variantTitle}</p> : null}</div>
                          <button type="button" aria-label="Ürünü kaldır" onClick={() => removeItem(item.key)} className="rounded-full p-2 text-[#c4cad4] transition hover:bg-[#f7f5fc] hover:text-[#8b5cf6]"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-5">
                          <div className="inline-flex items-center rounded-full border border-[#e7ddfb] bg-white text-[#1f2937]">
                            <button type="button" aria-label="Azalt" onClick={() => setQuantity(item.key, item.quantity - 1)} className="grid h-12 w-14 place-items-center text-[#64748b]"><Minus className="h-4 w-4" /></button>
                            <span className="min-w-10 text-center font-bold">{item.quantity}</span>
                            <button type="button" aria-label="Arttır" onClick={() => setQuantity(item.key, item.quantity + 1)} className="grid h-12 w-14 place-items-center text-[#64748b]"><Plus className="h-4 w-4" /></button>
                          </div>
                          <p className="font-serif text-4xl font-semibold">{money(item.unitPriceMinor * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                <Link href="/" className="inline-flex items-center gap-2 font-medium text-[#8b5cf6]"><ArrowLeft className="h-4 w-4" /> Alışverişe Devam Et</Link>
              </div>
              <aside className="overflow-hidden rounded-[28px] border border-[#ede9fe] bg-white shadow-[0_24px_70px_rgba(45,22,72,.07)]">
                <div className="border-b border-[#ede9fe] p-8"><h2 className="font-serif text-3xl font-semibold">Sipariş Özeti</h2></div>
                <div className="p-8">
                  <p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">İndirim Kodu</p>
                  <div className="mt-5 flex gap-3"><label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-[#e5dbfb] px-5 text-[#8b94a6]"><Tag className="h-5 w-5" /><input aria-label="İndirim kodu" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyCoupon(); }} placeholder="Kodu girin" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="rounded-full bg-[#f1ebff] px-7 font-bold text-[#8b5cf6] disabled:cursor-not-allowed disabled:opacity-50">{couponLoading ? "Kontrol ediliyor…" : "Uygula"}</button></div>{couponMessage ? <p className={`mt-3 text-sm font-semibold ${couponError ? "text-[#b91c1c]" : "text-[#047857]"}`}>{couponMessage}</p> : null}
                  <div className="mt-8 space-y-4 text-lg"><div className="flex justify-between"><span className="text-[#6f7482]">Ara Toplam</span><strong>{money(subtotalMinor)}</strong></div>{discountMinor > 0 ? <div className="flex justify-between text-[#047857]"><span>İndirim</span><strong>-{money(discountMinor)}</strong></div> : null}<div className="flex justify-between"><span className="text-[#6f7482]">Kargo</span><strong className="text-[#059669]">Ücretsiz</strong></div></div>
                  <div className="my-8 h-px bg-[#ede9fe]" />
                  <div className="flex items-end justify-between"><span className="text-xl font-bold">Toplam</span><strong className="font-serif text-5xl font-semibold">{money(totalMinor)}</strong></div>
                  <Link href="/checkout" className="mt-9 flex items-center justify-center gap-3 rounded-full bg-[#8b5cf6] px-8 py-5 text-lg font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)]"><ShoppingBag className="h-5 w-5" /> Siparişi Tamamla</Link>
                  <p className="mt-5 text-center text-sm text-[#8b94a6]">Teslimat bilgileri doğrulanarak sipariş kaydı oluşturulur.</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
