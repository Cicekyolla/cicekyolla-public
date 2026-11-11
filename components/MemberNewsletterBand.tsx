"use client";

// Metinler sözlükten (Paket E): /sepet ve /checkout öneksiz rotalarında yabancı dilli
// müşteri bu bandı kendi dilinde görür. TR metinleri sözlükte birebir aynıdır.
import Link from "next/link";
import { useT } from "@/lib/i18n";

export function MemberNewsletterBand() {
  const t = useT();
  return (
    <section className="border-t border-[#ede9fe] bg-gradient-to-b from-[#f5f0ff] to-[#fbfafd] px-6 py-16 lg:px-14">
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[1fr_640px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.34em] text-[#8b5cf6]">{t("news.eyebrow")}</p>
          <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#0f172a] md:text-5xl">{t("news.title")}</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#98a2b3]">{t("news.desc")}</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="min-w-0 flex-1 rounded-full border border-[#8b5cf6] bg-white px-7 shadow-[0_14px_40px_rgba(139,92,246,.08)] focus-within:ring-4 focus-within:ring-[#ede9fe]">
            <span className="sr-only">{t("news.email")}</span>
            <input type="email" placeholder={t("news.email")} className="h-16 w-full bg-transparent text-base text-[#111827] outline-none placeholder:text-[#98a2b3]" />
          </label>
          <Link href="/giris" className="inline-flex h-16 items-center justify-center rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] px-10 text-base font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)] transition hover:scale-[1.02]">
            {t("news.subscribe")}
          </Link>
        </div>
      </div>
    </section>
  );
}
