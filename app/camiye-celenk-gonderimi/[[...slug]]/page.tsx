// Yer sayfaları (ADDITIVE, 27 Eki 2026): /camiye-celenk-gonderimi hub'ı ve /camiye-celenk-gonderimi/{yer}. İçerik panelden — bkz. components/place/PlacePage.tsx.
import type { Metadata } from "next";
import { PlacePage, placePageMetadata } from "@/components/place/PlacePage";

export const revalidate = 300;
export const dynamicParams = true;

type Props = { params: { slug?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return placePageMetadata("cami", params);
}

export default async function Page({ params }: Props) {
  return <PlacePage kind="cami" params={params} />;
}
