"use client";

import { useState } from "react";
import Link from "next/link";

/* Fast Checkout (C4) — gerçek POST /api/orders (guest). Mock YOK.
   Vercel rewrite /api/:path* → backend public order endpoint. */

interface Props { productName: string; productId: number | null; priceMinor: number; }

const SLOTS = ["09:00–12:00", "12:00–15:00", "15:00–18:00", "18:00–21:00"];

export function CheckoutForm({ productName, productId, priceMinor }: Props) {
  const [qty, setQty] = useState(1);
  const [f, setF] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    recipient_name: "", recipient_phone: "",
    delivery_address: "", delivery_district: "", delivery_date: "", delivery_time_slot: SLOTS[0],
    card_message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ order_number: string } | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const total = priceMinor * qty;
  const money = (m: number) => `₺${(m / 100).toLocaleString("tr-TR")}`;

  const submit = async () => {
    setError(null);
    if (!f.customer_name || !f.customer_phone || !f.recipient_name) {
      setError("Lütfen ad, telefon ve alıcı adını doldurun."); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: f.customer_name, customer_phone: f.customer_phone,
          customer_email: f.customer_email || null,
          recipient_name: f.recipient_name, recipient_phone: f.recipient_phone || null,
          delivery_address: f.delivery_address || null, delivery_district: f.delivery_district || null,
          delivery_date: f.delivery_date || null, delivery_time_slot: f.delivery_time_slot || null,
          card_message: f.card_message || null, source: "web",
         items: [{ product_id: productId != null ? Number(productId) : null, product_name: productName, quantity: qty, unit_price_minor: Math.round(Number(priceMinor)) }],
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setDone({ order_number: json.data.order_number });
    } catch {
      setError("Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>Siparişiniz alındı!</h1>
        <p className="text-[#6B7280] mt-2">Sipariş numaranız:</p>
        <p className="text-2xl font-bold text-[#7C3AED] mt-1 tracking-wide">{done.order_number}</p>
        <Link href={`/siparis-takip?no=${done.order_number}`} className="inline-block mt-6 px-6 py-3 rounded-xl bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] transition-colors">
          Siparişi Takip Et
        </Link>
      </div>
    );
  }

  const input = "w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-[15px] focus:outline-none focus:border-[#C4B5FD] transition-colors";
  const label = "block text-[12.5px] font-semibold text-[#6B7280] mb-1.5";

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8 max-w-5xl mx-auto">
      <div className="grid gap-5">
        <section>
          <h2 className="text-[11px] tracking-[0.2em] text-[#8B5CF6] uppercase font-bold mb-4">Sipariş Veren</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Ad Soyad *</label><input className={input} value={f.customer_name} onChange={set("customer_name")} /></div>
            <div><label className={label}>Telefon *</label><input className={input} value={f.customer_phone} onChange={set("customer_phone")} placeholder="+90 5xx xxx xx xx" /></div>
            <div className="sm:col-span-2"><label className={label}>E-posta</label><input className={input} value={f.customer_email} onChange={set("customer_email")} /></div>
          </div>
        </section>
        <section>
          <h2 className="text-[11px] tracking-[0.2em] text-[#8B5CF6] uppercase font-bold mb-4">Alıcı & Teslimat</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Alıcı Adı *</label><input className={input} value={f.recipient_name} onChange={set("recipient_name")} /></div>
            <div><label className={label}>Alıcı Telefonu</label><input className={input} value={f.recipient_phone} onChange={set("recipient_phone")} /></div>
            <div className="sm:col-span-2"><label className={label}>Adres</label><input className={input} value={f.delivery_address} onChange={set("delivery_address")} /></div>
            <div><label className={label}>İlçe</label><input className={input} value={f.delivery_district} onChange={set("delivery_district")} /></div>
            <div><label className={label}>Teslimat Tarihi</label><input type="date" className={input} value={f.delivery_date} onChange={set("delivery_date")} /></div>
            <div className="sm:col-span-2"><label className={label}>Teslimat Saati</label>
              <select className={input} value={f.delivery_time_slot} onChange={set("delivery_time_slot")}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-[11px] tracking-[0.2em] text-[#8B5CF6] uppercase font-bold mb-4">Kart Mesajı</h2>
          <textarea className={`${input} min-h-[90px]`} value={f.card_message} onChange={set("card_message")} placeholder="Sevdiklerinize iletmek istediğiniz mesaj…" />
        </section>
      </div>

      {/* Özet */}
      <aside className="h-fit sticky top-24 rounded-2xl border border-[#EDE9FE] bg-[#FAFAFF] p-6">
        <h2 className="text-[11px] tracking-[0.2em] text-[#8B5CF6] uppercase font-bold mb-4">Sipariş Özeti</h2>
        <div className="flex justify-between text-[14px] mb-2"><span className="text-[#374151]">{productName}</span></div>
        <div className="flex items-center gap-3 my-4">
          <span className="text-[13px] text-[#6B7280]">Adet</span>
          <div className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1 text-[#7C3AED] font-bold">−</button>
            <span className="px-3 text-[14px] font-semibold">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="px-3 py-1 text-[#7C3AED] font-bold">+</button>
          </div>
        </div>
        <div className="flex justify-between text-[18px] font-bold text-[#111827] pt-4 border-t border-black/5">
          <span>Toplam</span><span>{money(total)}</span>
        </div>
        {error && <p className="text-[13px] text-[#B91C1C] mt-3">{error}</p>}
        <button onClick={submit} disabled={loading}
          className="w-full mt-5 py-4 rounded-xl bg-[#7C3AED] text-white font-bold hover:bg-[#6D28D9] transition-colors disabled:opacity-60">
          {loading ? "Gönderiliyor…" : "Siparişi Tamamla"}
        </button>
        <p className="text-[11px] text-[#9CA3AF] text-center mt-3">Ödeme adımı entegrasyonu ayrıca eklenecektir.</p>
      </aside>
    </div>
  );
}
