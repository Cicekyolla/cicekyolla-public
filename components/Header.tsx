"use client";

import Link from "next/link";
import { ShoppingCart, Search, X, ArrowRight, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { motion, AnimatePresence } from "motion/react";
import type { MegaGroup } from "@/lib/headerNav";
import { BrandWordmark } from "./BrandWordmark";

/* ─── Mega menu data ─── */
/* ── Extra nav links ── */




/* ─── Header ─── */
export interface HeaderBrand {
  logoUrl?: string;
  logoAlt?: string;
  logoTagline?: string;
}

export function Header({ menu, nav, search, brand }: {
  menu?: Record<string, MegaGroup>;
  nav?: { name: string; href: string }[];
  search?: { name: string; href: string }[];
  brand?: HeaderBrand;
}) {
  // TEK KAYNAK: canlı kategori ağacından türetilen menü; verilmezse/boşsa mevcut
  // hardcoded menü fallback (UI birebir aynı → görsel regresyon YOK).
  const menuData: Record<string, MegaGroup> = menu ?? {}; // TEK KAYNAK: yalnız canlı kategori ağacı; hardcoded/fallback YOK
  const navItems: string[] = Object.keys(menuData);

  // Mobil menü kategori kısmı: canlı nav (fallback: menü anahtarları / hardcoded).
  const mobileCats: { label: string; href: string }[] =
    nav && nav.length > 0
      ? nav.map((c) => ({ label: c.name, href: c.href }))
      : navItems.map((k) => ({ label: k, href: menuData[k].href ?? menuData[k].categories[0]?.href ?? "/" }));

  const [cartCount] = useState(2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [productResults, setProductResults] = useState<Array<{
    slug: string;
    name: string;
    cover_image_url: string | null;
    price_minor: number | string;
  }>>([]);
  const [searching, setSearching] = useState(false);
  // Kategoriler canlı ağaçtan; ürünler /api/search üzerinden canlı katalogdan gelir.
  const categoryResults = query.trim().length >= 1
    ? (search ?? []).filter((c) => c.name.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr"))).slice(0, 4)
    : [];
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const menuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!searchOpen || term.length < 2) {
      setProductResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json() as { products?: typeof productResults };
        setProductResults(body.products ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setProductResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchOpen]);

  const handleMouseEnter = (key: string) => {
    if (menuTimeout.current) clearTimeout(menuTimeout.current);
    setActiveMenu(key);
  };
  const handleMouseLeave = () => {
    menuTimeout.current = setTimeout(() => setActiveMenu(null), 180);
  };

  return (
    <>
      {/* ── Live ticker ── */}
      <div
        style={{ background: "linear-gradient(90deg, #5B21B6 0%, #7C3AED 40%, #9333EA 70%, #8B5CF6 100%)" }}
        className="text-white py-2.5 text-center text-[11px] tracking-[0.18em] uppercase font-medium"
      >
        <span className="hidden sm:inline">
          Bugün 14:00'a kadar sipariş verin &nbsp;—&nbsp; Aynı Gün Teslimat &nbsp;·&nbsp; Türkiye Geneli Ücretsiz Kargo
        </span>
        <span className="sm:hidden">Aynı Gün Teslimat · Ücretsiz Kargo</span>
      </div>

      {/* ── Main header ── */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? "rgba(10,2,22,0.96)"
            : "linear-gradient(180deg, #0D0520 0%, #070011 100%)",
          backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          borderBottom: "1px solid rgba(192,132,252,0.16)",
          boxShadow: scrolled
            ? "0 1px 0 rgba(192,132,252,0.12), 0 14px 40px rgba(7,0,17,0.28)"
            : "0 1px 0 rgba(192,132,252,0.10)",
        }}
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 xl:px-14">
          <div className="flex items-center justify-between h-[82px] lg:h-[92px] gap-4 lg:gap-6 xl:gap-8">

            {/* ── Logo — hero tipografisiyle aynı keskin vektör marka sistemi ── */}
            <Link
              href="/"
              className="group -ml-1 flex flex-shrink-0 items-center rounded-[18px] px-1.5 py-2 transition-colors duration-300 hover:bg-white/[0.04]"
              aria-label="ÇiçekYolla ana sayfa"
            >
              <BrandWordmark logoUrl={brand?.logoUrl} alt={brand?.logoAlt} tagline={brand?.logoTagline} inverse />
            </Link>

            {/* ── Desktop mega nav (root kategoriler — canlı CategoryTree) ── */}
            <nav className="hidden lg:flex items-center flex-1 justify-center" style={{ gap: "clamp(0px, 0.5vw, 4px)" }}>
              {navItems.map((key) => (
                <div
                  key={key}
                  className="relative flex-shrink-0"
                  onMouseEnter={() => handleMouseEnter(key)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className={`whitespace-nowrap font-semibold transition-colors duration-150 rounded-lg ${
                      activeMenu === key
                        ? "text-[#E9D5FF] bg-white/[0.10]"
                        : "text-[#E5E7EB] hover:text-[#E9D5FF] hover:bg-white/[0.07]"
                    }`}
                    style={{
                      padding: "clamp(6px, 0.8vw, 8px) clamp(6px, 0.85vw, 12px)",
                      fontSize: "clamp(10px, 1vw, 11.5px)",
                      letterSpacing: "clamp(0.02em, 0.04em, 0.05em)",
                      textTransform: "uppercase",
                    }}
                  >
                    {key}
                  </button>
                </div>
              ))}
            </nav>

            {/* ── Actions ── */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-[#D1D5DB] hover:text-[#E9D5FF] hover:bg-white/[0.08] transition-all"
              >
                {searchOpen ? <X className="w-4.5 h-4.5" /> : <Search className="w-4.5 h-4.5" />}
              </button>

              <Link href="/sepet">
                <button className="relative w-11 h-11 flex items-center justify-center rounded-full text-[#D1D5DB] hover:text-[#E9D5FF] hover:bg-white/[0.08] transition-all">
                  <ShoppingCart className="w-4.5 h-4.5" />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
                    >
                      {cartCount}
                    </span>
                  )}
                </button>
              </Link>

              {/* Mobile menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-full text-[#D1D5DB] hover:text-[#E9D5FF] hover:bg-white/[0.08] transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M4 7h16M4 12h10M4 17h16" />
                    </svg>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-7 border-b border-black/[0.05]">
                      <div className="flex items-center">
<BrandWordmark logoUrl={brand?.logoUrl} alt={brand?.logoAlt} tagline={brand?.logoTagline} size="compact" />
                      </div>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-5 space-y-1">
                      {/* Ana Sayfa */}
                      <Link
                        href="/"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[13px] font-semibold text-[#374151] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all uppercase tracking-wide"
                      >
                        Ana Sayfa
                        <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                      </Link>

                      {/* Kategoriler — alt kategorili olanlar ACCORDION, diğerleri direkt link */}
                      {mobileCats.map((cat) => {
                        const group = menuData[cat.label];
                        const subs = group?.categories ?? [];
                        const hasSubs = subs.length > 0;
                        const isOpen = mobileExpanded === cat.label;
                        if (!hasSubs) {
                          return (
                            <Link
                              key={cat.href}
                              href={cat.href}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[13px] font-semibold text-[#374151] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all uppercase tracking-wide"
                            >
                              {cat.label}
                              <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                            </Link>
                          );
                        }
                        return (
                          <div key={cat.label} className="rounded-xl overflow-hidden">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              onClick={() => setMobileExpanded(isOpen ? null : cat.label)}
                              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-[13px] font-semibold uppercase tracking-wide transition-all ${isOpen ? "text-[#8B5CF6] bg-[#F5F3FF]" : "text-[#374151] hover:text-[#8B5CF6] hover:bg-[#F5F3FF]"}`}
                            >
                              {cat.label}
                              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#8B5CF6]" : "opacity-50"}`} />
                            </button>
                            <div
                              className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                              style={{ maxHeight: isOpen ? `${(subs.length + 1) * 44 + 8}px` : "0px" }}
                            >
                              <div className="pl-3 pr-1 py-1 space-y-0.5">
                                <Link
                                  href={cat.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all"
                                >
                                  Tüm {cat.label}
                                  <ArrowRight className="w-3 h-3 opacity-60" />
                                </Link>
                                {subs.map((s) => (
                                  <Link
                                    key={s.href}
                                    href={s.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block px-4 py-2.5 rounded-lg text-[12.5px] text-[#4B5563] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all"
                                  >
                                    {s.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Statik bağlantılar */}
                      {[
                        { label: "🌿 Dekorasyon & Peyzaj", href: "/dekorasyon" },
                        { label: "Teslimat Bölgeleri", href: "/teslimat-bolgeleri" },
                        { label: "Hakkımızda", href: "/hakkimizda" },
                        { label: "Blog", href: "/blog" },
                        { label: "Kurumsal", href: "/kurumsal" },
                        { label: "SSS", href: "/sss" },
                        { label: "İletişim", href: "/iletisim" },
                        { label: "Sepetim", href: "/sepet" },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[13px] font-semibold text-[#374151] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all uppercase tracking-wide"
                        >
                          {item.label}
                          <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                        </Link>
                      ))}
                    </nav>
                    <div className="p-5 border-t border-black/[0.05]">
                      <a
                        href="https://wa.me/905074413474"
                        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white text-sm font-semibold"
                        style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 6px 20px rgba(37,211,102,0.3)" }}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        WhatsApp ile Sipariş Ver
                      </a>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* ── Search bar ── */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-visible pb-4"
              >
                <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Gül, orkide, buket, özel gün ara..."
                    className="w-full pl-11 pr-5 py-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-full text-sm text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#8B5CF6] focus:bg-white transition-all"
                  />
                  {/* Yazarken canlı ürün + kategori önerileri */}
                  {query.trim().length >= 2 && (searching || productResults.length > 0 || categoryResults.length > 0) && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] overflow-hidden z-[70] max-h-[440px] overflow-y-auto">
                      {searching && productResults.length === 0 && (
                        <div className="px-4 py-4 text-sm text-[#9CA3AF]">Ürünler aranıyor…</div>
                      )}
                      {productResults.map((product) => {
                        const price = Math.round(Number(product.price_minor) / 100).toLocaleString("tr-TR");
                        return (
                          <Link
                            key={product.slug}
                            href={`/urun/${product.slug}`}
                            onClick={() => { setSearchOpen(false); setQuery(""); setProductResults([]); }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F3FF] transition-colors border-b border-black/[0.04]"
                          >
                            {product.cover_image_url ? (
                              <img src={product.cover_image_url} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover bg-[#F9FAFB] flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-[#374151] truncate">{product.name}</div>
                              <div className="text-xs font-bold text-[#8B5CF6] mt-0.5">₺{price}</div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-[#D1D5DB] flex-shrink-0" />
                          </Link>
                        );
                      })}
                      {categoryResults.map((category) => (
                        <Link
                          key={category.href}
                          href={category.href}
                          onClick={() => { setSearchOpen(false); setQuery(""); setProductResults([]); }}
                          className="flex items-center justify-between px-4 py-3 text-sm text-[#374151] hover:bg-[#F5F3FF] hover:text-[#8B5CF6] transition-colors border-b border-black/[0.04] last:border-0"
                        >
                          <span><span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mr-2">Kategori</span>{category.name}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#D1D5DB]" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {query.trim().length >= 2 && !searching && productResults.length === 0 && categoryResults.length === 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] z-[70] px-4 py-4 text-sm text-[#6B7280]">
                      Sonuç bulunamadı.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Mega menu dropdown ── */}
        <AnimatePresence>
          {activeMenu && menuData[activeMenu] && (
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 top-full overflow-x-hidden"
              onMouseEnter={() => { if (menuTimeout.current) clearTimeout(menuTimeout.current); }}
              onMouseLeave={handleMouseLeave}
              style={{
                background: "rgba(255,255,255,0.98)",
                backdropFilter: "blur(24px) saturate(180%)",
                borderTop: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(139,92,246,0.06)",
              }}
            >
              <div className="max-w-[1440px] mx-auto px-8 xl:px-14 py-8 xl:py-10">
                <div className="grid grid-cols-[1fr_220px] xl:grid-cols-[1fr_280px] gap-8 xl:gap-12">
                  {/* Categories: child (başlık) + grandchild (alt linkler) — tam alt ağaç */}
                  <div>
                    <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-6">
                      {activeMenu} Koleksiyonu
                    </p>
                    <div
                      className="grid grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-6"
                      style={{ maxHeight: "min(62vh, 520px)", overflowY: "auto" }}
                    >
                      {menuData[activeMenu].columns.map((col) => (
                        <div key={col.href}>
                          <Link
                            href={col.href}
                            onClick={() => setActiveMenu(null)}
                            className="block text-sm font-semibold text-[#111827] hover:text-[#8B5CF6] transition-colors pb-1.5 border-b border-black/[0.06]"
                          >
                            {col.title}
                          </Link>
                          {col.links.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                              {col.links.map((l) => (
                                <li key={l.href}>
                                  <Link
                                    href={l.href}
                                    onClick={() => setActiveMenu(null)}
                                    className="text-[13px] text-[#6B7280] hover:text-[#8B5CF6] transition-colors"
                                  >
                                    {l.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                    <Link
                      href={menuData[activeMenu].href}
                      onClick={() => setActiveMenu(null)}
                      className="inline-flex items-center gap-2 mt-6 text-xs font-bold text-[#8B5CF6] uppercase tracking-widest hover:gap-3 transition-all"
                    >
                      Tüm {activeMenu}'i Gör <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Featured card: banner_image varsa görsel, yoksa premium placeholder */}
                  <Link
                    href={menuData[activeMenu].featured.href}
                    onClick={() => setActiveMenu(null)}
                    className="group relative overflow-hidden rounded-2xl aspect-[4/5]"
                  >
                    {menuData[activeMenu].featured.image ? (
                      <img
                        src={menuData[activeMenu].featured.image!}
                        alt={menuData[activeMenu].featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="w-full h-full"
                        style={{ background: "linear-gradient(150deg, #7C3AED 0%, #A855F7 55%, #C084FC 100%)" }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-5">
                      <p className="text-[10px] tracking-widest text-[#E9D5FF] uppercase font-semibold mb-1">Koleksiyon</p>
                      <h3
                        style={{ fontFamily: "var(--font-display)", lineHeight: 1.1, whiteSpace: "pre-line" }}
                        className="text-white text-xl font-semibold mb-3"
                      >
                        {menuData[activeMenu].featured.title}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-white/80 text-xs font-medium group-hover:text-white transition-colors">
                        İncele <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
