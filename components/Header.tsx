"use client";

import Link from "next/link";
import { ShoppingCart, Search, X, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { motion, AnimatePresence } from "motion/react";

type MegaGroup = {
  href: string;
  featured?: { label: string; title: string; href: string; image: string };
  categories: { name: string; sub?: string; href: string }[];
};

type SimpleLink = { name: string; href: string };

export function Header({ menu, nav, search }: { menu?: Record<string, MegaGroup>; nav?: SimpleLink[]; search?: SimpleLink[] }) {
  const menuData: Record<string, MegaGroup> = menu ?? {};
  const navItems = Object.keys(menuData);
  const mobileCats = nav && nav.length > 0
    ? nav.map((c) => ({ label: c.name, href: c.href }))
    : navItems.map((key) => ({ label: key, href: menuData[key]?.href ?? "/" }));

  const [cartCount] = useState(2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const menuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchResults = query.trim().length >= 1
    ? (search ?? [])
        .filter((c) => c.name.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")))
        .slice(0, 8)
    : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleMouseEnter = (key: string) => {
    if (menuTimeout.current) clearTimeout(menuTimeout.current);
    setActiveMenu(key);
  };

  const handleMouseLeave = () => {
    menuTimeout.current = setTimeout(() => setActiveMenu(null), 160);
  };

  return (
    <>
      <div
        style={{ background: "linear-gradient(90deg, #5B21B6 0%, #7C3AED 40%, #9333EA 70%, #8B5CF6 100%)" }}
        className="text-white py-2.5 text-center text-[11px] tracking-[0.18em] uppercase font-medium"
      >
        <span className="hidden sm:inline">Bugün 14:00&apos;a kadar sipariş verin — Aynı Gün Teslimat · Türkiye Geneli Ücretsiz Kargo</span>
        <span className="sm:hidden">Aynı Gün Teslimat · Ücretsiz Kargo</span>
      </div>

      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,1)",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          boxShadow: scrolled
            ? "0 1px 0 rgba(0,0,0,0.06), 0 8px 32px rgba(139,92,246,0.06)"
            : "0 1px 0 rgba(0,0,0,0.05)",
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 xl:px-10 2xl:px-14">
          <div className="flex items-center justify-between h-[68px] lg:h-[72px] gap-3 xl:gap-5 min-w-0">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 xl:gap-3 group min-w-0">
              <div
                className="w-9 h-9 xl:w-10 xl:h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)", boxShadow: "0 4px 16px rgba(139,92,246,0.35)" }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.5 2 6 5 6 8c0 2.5 1.5 4.5 3 5.5.5.3 1 .5 1.5.7V20a1 1 0 002 0v-5.8c.5-.2 1-.4 1.5-.7C15.5 12.5 18 10.5 18 8c0-3-2.5-6-6-6z" />
                  <path strokeLinecap="round" d="M9 8c0-1.7 1.3-3 3-3s3 1.3 3 3" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", lineHeight: 1 }} className="text-[17px] xl:text-[21px] font-semibold text-[#111827] uppercase whitespace-nowrap">
                  Çiçekyolla
                </span>
                <span className="hidden sm:block text-[8px] xl:text-[9px] text-[#8B5CF6] uppercase font-semibold whitespace-nowrap" style={{ letterSpacing: "0.28em" }}>
                  Premium Florist
                </span>
              </div>
            </Link>

            <nav className="hidden xl:flex items-center justify-center flex-1 min-w-0 overflow-visible gap-0.5 2xl:gap-1">
              {navItems.map((key) => (
                <div key={key} className="relative flex-shrink-0" onMouseEnter={() => handleMouseEnter(key)} onMouseLeave={handleMouseLeave}>
                  <button
                    className={`whitespace-nowrap font-semibold transition-colors duration-150 rounded-lg ${
                      activeMenu === key ? "text-[#8B5CF6] bg-[#F5F3FF]" : "text-[#374151] hover:text-[#8B5CF6] hover:bg-[#F5F3FF]"
                    }`}
                    style={{ padding: "7px 9px", fontSize: "11px", letterSpacing: "0.045em", textTransform: "uppercase" }}
                  >
                    {key}
                  </button>
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setSearchOpen(!searchOpen)} className="w-11 h-11 flex items-center justify-center rounded-full text-[#6B7280] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all" aria-label="Ara">
                {searchOpen ? <X className="w-4.5 h-4.5" /> : <Search className="w-4.5 h-4.5" />}
              </button>

              <Link href="/sepet" aria-label="Sepet">
                <button className="relative w-11 h-11 flex items-center justify-center rounded-full text-[#6B7280] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all">
                  <ShoppingCart className="w-4.5 h-4.5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}>
                      {cartCount}
                    </span>
                  )}
                </button>
              </Link>

              <Sheet>
                <SheetTrigger asChild>
                  <button className="xl:hidden w-11 h-11 flex items-center justify-center rounded-full text-[#6B7280] hover:bg-[#F5F3FF] transition-all" aria-label="Menü">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M4 7h16M4 12h10M4 17h16" />
                    </svg>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-7 border-b border-black/[0.05]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.5 2 6 5 6 8c0 2.5 1.5 4.5 3 5.5.5.3 1 .5 1.5.7V20a1 1 0 002 0v-5.8c.5-.2 1-.4 1.5-.7C15.5 12.5 18 10.5 18 8c0-3-2.5-6-6-6z" />
                          </svg>
                        </div>
                        <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em" }} className="text-lg font-semibold text-[#111827] uppercase">Çiçekyolla</span>
                      </div>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-5 space-y-1">
                      {[{ label: "Ana Sayfa", href: "/" }, ...mobileCats, { label: "Teslimat Bölgeleri", href: "/teslimat-bolgeleri" }, { label: "Blog", href: "/blog" }, { label: "SSS", href: "/sss" }, { label: "İletişim", href: "/iletisim" }, { label: "Sepetim", href: "/sepet" }].map((item) => (
                        <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[13px] font-semibold text-[#374151] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] transition-all uppercase tracking-wide">
                          {item.label}
                          <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                        </Link>
                      ))}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="overflow-visible pb-4">
                <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Gül, orkide, buket, özel gün ara..." className="w-full pl-11 pr-5 py-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-full text-sm text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#8B5CF6] focus:bg-white transition-all" />
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] overflow-hidden z-20">
                      {searchResults.map((r) => (
                        <Link key={r.href} href={r.href} onClick={() => { setSearchOpen(false); setQuery(""); }} className="flex items-center justify-between px-4 py-3 text-sm text-[#374151] hover:bg-[#F5F3FF] hover:text-[#8B5CF6] transition-colors border-b border-black/[0.04] last:border-0">
                          {r.name}
                          <ArrowRight className="w-3.5 h-3.5 text-[#D1D5DB]" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              style={{ background: "rgba(255,255,255,0.98)", backdropFilter: "blur(24px) saturate(180%)", borderTop: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(139,92,246,0.06)" }}
            >
              <div className="max-w-[1440px] mx-auto px-8 xl:px-12 py-8 xl:py-10">
                <div className="grid grid-cols-[minmax(0,1fr)_240px] 2xl:grid-cols-[minmax(0,1fr)_280px] gap-8 xl:gap-12">
                  <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-6">{activeMenu} Koleksiyonu</p>
                    <div className="grid grid-cols-2 2xl:grid-cols-3 gap-x-8 2xl:gap-x-10 gap-y-1 max-h-[460px] overflow-y-auto pr-2">
                      {menuData[activeMenu].categories.map((cat) => (
                        <Link key={`${activeMenu}-${cat.href}-${cat.name}`} href={cat.href} onClick={() => setActiveMenu(null)} className="group flex items-center justify-between py-3 border-b border-black/[0.04] hover:border-[#DDD6FE] transition-colors min-w-0">
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-semibold text-[#111827] group-hover:text-[#8B5CF6] transition-colors truncate">{cat.name}</p>
                            {cat.sub ? <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">{cat.sub}</p> : null}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-[#D1D5DB] group-hover:text-[#8B5CF6] group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      ))}
                    </div>
                    <Link href={menuData[activeMenu].href} onClick={() => setActiveMenu(null)} className="inline-flex items-center gap-2 mt-6 text-xs font-bold text-[#8B5CF6] uppercase tracking-widest hover:gap-3 transition-all">
                      Tüm {activeMenu}&apos;i Gör <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {menuData[activeMenu].featured ? (
                    <Link href={menuData[activeMenu].featured.href} onClick={() => setActiveMenu(null)} className="group relative overflow-hidden rounded-2xl aspect-[4/5]">
                      <img src={menuData[activeMenu].featured.image} alt={menuData[activeMenu].featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-5">
                        <p className="text-[10px] tracking-widest text-[#C084FC] uppercase font-semibold mb-1">{menuData[activeMenu].featured.label}</p>
                        <h3 style={{ fontFamily: "var(--font-display)", lineHeight: 1.1, whiteSpace: "pre-line" }} className="text-white text-xl font-semibold mb-3">{menuData[activeMenu].featured.title}</h3>
                        <span className="inline-flex items-center gap-1.5 text-white/80 text-xs font-medium group-hover:text-white transition-colors">İncele <ArrowRight className="w-3 h-3" /></span>
                      </div>
                    </Link>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
