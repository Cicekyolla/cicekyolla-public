"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays, ChevronDown, Clock3, Gift, LogOut, MapPin,
  Package, Route, Sparkles, Star, Ticket, Truck, UserRound,
} from "lucide-react";

type Coupon = {
  id: number; name: string; code: string; percentage: number | null;
  status: string; usage_limit: number; used_count: number;
};
type OrderItem = {
  id: number; product_name: string; variant_label: string | null;
  quantity: number; total_price_minor: number;
};
type StatusLog = {
  id: number; old_status: string | null; new_status: string;
  note: string | null; created_at: string;
};
type MemberOrder = {
  id: number; order_number: string; status: string; payment_status: string;
  delivery_date: string | null; delivery_time_slot: string | null;
  delivery_city: string | null; delivery_district: string | null;
  recipient_name: string; total_amount_minor: number; currency: string;
  created_at: string; updated_at: string; items: OrderItem[]; timeline: StatusLog[];
};
type LedgerEntry = {
  id: number; order_id: number | null; entry_type: string; points: number;
  description: string; created_at: string;
};
type Loyalty = {
  available_points: number; pending_points: number; lifetime_earned: number;
  tier: string; points_per_100_try: number; is_active: boolean;
  silver_threshold: number; gold_threshold: number; premium_threshold: number;
  ledger: LedgerEntry[];
};
type Account = {
  customer: {
    name: string; email: string; phone: string | null;
    member_since: string; last_login: string | null;
  };
  coupons: Coupon[]; orders: MemberOrder[]; loyalty: Loyalty;
};

const STATUS: Record<string, { label: string; icon: typeof Package }> = {
  new: { label: "Sipariş alındı", icon: Package },
  confirmed: { label: "Sipariş onaylandı", icon: Sparkles },
  preparing: { label: "Ürün hazırlanıyor", icon: Gift },
  designing: { label: "Tasarım hazırlanıyor", icon: Sparkles },
  ready: { label: "Teslimata hazır", icon: Package },
  courier: { label: "Kuryeye verildi", icon: Truck },
  delivering: { label: "Yola çıktı", icon: Route },
  delivered: { label: "Teslim edildi", icon: Star },
  cancelled: { label: "İptal edildi", icon: Package },
};

const TIER: Record<string, string> = {
  standard: "Standart", silver: "Gümüş", gold: "Altın", premium: "Premium",
};

const money = (minor: number) => new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", minimumFractionDigits: 2,
}).format(Number(minor || 0) / 100);

const dateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const deliveryDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`))
  : "Tarih belirlenmedi";

function nextTier(loyalty: Loyalty) {
  const rules = [
    ["silver", loyalty.silver_threshold],
    ["gold", loyalty.gold_threshold],
    ["premium", loyalty.premium_threshold],
  ] as const;
  return rules.find(([, threshold]) => loyalty.lifetime_earned < threshold) ?? null;
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("Oturum açmanız gerekiyor.");
        if (!res.ok) throw new Error("Hesap bilgileri alınamadı.");
        return res.json();
      })
      .then(setAccount)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) return <main className="min-h-[60vh] bg-background px-6 py-16 text-center text-muted-foreground">Hesabınız yükleniyor…</main>;
  if (error || !account) return <main className="min-h-[60vh] bg-background px-6 py-16 text-center text-muted-foreground"><p>{error || "Hesap bulunamadı."}</p><a href="/giris" className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Giriş Yap</a></main>;

  const initials = account.customer.name.split(/\s+/).map((value) => value[0]).join("").slice(0, 2).toUpperCase();
  const upcoming = account.orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const completed = account.orders.filter((order) => ["delivered", "cancelled"].includes(order.status));
  const target = nextTier(account.loyalty);
  const progress = target ? Math.min(100, Math.round((account.loyalty.lifetime_earned / target[1]) * 100)) : 100;

  return <main className="min-h-[70vh] bg-background px-4 py-8 text-foreground sm:px-6 lg:px-14 lg:py-14">
    <div className="mx-auto max-w-[1240px] space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-8">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">{initials}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-primary">Müşteri paneli</p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Hoş geldiniz, {account.customer.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{account.customer.email}{account.customer.phone ? ` · ${account.customer.phone}` : ""}</p>
          </div>
        </div>
        <button onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"><LogOut className="h-4 w-4" /> Çıkış Yap</button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Package} label="Aktif sipariş" value={String(upcoming.length)} detail={`${account.orders.length} toplam sipariş`} />
        <Metric icon={Star} label="Kullanılabilir puan" value={String(account.loyalty.available_points)} detail={`${account.loyalty.lifetime_earned} toplam kazanım`} />
        <Metric icon={Ticket} label="Aktif kupon" value={String(account.coupons.filter((coupon) => coupon.status === "available").length)} detail="Gerçek hesabınıza tanımlı" />
        <Metric icon={UserRound} label="Üyelik seviyesi" value={TIER[account.loyalty.tier] ?? account.loyalty.tier} detail={`Üyelik: ${dateTime(account.customer.member_since)}`} />
      </section>

      {account.loyalty.is_active && <section className="rounded-[24px] border border-border bg-gradient-to-br from-secondary to-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Sadakat ve puan</p><h2 className="mt-2 font-display text-2xl font-semibold">{account.loyalty.available_points} kullanılabilir puan</h2><p className="mt-2 text-sm text-muted-foreground">Teslim edilen her 100 TL için {account.loyalty.points_per_100_try} puan kazanılır. İptal edilen siparişin puanı otomatik geri alınır.</p></div>
          <span className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{TIER[account.loyalty.tier] ?? account.loyalty.tier}</span>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-accent"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{target ? `${TIER[target[0]]} seviyesi için ${Math.max(0, target[1] - account.loyalty.lifetime_earned)} puan kaldı.` : "En yüksek üyelik seviyesindesiniz."}</p>
        {account.loyalty.ledger.length > 0 && <div className="mt-5 grid gap-2 md:grid-cols-2">{account.loyalty.ledger.slice(0, 6).map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-[16px] border border-border bg-card/80 px-4 py-3"><div><p className="text-sm font-semibold">{entry.description}</p><p className="mt-1 text-xs text-muted-foreground">{dateTime(entry.created_at)}</p></div><strong className={entry.points > 0 ? "text-primary" : "text-destructive"}>{entry.points > 0 ? "+" : ""}{entry.points}</strong></div>)}</div>}
      </section>}

      <OrderSection title="Aktif siparişler" orders={upcoming} empty="Şu anda devam eden siparişiniz bulunmuyor." />
      <OrderSection title="Geçmiş siparişler" orders={completed} empty="Henüz tamamlanmış siparişiniz bulunmuyor." />

      <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
        <div className="flex items-center gap-3"><Ticket className="h-6 w-6 text-primary" /><h2 className="font-display text-xl font-semibold">Kuponlarım</h2></div>
        {account.coupons.length === 0 ? <p className="mt-6 rounded-[18px] bg-muted p-5 text-muted-foreground">Henüz hesabınıza tanımlanmış kupon bulunmuyor.</p> :
          <div className="mt-6 grid gap-4 md:grid-cols-2">{account.coupons.map((coupon) => <article key={coupon.id} className="rounded-[20px] border border-border bg-secondary/60 p-6"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{coupon.name}</p><p className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-sm font-black tracking-wide text-accent-foreground">{coupon.code}</p></div>{coupon.percentage != null && <strong className="text-3xl font-black text-primary">%{coupon.percentage}</strong>}</div><p className="mt-5 text-sm text-muted-foreground">{coupon.status === "available" ? "Kullanılabilir" : "Kullanıldı"}</p></article>)}</div>}
      </section>
    </div>
  </main>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Package; label: string; value: string; detail: string }) {
  return <article className="rounded-[22px] border border-border bg-card p-5 shadow-[0_12px_35px_rgba(45,22,72,.04)]"><span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary"><Icon className="h-5 w-5" /></span><p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>;
}

function OrderSection({ title, orders, empty }: { title: string; orders: MemberOrder[]; empty: string }) {
  return <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Package className="h-6 w-6 text-primary" /><h2 className="font-display text-xl font-semibold">{title}</h2></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{orders.length}</span></div>
    {orders.length === 0 ? <p className="mt-6 rounded-[18px] bg-muted p-5 text-muted-foreground">{empty}</p> : <div className="mt-6 space-y-4">{orders.map((order) => <OrderCard key={order.id} order={order} />)}</div>}
  </section>;
}

function OrderCard({ order }: { order: MemberOrder }) {
  const current = STATUS[order.status] ?? { label: order.status, icon: Package };
  const CurrentIcon = current.icon;
  return <details className="group rounded-[20px] border border-border bg-card open:bg-secondary/30">
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary"><CurrentIcon className="h-5 w-5" /></span><div><p className="font-black text-primary">{order.order_number}</p><p className="mt-1 text-sm text-muted-foreground">{dateTime(order.created_at)} · {order.recipient_name}</p></div></div>
      <div className="flex items-center gap-4"><div className="text-right"><p className="font-bold">{current.label}</p><p className="mt-1 text-sm text-muted-foreground">{money(order.total_amount_minor)}</p></div><ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" /></div>
    </summary>
    <div className="border-t border-border px-5 pb-6 pt-5">
      <div className="grid gap-3 rounded-[16px] bg-card p-4 sm:grid-cols-3">
        <Info icon={CalendarDays} label="Teslimat tarihi" value={deliveryDate(order.delivery_date)} />
        <Info icon={Clock3} label="Saat aralığı" value={order.delivery_time_slot || "Saat belirlenmedi"} />
        <Info icon={MapPin} label="Teslimat bölgesi" value={[order.delivery_district, order.delivery_city].filter(Boolean).join(", ") || "Bölge bilgisi yok"} />
      </div>
      {order.items.length > 0 && <div className="mt-5"><h3 className="text-sm font-bold">Ürünler</h3><div className="mt-2 divide-y divide-border">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span>{item.product_name}{item.variant_label ? ` · ${item.variant_label}` : ""} × {item.quantity}</span><strong>{money(item.total_price_minor)}</strong></div>)}</div></div>}
      <div className="mt-5"><h3 className="text-sm font-bold">Sipariş zaman çizelgesi</h3>{order.timeline.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Henüz durum hareketi bulunmuyor.</p> : <ol className="mt-4 space-y-0">{order.timeline.map((log, index) => { const status = STATUS[log.new_status] ?? { label: log.new_status, icon: Package }; const Icon = status.icon; return <li key={log.id} className="relative flex gap-3 pb-5 last:pb-0"><span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-primary"><Icon className="h-4 w-4" /></span>{index < order.timeline.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-36px)] w-px bg-border" />}<div><p className="text-sm font-bold">{status.label}</p><p className="mt-1 text-xs text-muted-foreground">{dateTime(log.created_at)}</p>{log.note && <p className="mt-1 text-sm text-muted-foreground">{log.note}</p>}</div></li>; })}</ol>}</div>
      <a href={`/siparis-takip?order=${encodeURIComponent(order.order_number)}`} className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-secondary"><Route className="h-4 w-4" /> Siparişi takip et</a>
    </div>
  </details>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div></div>;
}
