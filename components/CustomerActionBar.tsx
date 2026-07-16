import Link from "next/link";
import { ChevronDown, PackageSearch, ShoppingCart, UserRound } from "lucide-react";

export function CustomerActionBar() {
  return (
    <div className="border-b border-[#ede9fe] bg-white/95 px-5 py-3 backdrop-blur lg:px-14">
      <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-3 text-[#111827]">
        <Link href="/siparis-takibi" className="hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f5f3ff] hover:text-[#7c3aed] sm:inline-flex">
          <PackageSearch className="h-5 w-5" /> Sipariş Takibi
        </Link>
        <Link href="/giris" className="hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f5f3ff] hover:text-[#7c3aed] sm:inline-flex">
          <UserRound className="h-5 w-5" /> Üyelik <ChevronDown className="h-4 w-4" />
        </Link>
        <Link href="/sepet" className="relative grid h-14 w-16 place-items-center rounded-[10px] bg-gradient-to-br from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] text-white shadow-[0_12px_28px_rgba(139,92,246,.28)] transition hover:scale-[1.02]" aria-label="Sepetim">
          <ShoppingCart className="h-8 w-8" />
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#dc2626] text-[11px] font-bold text-white ring-2 ring-white">1</span>
        </Link>
      </div>
    </div>
  );
}
