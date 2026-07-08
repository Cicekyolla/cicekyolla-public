import { AddressAutocomplete } from "@/components/delivery/AddressAutocomplete";

export const metadata = {
  title: "Teslimat Bölgesi Kontrol · CICEKYOLLA",
  robots: { index: false },
};

export default function AdresKontrolPage() {
  return (
    <main className="min-h-screen bg-[#FBFAFE] px-5 py-14">
      <div className="max-w-[560px] mx-auto">
        <p className="text-[11px] font-bold tracking-[0.24em] text-[#7C3AED] uppercase mb-2">Teslimat</p>
        <h1 className="text-[26px] font-bold text-[#111827] mb-2">Teslimat Bölgesi Kontrol</h1>
        <p className="text-[14px] text-[#6B7280] mb-6">
          Adresinizi, mahalle / hastane / okul / AVM adını yazın; teslimat için konumunuzu doğrulayalım.
        </p>
        <AddressAutocomplete />
        <p className="mt-4 text-[12px] text-[#9CA3AF]">
          Seçilen adres verisi (formatted_address · place_id · lat · lng · il · ilçe · mahalle) tarayıcı
          konsoluna yazılır (F12 → Console).
        </p>
      </div>
    </main>
  );
}
