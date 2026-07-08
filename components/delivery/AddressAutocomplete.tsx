"use client";

/**
 * CICEKYOLLA OS — Google Maps Adres Arama & Konum Doğrulama (ADDITIVE, yeniden kullanılabilir)
 * -----------------------------------------------------------------------------------------
 * • Google Places Autocomplete (özel premium dropdown) + harita pin + elle düzeltme.
 * • Seçilen adresten: formatted_address, place_id, lat, lng, city (il), district (ilçe), neighborhood (mahalle).
 * • Google YALNIZ adres/koordinat doğrulama için. Teslimat KARARI (aynı gün/ücret/süre) CICEKYOLLA
 *   backend'inden verilecek — bu bileşen sadece "hazır veri" üretir (onSelect ile dışarı verir).
 * • API key ENV'den: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (koda YAZILMAZ). Domain restriction Google Cloud'da.
 * • Key yoksa/başarısızsa nazik durum gösterir; mevcut sistemi bozmaz.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2, Check, AlertCircle } from "lucide-react";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export interface SelectedAddress {
  formattedAddress: string;
  placeId: string;
  lat: number;
  lng: number;
  city: string;
  district: string;
  neighborhood: string;
  source: "autocomplete" | "manual";
}

// Google Maps JS API'sini tek sefer yükler (singleton). @types/google.maps bağımlılığı yok — loose any.
// loading=async modunda kütüphaneler importLibrary ile beklenir (onload'da places henüz HAZIR DEĞİL).
let gmapsPromise: Promise<unknown> | null = null;
function loadGoogleMaps(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject(new Error("NO_WINDOW"));
  const w = window as unknown as { google?: { maps?: { importLibrary?: unknown } } };
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google);
  if (gmapsPromise) return gmapsPromise;
  if (!KEY) return Promise.reject(new Error("NO_KEY"));
  gmapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&language=tr&region=TR&loading=async`;
    s.async = true;
    s.onload = () => resolve((window as unknown as { google: unknown }).google);
    s.onerror = () => reject(new Error("LOAD_FAIL"));
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseComponents(components: any[]): { city: string; district: string; neighborhood: string } {
  const get = (type: string) => components?.find((c) => c.types?.includes(type))?.long_name ?? "";
  return {
    city: get("administrative_area_level_1"), // il
    district: get("administrative_area_level_2"), // ilçe
    neighborhood:
      get("administrative_area_level_4") ||
      get("neighborhood") ||
      get("sublocality_level_1") ||
      get("sublocality") ||
      get("administrative_area_level_3"), // mahalle (fallback'li)
  };
}

export function AddressAutocomplete({
  onSelect,
  placeholder = "Mahalle, sokak, hastane, okul, AVM veya adres girin",
  showMap = true,
}: {
  onSelect?: (a: SelectedAddress) => void;
  placeholder?: string;
  showMap?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<null | "NO_KEY" | "LOAD_FAIL">(null);
  const [query, setQuery] = useState("");
  const [preds, setPreds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedAddress | null>(null);
  const [open, setOpen] = useState(false);

  const svcRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const tokenRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then(async (g: any) => {
        // Kütüphaneleri AYRI AYRI bekle (async mod) — bu kritik.
        const placesLib = await g.maps.importLibrary("places");
        await g.maps.importLibrary("geocoding");
        await g.maps.importLibrary("maps");
        if (!alive) return;
        svcRef.current = new placesLib.AutocompleteService();
        placesRef.current = new placesLib.PlacesService(document.createElement("div"));
        geocoderRef.current = new g.maps.Geocoder();
        tokenRef.current = new placesLib.AutocompleteSessionToken();
        setReady(true);
      })
      .catch((e: Error) => setErr(e.message === "NO_KEY" ? "NO_KEY" : "LOAD_FAIL"));
    return () => {
      alive = false;
    };
  }, []);

  // Debounced tahminler
  useEffect(() => {
    if (!ready || query.trim().length < 3) {
      setPreds([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      svcRef.current.getPlacePredictions(
        { input: query, componentRestrictions: { country: "tr" }, sessionToken: tokenRef.current },
        (res: any[]) => {
          setPreds(res ?? []);
          setLoading(false);
          setOpen(true);
        },
      );
    }, 250);
    return () => clearTimeout(t);
  }, [query, ready]);

  const emit = useCallback(
    (addr: SelectedAddress) => {
      setSelected(addr);
      // Doğrulama logu (istenildiği gibi):
      // eslint-disable-next-line no-console
      console.log(`[CICEKYOLLA][adres:${addr.source}]`, addr);
      onSelect?.(addr);
    },
    [onSelect],
  );

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      geocoderRef.current?.geocode({ location: { lat, lng } }, (res: any[]) => {
        const r = res?.[0];
        if (!r) return;
        emit({ formattedAddress: r.formatted_address, placeId: r.place_id, lat, lng, ...parseComponents(r.address_components), source: "manual" });
      });
    },
    [emit],
  );

  const drawMap = useCallback(
    (lat: number, lng: number) => {
      const g = (window as any).google;
      if (!showMap || !g || !mapDivRef.current) return;
      const center = { lat, lng };
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(mapDivRef.current, { center, zoom: 16, disableDefaultUI: true, zoomControl: true, clickableIcons: false });
        markerRef.current = new g.maps.Marker({ map: mapRef.current, position: center, draggable: true });
        markerRef.current.addListener("dragend", () => {
          const p = markerRef.current.getPosition();
          reverseGeocode(p.lat(), p.lng());
        });
      } else {
        mapRef.current.setCenter(center);
        markerRef.current.setPosition(center);
      }
    },
    [showMap, reverseGeocode],
  );

  const choose = useCallback(
    (pred: any) => {
      setQuery(pred.description);
      setPreds([]);
      setOpen(false);
      placesRef.current.getDetails(
        { placeId: pred.place_id, fields: ["formatted_address", "geometry", "address_components", "place_id"], sessionToken: tokenRef.current },
        (place: any) => {
          if (!place?.geometry) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          emit({ formattedAddress: place.formatted_address, placeId: place.place_id, lat, lng, ...parseComponents(place.address_components), source: "autocomplete" });
          drawMap(lat, lng);
          tokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken();
        },
      );
    },
    [emit, drawMap],
  );

  if (err === "NO_KEY") {
    return (
      <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 flex items-start gap-3 text-[13px] text-[#92400E]">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        Adres arama için Google Maps anahtarı yapılandırılmalı: <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (Vercel → Environment Variables).
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Arama input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => preds.length && setOpen(true)}
          placeholder={placeholder}
          disabled={!ready && !err}
          className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-[#EDE9FE] bg-white text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
        />
        {(loading || !ready) && !err ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7C3AED] animate-spin" />
        ) : selected ? (
          <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#059669]" />
        ) : null}
      </div>

      {err === "LOAD_FAIL" ? (
        <p className="mt-2 text-[12px] text-[#B91C1C]">Adres servisi yüklenemedi. Bağlantınızı kontrol edin.</p>
      ) : null}

      {/* Öneri listesi (özel premium dropdown) */}
      {open && preds.length > 0 ? (
        <ul className="absolute z-30 mt-2 w-full max-h-80 overflow-auto rounded-2xl border border-[#EDE9FE] bg-white shadow-[0_16px_40px_rgba(17,24,39,0.10)] py-1.5">
          {preds.map((p) => (
            <li key={p.place_id}>
              <button
                onClick={() => choose(p)}
                className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[#F9F7FF] transition-colors"
              >
                <MapPin className="w-4 h-4 text-[#7C3AED] mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-[#111827] truncate">
                    {p.structured_formatting?.main_text ?? p.description}
                  </span>
                  <span className="block text-[12px] text-[#9CA3AF] truncate">
                    {p.structured_formatting?.secondary_text ?? ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Harita + seçilen adres özeti */}
      {selected ? (
        <div className="mt-3 rounded-2xl border border-[#EDE9FE] overflow-hidden">
          {showMap ? <div ref={mapDivRef} className="w-full h-48 bg-[#F5F3FF]" /> : null}
          <div className="p-4 bg-[#FBFAFE]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#7C3AED] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[#111827]">{selected.formattedAddress}</p>
                <p className="text-[12px] text-[#6B7280] mt-1">
                  {[selected.city, selected.district, selected.neighborhood].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {showMap ? (
              <p className="mt-2 text-[11.5px] text-[#9CA3AF]">Konum yanlışsa haritadaki işaretçiyi sürükleyerek düzeltebilirsiniz.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
