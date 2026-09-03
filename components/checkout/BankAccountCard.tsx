"use client";

/**
 * BankAccountCard — Havale/EFT hesap kartı (TEK kaynak).
 *
 * Checkout'ta iki yerde görünür: ödeme yöntemi önizlemesi ve sipariş sonrası
 * başarı ekranı. İkisi de BU bileşeni kullanır → ikinci bir hesap kartı yok.
 *
 * TEK YENİLİK: IBAN ve hesap sahibi yanında "Kopyala" düğmesi. IBAN değeri,
 * banka hesapları, havale API'si ve ödeme davranışı DEĞİŞMEDİ.
 * Panoya giden IBAN boşluksuz/büyük harflidir (banka uygulamaları böyle bekler);
 * ekranda okunaklı 4'lü gruplama korunur.
 */

import { ibanPretty, normalizeIban, type BankAccountPublic } from "@/lib/payment";
import { CopyButton } from "@/components/ui/CopyButton";
import { useT } from "@/lib/i18n";

/** Panoya giden değer = ekranda görünenin boşluksuz hâli (tek kaynak). */
function ibanRaw(iban: string): string {
  return normalizeIban(iban);
}

export function BankAccountCard({ account, showNote = false }: { account: BankAccountPublic; showNote?: boolean }) {
  const t = useT();
  const copy = t("common.copy");
  const copied = t("common.copied");
  const failed = t("common.copyFailed");

  return (
    <div className="rounded-xl bg-white border border-[#EDE9FE] px-3.5 py-2.5">
      <div className="text-[12.5px] font-bold text-[#1F2937]">
        {account.bank_name}{account.branch_name ? ` · ${account.branch_name}` : ""}
      </div>

      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 text-[13px] font-mono text-[#4B5563] tracking-wide break-all">
          {ibanPretty(account.iban)}
        </div>
        <CopyButton
          value={ibanRaw(account.iban)}
          label={t("co.copyIban")}
          copyText={copy}
          copiedText={copied}
          failedText={failed}
        />
      </div>

      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 text-[11.5px] text-[#9CA3AF]">
          {account.account_holder}{showNote && account.note ? ` · ${account.note}` : ""}
        </div>
        <CopyButton
          value={account.account_holder}
          label={t("co.copyHolder")}
          copyText={copy}
          copiedText={copied}
          failedText={failed}
        />
      </div>
    </div>
  );
}
