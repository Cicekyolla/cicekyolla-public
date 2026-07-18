import type { Metadata } from "next";
import { fetchSeoPage } from "@/lib/api";
import { DecorationExperience } from "@/components/decor/DecorationExperience";

export const metadata: Metadata = {
  title: "Yapay Çiçek ve Mekan Dekorasyonu — ÇiçekYolla",
  description: "Otel, ofis, kafe, restoran ve organizasyonlara özel premium yapay çiçek, yapay şimşir, yeşil duvar ve anahtar teslim dekorasyon çözümleri.",
};

export default async function DecorationPage() {
  const managed = await fetchSeoPage("/dekorasyon");
  return <DecorationExperience blocks={managed?.body_blocks ?? []} />;
}
