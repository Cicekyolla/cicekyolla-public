import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home, SearchX } from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı",
  description:
    "Aradığınız sayfa bulunamadı. ÇiçekYolla koleksiyonlarına veya ana sayfaya güvenle dönebilirsiniz.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const POPULAR_LINKS = [
  { label: "Güller", href: "/kategori/guller" },
  { label: "Orkideler", href: "/kategori/orkideler" },
  { label: "Buketler", href: "/kategori/buketler" },
  { label: "Saksı Bitkileri", href: "/kategori/saksi-bitkileri" },
];

export default function NotFound() {
  return (
    <main className="relative isolate min-h-[72vh] overflow-hidden bg-[#0D0520] px-5 py-20 text-white sm:px-8 lg:py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 78% 18%, rgba(139,92,246,0.34), transparent 34%), radial-gradient(circle at 16% 82%, rgba(168,85,247,0.2), transparent 30%), linear-gradient(145deg, #090012 0%, #190632 52%, #35136D 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <section className="mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-10 w-fit rounded-[24px] border border-white/10 bg-white/[0.06] px-6 py-4 shadow-2xl backdrop-blur">
          <BrandWordmark size="compact" inverse />
        </div>

        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#C4B5FD]/25 bg-[#8B5CF6]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.26em] text-[#D8B4FE]">
          <SearchX className="h-4 w-4" aria-hidden="true" />
          Aradığınız sayfa burada değil
        </div>

        <p
          className="bg-gradient-to-r from-white via-[#E9D5FF] to-[#C4B5FD] bg-clip-text text-[clamp(5rem,18vw,11rem)] font-semibold leading-[0.82] text-transparent"
          style={{ fontFamily: "var(--font-display)" }}
          aria-hidden="true"
        >
          404
        </p>

        <h1
          className="mt-9 text-3xl font-semibold tracking-tight text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bu çiçek başka bir vazoya taşınmış olabilir.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#C9BDD8] sm:text-base">
          Bağlantı değişmiş veya sayfa artık yayında olmayabilir. Ana sayfaya
          dönebilir ya da canlı koleksiyonlarımızdan birini keşfedebilirsiniz.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_38px_rgba(109,40,217,0.38)] transition hover:-translate-y-0.5"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ana Sayfaya Dön
          </Link>
          <Link
            href="/kategori/cicekler"
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-[#C4B5FD]/60 hover:bg-white/[0.11]"
          >
            Çiçekleri Keşfet
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-[#A99ABF]">
            Popüler Koleksiyonlar
          </p>
          <nav className="flex flex-wrap justify-center gap-2.5" aria-label="Popüler koleksiyonlar">
            {POPULAR_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-[#D8CEE5] transition hover:border-[#A78BFA]/50 hover:bg-[#8B5CF6]/15 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
