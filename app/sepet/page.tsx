"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Truck, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { CheckoutProgress } from "@/components/checkout/CheckoutProgress";
import { ProductImage } from "@/components/product/ProductImage";
import { useState } from "react";

function money(minor: number) {
  return `₺${(minor / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

/** Sepet satırında teslimatı okunur göster: "15 Ağustos Cuma · 12:00–15:00".
 *  Teslimat sepet satırının bir alanıdır; müşteri sepette ne zaman ulaşacağını görmeli. */
function deliveryLine(d?: { date?: string; slotLabel?: string; mode?: "sameday" | "cargo" }): string | null {
  if (!d?.date) return null;
  const parsed = new Date(`${d.date}T00:00:00`);
  const day = Number.isNaN(parsed.getTime())
    ? d.date
    : parsed.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  if (d.mode === "cargo") return `Türkiye Geneli Kargo · 1-5 iş günü`; // karar PDP'den; slot yok, tahmin yok
  return d.slotLabel ? `${day} · ${d.slotLabel}` : day;
}

export default function CartPage() {
  const { items, subtotalMinor, setQuantity, removeItem } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState(false);
  const [discountMinor, setDiscountMinor] = useState(0);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  // Tek huni: her satırın teslimatı olmalı. Eski (teslimatsız) satırlar checkout kapısını
  // geçemediği için CTA burada kilitlenir; müşteri duvara çarpmak yerine yönlendirilir.
  const allHaveDelivery = items.length > 0 && items.every((item) => Boolean(item.delivery?.date && item.delivery?.address));

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
      {/* TEK ANLATI: eski 5 adımlı çubuk ("Sepet · Ek Ürünler · Alıcı · Teslimat · Onay")
          teslimatı 4. sıraya koyuyordu — oysa teslimat ürün sayfasında seçiliyor.
          Artık paylaşılan CheckoutProgress: Teslimat → Bilgiler → Ödeme → Tamamlandı. */}
      <section className="border-b border-[#eee9f6] bg-white px-6 py-8 lg:px-14">
        <div className="mx-auto max-w-[1100px]">
          <CheckoutProgress current={1} />
        </div>
      </section>
      <section className="px-6 py-14 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
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
                      {/* V85: ürün fotoğrafı güçlü ve gerçek renkleriyle. Merkezi
                          ProductImage (blurhash + türevler) — checkout ile aynı dil. */}
                      <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-[20px] bg-white ring-1 ring-[#EDE9FE]">
                        <ProductImage src={item.image || undefined} alt={item.name} padding="8px" protect={false} sizes="160px" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold">{item.name}</h2>
                            {item.variantTitle ? <p className="mt-1 text-sm text-[#8b94a6]">{item.variantTitle}</p> : null}
                            {/* Teslimat satırın parçası — ÇiçekSepeti'nde de sepette görünür. */}
                            {deliveryLine(item.delivery) ? (
                              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F5F3FF] px-3 py-1 text-[12px] font-semibold text-[#6D28D9]">
                                <Truck className="h-3.5 w-3.5" /> {deliveryLine(item.delivery)}
                              </p>
                            ) : (
                              /* ESKİ SEPET SATIRI: bu değişiklikten önce liste kartından teslimatsız
                                 eklenmiş ürünler müşterinin localStorage'ında duruyor olabilir.
                                 Checkout kapısı bunları reddediyor ve müşteri /sepet ↔ /checkout
                                 arasında sıkışıyordu. Huniyi kırmamak için satırın kendisi
                                 teslimat seçimine götürür. */
                              <Link
                                href={`/urun/${item.productSlug}`}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] px-3 py-1 text-[12px] font-semibold text-[#B91C1C] hover:bg-[#FEE2E2]"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" /> Teslimat seçilmedi — seçmek için dokunun
                              </Link>
                            )}
                          </div>
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
              {/* V85 koyu premium panel — checkout'taki ürün hafızası paneliyle
                  AYNI aile, böylece sepet→checkout geçişi tek deneyim gibi okunur.
                  Kupon/toplam/CTA mantığı DEĞİŞMEDİ, yalnız sunum. */}
              <aside
                className="lg:sticky lg:top-6 overflow-hidden rounded-[28px] shadow-[0_28px_70px_-34px_rgba(76,29,149,0.85)]"
                style={{ background: "linear-gradient(175deg, #0F0224 0%, #1A0638 55%, #110328 100%)" }}
              >
                <div className="p-8 pb-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.32em]" style={{ color: "#C4B5FD" }}>✦ Sipariş Özeti</p>
                </div>
                <div className="px-8 pb-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#C4B5FD" }}>İndirim Kodu</p>
                  <div className="mt-3 flex gap-2.5">
                    <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 text-white/45" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(196,181,253,0.16)" }}>
                      <Tag className="h-4 w-4" />
                      <input aria-label="İndirim kodu" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyCoupon(); }} placeholder="Kodu girin" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
                    </label>
                    <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="rounded-full px-6 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)" }}>{couponLoading ? "Kontrol ediliyor…" : "Uygula"}</button>
                  </div>
                  {couponMessage ? <p className={`mt-3 text-[13px] font-semibold ${couponError ? "text-[#FCA5A5]" : "text-[#86EFAC]"}`}>{couponMessage}</p> : null}

                  <div className="mt-7 space-y-3 text-[14px]">
                    <div className="flex justify-between"><span className="text-white/45">Ara Toplam</span><span className="font-semibold text-white/85">{money(subtotalMinor)}</span></div>
                    {discountMinor > 0 ? <div className="flex justify-between text-[#86EFAC]"><span>İndirim</span><span className="font-semibold">-{money(discountMinor)}</span></div> : null}
                    <div className="flex justify-between"><span className="text-white/45">Kargo</span><span className="font-semibold text-[#86EFAC]">Ücretsiz</span></div>
                  </div>
                  <div className="my-6 h-px" style={{ background: "rgba(196,181,253,0.13)" }} />
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-white/45">Toplam</span>
                    <span className="font-semibold text-white" style={{ fontFamily: "var(--font-display)", fontSize: "34px", letterSpacing: "-0.02em" }}>{money(totalMinor)}</span>
                  </div>
                  {/* Teslimatsız satır varsa checkout kapısı zaten reddeder; müşteriyi
                      duvara göndermek yerine burada durdurup ne yapacağını söylüyoruz. */}
                  {allHaveDelivery ? (
                    <Link href="/checkout" className="mt-8 flex items-center justify-center gap-3 rounded-full px-8 py-5 text-[17px] font-bold text-white transition hover:brightness-110" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)", boxShadow: "0 18px 45px rgba(139,92,246,.35)" }}><ShoppingBag className="h-5 w-5" /> Siparişi Tamamla</Link>
                  ) : (
                    <div className="mt-8">
                      <div className="flex cursor-not-allowed items-center justify-center gap-3 rounded-full px-8 py-5 text-[17px] font-bold text-white/45" style={{ background: "rgba(255,255,255,0.08)" }}><ShoppingBag className="h-5 w-5" /> Siparişi Tamamla</div>
                      <p className="mt-3 text-center text-[13px] font-semibold text-[#FCA5A5]">Devam etmek için teslimatı seçilmemiş ürünlerin teslimatını tamamlayın.</p>
                    </div>
                  )}
                  <p className="mt-5 text-center text-[12.5px] text-white/35">Teslimat bilgileri doğrulanarak sipariş kaydı oluşturulur.</p>

                  {/* Güven şeridi — checkout paneliyle aynı */}
                  <div className="mt-6 flex items-center justify-center gap-5 pt-5" style={{ borderTop: "1px solid rgba(196,181,253,0.08)" }}>
                    {[{ icon: Truck, text: "Aynı Gün" }, { icon: ShieldCheck, text: "SSL Güvenli" }].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3 shrink-0" style={{ color: "#8B5CF6" }} />
                        <span className="text-[10.5px] text-white/30">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
