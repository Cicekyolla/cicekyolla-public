import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Gift, Minus, Plus, ShoppingBag, Tag, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Sepetim — ÇiçekYolla",
  description: "ÇiçekYolla sepetinizdeki ürünleri kontrol edin, indirim kodu uygulayın ve güvenli ödeme adımına geçin.",
  robots: { index: false, follow: false },
};

const checkoutSteps = ["Sepet", "Ek Ürünler", "Alıcı", "Teslimat", "Ödeme"];

export default function CartPage() {
  const subtotal = 599;

  return (
    <main className="bg-[#fbfafc] text-[#111827]">
      <section className="border-b border-[#eee9f6] bg-white px-6 py-8 lg:px-14">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 overflow-x-auto">
          {checkoutSteps.map((step, index) => {
            const active = index === 0;
            return (
              <div key={step} className="flex min-w-[120px] flex-1 items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <span className={`grid h-11 w-11 place-items-center rounded-full text-sm font-bold ${active ? "bg-[#8b5cf6] text-white shadow-[0_12px_30px_rgba(139,92,246,.32)]" : "bg-[#f1f2f5] text-[#9aa1ad]"}`}>{index + 1}</span>
                  <span className={`text-xs font-semibold ${active ? "text-[#8b5cf6]" : "text-[#9aa1ad]"}`}>{step}</span>
                </div>
                {index < checkoutSteps.length - 1 ? <span className="h-px flex-1 bg-[#e5e7eb]" /> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 py-14 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
          <p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">Adım 1 / 5</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold text-[#111827] md:text-6xl">Sepetim <span className="font-sans text-2xl text-[#a1a7b3]">(1 ürün)</span></h1>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_470px]">
            <div className="space-y-6">
              <article className="rounded-[28px] border border-[#ede9fe] bg-white p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)]">
                <div className="flex gap-6">
                  <div className="h-36 w-36 flex-shrink-0 overflow-hidden rounded-[20px] bg-[#f3edf7]">
                    <img src="https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=500&q=85" alt="Premium Kırmızı Güller" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-[#111827]">Premium Kırmızı Güller</h2>
                        <p className="mt-1 text-sm text-[#8b94a6]">Orta (15 Adet Gül)</p>
                        <p className="mt-3 text-sm font-medium text-[#8b5cf6]">Sevgilime</p>
                      </div>
                      <button aria-label="Ürünü kaldır" className="rounded-full p-2 text-[#c4cad4] transition hover:bg-[#f7f5fc] hover:text-[#8b5cf6]"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-5">
                      <div className="inline-flex items-center rounded-full border border-[#e7ddfb] bg-white text-[#1f2937]">
                        <button aria-label="Azalt" className="grid h-12 w-14 place-items-center text-[#64748b]"><Minus className="h-4 w-4" /></button>
                        <span className="min-w-10 text-center font-bold">1</span>
                        <button aria-label="Arttır" className="grid h-12 w-14 place-items-center text-[#64748b]"><Plus className="h-4 w-4" /></button>
                      </div>
                      <p className="font-serif text-4xl font-semibold text-[#111827]">₺{subtotal.toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                </div>
              </article>

              <Link href="/kategori/hediye-ek-urunler" className="flex items-center justify-between rounded-[26px] border border-dashed border-[#cdbdff] bg-[#f2edff] p-7 text-[#111827] transition hover:border-[#8b5cf6] hover:bg-[#eee7ff]">
                <span className="flex items-center gap-5">
                  <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#8b5cf6] text-white shadow-[0_14px_34px_rgba(139,92,246,.28)]"><Gift className="h-7 w-7" /></span>
                  <span>
                    <span className="block text-lg font-bold">Hediye & Ek Ürünler Ekle</span>
                    <span className="mt-1 block text-sm text-[#6f7482]">Çikolata, peluş, ekspres teslimat, video mesaj ve daha fazlası</span>
                  </span>
                </span>
                <ArrowRight className="h-6 w-6 text-[#8b5cf6]" />
              </Link>

              <Link href="/" className="inline-flex items-center gap-2 font-medium text-[#8b5cf6]"><ArrowLeft className="h-4 w-4" /> Alışverişe Devam Et</Link>
            </div>

            <aside className="overflow-hidden rounded-[28px] border border-[#ede9fe] bg-white shadow-[0_24px_70px_rgba(45,22,72,.07)]">
              <div className="border-b border-[#ede9fe] p-8"><h2 className="font-serif text-3xl font-semibold">Sipariş Özeti</h2></div>
              <div className="p-8">
                <p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">İndirim Kodu</p>
                <div className="mt-5 flex gap-3">
                  <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-[#e5dbfb] px-5 text-[#8b94a6]"><Tag className="h-5 w-5" /><input aria-label="İndirim kodu" placeholder="Kodu girin (CICEK10)" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
                  <button className="rounded-full bg-[#f1ebff] px-7 font-bold text-[#8b5cf6]">Uygula</button>
                </div>
                <div className="mt-8 space-y-4 text-lg">
                  <div className="flex justify-between"><span className="text-[#6f7482]">Ara Toplam</span><strong>₺{subtotal.toLocaleString("tr-TR")}</strong></div>
                  <div className="flex justify-between"><span className="text-[#6f7482]">Kargo</span><strong className="text-[#059669]">Ücretsiz</strong></div>
                </div>
                <div className="my-8 h-px bg-[#ede9fe]" />
                <div className="flex items-end justify-between"><span className="text-xl font-bold">Toplam</span><strong className="font-serif text-5xl font-semibold">₺{subtotal.toLocaleString("tr-TR")}</strong></div>
                <Link href="/checkout" className="mt-9 flex items-center justify-center gap-3 rounded-full bg-[#8b5cf6] px-8 py-5 text-lg font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)]"><ShoppingBag className="h-5 w-5" /> Ödeme Adımına Geç</Link>
                <p className="mt-5 text-center text-sm text-[#8b94a6]">Güvenli ödeme, ücretsiz teslimat ve taze çiçek garantisi.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
