"use client";

/**
 * DeliveryAlternatives — Conversion Recovery (inline neden + BÜYÜK CTA).
 * ---------------------------------------------------------------------------
 * Ürün seçilen adrese gönderilemiyorsa:
 *   - Teslim edilememe NEDENİ (premium kart)
 *   - BÜYÜK CTA -> /teslimat/[sehir] (Cargo Engine koleksiyon sayfası)
 * "Bulunamadı" çıkmazı YOK. Sayfa aynı kategori + benzer öncelikli, yoksa tüm
 * Türkiye-geneli kargo ürünleri gösterir (asla boş kalmaz). Sahte veri YOK.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, PackageX, ChevronRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  excludeId: number;
  city?: string | null;
  district?: string | null;
  categoryId?: number | null;
}

function slugifyTr(s: string): string {
  const map: Record<string, string> = { "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u", "Ç": "c", "Ğ": "g", "Ö": "o", "Ş": "s", "Ü": "u" };
  return s.split("").map((c) => map[c] ?? c).join("").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function DeliveryAlternatives({ excludeId, city, district, categoryId }: Props) {
  const { t, locale } = useI18n();
  // Şehir adı doğrulanmış adresten (delivery-check yanıtı location.city). Yoksa genel ifade.
  const cityName = (city && city.trim()) || "Bu adrese";
  const hasCity = cityName !== "Bu adrese";
  const toCity = hasCity ? cityName + "'a" : "bu adrese";

  // Recommendation Engine config (admin-yönetimli). Gelmezse mevcut premium metne düşer.
  const [cfg, setCfg] = useState<{ description?: string; cta_text?: string; is_active?: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/recommendation-config")
      .then((r) => r.json())
      .then((d) => { if (alive) setCfg(d?.data ?? null); })
      .catch(() => { if (alive) setCfg(null); });
    return () => { alive = false; };
  }, []);

  const fill = (tpl: string) => tpl.replace(/\{city\}/g, cityName + (cityName.endsWith("adrese") ? "" : "'a"));
  // Admin recommendation-config metni TR'dir → yalnız TR'de kullanılır; diğer dillerde sözlük (iş kuralı değil, sunum).
  const isTr = locale === "tr";
  const descText = isTr && cfg?.description ? cfg.description : t("alt.desc");
  const ctaText = isTr && cfg?.cta_text ? fill(cfg.cta_text) : hasCity ? t("alt.cta", { city: cityName }) : t("alt.ctaGeneric");
  const cityArg = hasCity ? cityName : t("alt.thisAddress");
  const citySlug = slugifyTr(city || "turkiye");
  const q = new URLSearchParams();
  if (excludeId) q.set("from", String(excludeId));
  if (categoryId) q.set("cat", String(categoryId));
  if (city) q.set("il", city);
  const href = `/teslimat/${citySlug}?${q.toString()}`;
  const addrLine = [district, city].filter(Boolean).join(" / ") || t("alt.selectedAddress");

  return (
    <div className="rounded-2xl border border-[#EDE9FE] bg-gradient-to-b from-[#FBFAFE] to-white p-4">
      {/* Neden */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center shrink-0">
          <PackageX className="w-5 h-5 text-[#DC2626]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6D28D9]">
            <MapPin className="w-3.5 h-3.5" /> {t("alt.yourAddress")} · {addrLine}
          </div>
          <p className="text-[13.5px] font-bold text-[#111827] mt-1">{isTr ? `Bu ürün ${toCity} aynı gün gönderilemiyor.` : t("alt.cannotSameDay", { city: cityArg })}</p>
          <p className="text-[12.5px] text-[#6B7280] mt-1 leading-relaxed">
            {isTr ? `Ancak ${toCity} kargoyla gönderebileceğimiz ürünlerimiz var.` : t("alt.butCargo", { city: cityArg })} {descText}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#047857]">{t("alt.eta")}</p>
        </div>
      </div>

      {/* BÜYÜK CTA -> koleksiyon sayfası */}
      <Link
        href={href}
        className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl text-white text-[14px] font-bold transition-all hover:shadow-[0_10px_28px_rgba(124,58,237,0.38)]"
        style={{ background: "linear-gradient(90deg, #7C3AED 0%, #6D28D9 100%)" }}
      >
        <Sparkles className="w-4 h-4" />
        {ctaText}
        <ChevronRight className="w-4 h-4" />
      </Link>
      <p className="mt-2 text-center text-[11px] text-[#9CA3AF]">{t("alt.footer")}</p>
    </div>
  );
}
