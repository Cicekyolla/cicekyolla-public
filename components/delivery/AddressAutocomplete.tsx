'use client';

/**
 * CICEKYOLLA — AddressAutocomplete
 * ---------------------------------
 * Google Maps adres arama + konum doğrulama bileşeni.
 *
 * TASARIM KARARLARI
 *  - Google SADECE adres/koordinat doğrulama içindir. Teslimat kararı
 *    (aynı gün / ücret / süre) CICEKYOLLA backend'inden gelir.
 *  - Yeni Google Cloud projeleri (1 Mart 2025 sonrası) eski
 *    `AutocompleteService` / `PlacesService` sınıflarını DESTEKLEMEZ.
 *    Bu yüzden birincil yol YENİ Places API'dir:
 *      • AutocompleteSuggestion.fetchAutocompleteSuggestions()
 *      • Place.fetchFields()
 *    Eski API yalnızca fallback olarak (varsa) denenir.
 *  - Google Maps JS'i kendimiz, resmi inline bootstrap loader ile yükleriz;
 *    dışarıdaki bir <script> etiketine bağımlı değiliz. `importLibrary`
 *    ile ihtiyaç duyulan kütüphaneler beklenir.
 *
 * Anahtar: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ----------------------------------------------------------------------------
// Tipler
// ----------------------------------------------------------------------------

export interface AddressResult {
  formattedAddress: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
  il: string | null; // administrative_area_level_1
  ilce: string | null; // administrative_area_level_2
  mahalle: string | null; // administrative_area_level_3 / neighborhood / sublocality
  raw?: unknown;
}

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
  // Yeni API'de öneriden Place üretmek için taşınır:
  prediction?: any;
}

interface Props {
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  /** Ülke kısıtı (varsayılan Türkiye). */
  regionCodes?: string[];
}

// ----------------------------------------------------------------------------
// Google Maps loader (promise-cached, SSR-safe)
// ----------------------------------------------------------------------------

declare global {
  interface Window {
    google?: any;
    __cyGmapsPromise?: Promise<any>;
  }
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Resmi inline bootstrap loader'ı enjekte eder ve `google.maps.importLibrary`
 * hazır olana kadar bekler. Birden fazla çağrıda tek promise paylaşılır.
 */
function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window yok (SSR)'));
  }
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }
  if (window.__cyGmapsPromise) {
    return window.__cyGmapsPromise;
  }
  if (!MAPS_KEY) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY tanımlı değil'));
  }

  window.__cyGmapsPromise = new Promise<any>((resolve, reject) => {
    try {
      // Google resmi bootstrap snippet'i (dynamic library import).
      // https://developers.google.com/maps/documentation/javascript/load-maps-js-api
      (function (g: any) {
        let h: any;
        let a: any;
        let k: any;
        const p = 'The Google Maps JavaScript API';
        const c = 'google';
        const l = 'importLibrary';
        const q = '__ib__';
        const m = document;
        let b: any = window as any;
        b = b[c] || (b[c] = {});
        const d = b.maps || (b.maps = {});
        const r = new Set<string>();
        const e = new URLSearchParams();
        const u = () =>
          h ||
          (h = new Promise<void>(async (res, rej) => {
            a = m.createElement('script');
            e.set('libraries', [...r] + '');
            for (k in g) {
              e.set(k.replace(/[A-Z]/g, (t: string) => '_' + t[0].toLowerCase()), g[k]);
            }
            e.set('callback', c + '.maps.' + q);
            a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
            d[q] = res;
            a.onerror = () => (h = rej(Error(p + ' could not load.')));
            a.nonce = (m.querySelector('script[nonce]') as any)?.nonce || '';
            m.head.append(a);
          }));
        d[l]
          ? console.warn(p + ' only loads once. Ignoring:', g)
          : (d[l] = (f: string, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n)));
      })({ key: MAPS_KEY, v: 'weekly', language: 'tr', region: 'TR' });

      const start = Date.now();
      const poll = () => {
        if (window.google?.maps?.importLibrary) {
          resolve(window.google);
        } else if (Date.now() - start > 15000) {
          reject(new Error('Google Maps yüklenemedi (zaman aşımı)'));
        } else {
          setTimeout(poll, 60);
        }
      };
      poll();
    } catch (err) {
      reject(err);
    }
  });

  return window.__cyGmapsPromise;
}

// ----------------------------------------------------------------------------
// Adres bileşeni çözümleme yardımcıları
// ----------------------------------------------------------------------------

function pickComponent(components: any[], types: string[]): string | null {
  if (!Array.isArray(components)) return null;
  for (const t of types) {
    const hit = components.find((c: any) => {
      const ct = c.types || c.Types || [];
      return Array.isArray(ct) && ct.includes(t);
    });
    if (hit) {
      return hit.longText ?? hit.long_name ?? hit.shortText ?? hit.short_name ?? null;
    }
  }
  return null;
}

function buildResult(place: any): AddressResult {
  const comps = place.addressComponents ?? place.address_components ?? [];
  const loc = place.location ?? place.geometry?.location ?? null;
  const lat =
    typeof loc?.lat === 'function' ? loc.lat() : typeof loc?.lat === 'number' ? loc.lat : null;
  const lng =
    typeof loc?.lng === 'function' ? loc.lng() : typeof loc?.lng === 'number' ? loc.lng : null;

  return {
    formattedAddress: place.formattedAddress ?? place.formatted_address ?? '',
    placeId: place.id ?? place.place_id ?? '',
    lat,
    lng,
    il: pickComponent(comps, ['administrative_area_level_1']),
    ilce: pickComponent(comps, ['administrative_area_level_2']),
    mahalle: pickComponent(comps, [
      'administrative_area_level_4',
      'administrative_area_level_3',
      'neighborhood',
      'sublocality_level_1',
      'sublocality',
    ]),
    raw: place,
  };
}

// ----------------------------------------------------------------------------
// Bileşen
// ----------------------------------------------------------------------------

export default function AddressAutocomplete({
  onSelect,
  placeholder = 'Mahalle, sokak, hastane, okul, AVM veya adres girin',
  defaultValue = '',
  className,
  regionCodes = ['tr'],
}: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AddressResult | null>(null);

  // Google API modülleri (mount'ta yüklenir)
  const libsRef = useRef<{
    places?: any;
    geocoding?: any;
    sessionToken?: any;
    useNewApi: boolean;
  }>({ useNewApi: true });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // --- Init: Google Maps + kütüphaneleri yükle -----------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        const places = await google.maps.importLibrary('places');
        let geocoding: any = null;
        try {
          geocoding = await google.maps.importLibrary('geocoding');
        } catch {
          /* geocoding opsiyonel */
        }

        // Yeni API mevcut mu?
        const hasNew =
          !!places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions &&
          !!places?.Place;

        libsRef.current = {
          places,
          geocoding,
          useNewApi: hasNew,
        };

        if (hasNew && places.AutocompleteSessionToken) {
          libsRef.current.sessionToken = new places.AutocompleteSessionToken();
        }

        if (!cancelled) {
          setReady(true);
          setError(null);
        }
      } catch (err: any) {
        // Sessizce yut ama kullanıcıya dostça bildir; detay konsolda.
        // eslint-disable-next-line no-console
        console.error('[AddressAutocomplete] init hatası:', err);
        if (!cancelled) {
          setError('Adres servisi şu anda kullanılamıyor. Lütfen adresi elle yazın.');
          setReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Öneri getir ----------------------------------------------------------
  const fetchSuggestions = useCallback(
    async (input: string) => {
      const libs = libsRef.current;
      if (!ready || !libs.places || input.trim().length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        if (libs.useNewApi) {
          // --- YENİ Places API ---
          const request: any = {
            input,
            language: 'tr',
            region: 'tr',
            includedRegionCodes: regionCodes,
          };
          if (libs.sessionToken) request.sessionToken = libs.sessionToken;

          const { suggestions: raw } =
            await libs.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

          const mapped: Suggestion[] = (raw || [])
            .filter((s: any) => s.placePrediction)
            .map((s: any) => {
              const pp = s.placePrediction;
              return {
                placeId: pp.placeId,
                primary: pp.mainText?.text ?? pp.text?.text ?? '',
                secondary: pp.secondaryText?.text ?? '',
                prediction: pp,
              };
            });

          setSuggestions(mapped);
          setOpen(mapped.length > 0);
        } else if (libs.places.AutocompleteService) {
          // --- ESKİ API (fallback; yeni projelerde muhtemelen yok) ---
          const svc = new libs.places.AutocompleteService();
          const res: any = await new Promise((resolve) => {
            svc.getPlacePredictions(
              {
                input,
                componentRestrictions: { country: regionCodes },
                language: 'tr',
              },
              (predictions: any, status: any) => {
                resolve({ predictions, status });
              }
            );
          });
          const mapped: Suggestion[] = (res.predictions || []).map((p: any) => ({
            placeId: p.place_id,
            primary: p.structured_formatting?.main_text ?? p.description ?? '',
            secondary: p.structured_formatting?.secondary_text ?? '',
            prediction: p,
          }));
          setSuggestions(mapped);
          setOpen(mapped.length > 0);
        } else {
          throw new Error('Uygun autocomplete servisi bulunamadı');
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[AddressAutocomplete] öneri hatası:', err);
        setSuggestions([]);
        setOpen(false);
        setError('Adres önerileri alınamadı. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    },
    [ready, regionCodes]
  );

  // --- Input değişimi (debounce) -------------------------------------------
  const onInputChange = (v: string) => {
    setQuery(v);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 280);
  };

  // --- Öneri seçimi ---------------------------------------------------------
  const handleSelect = useCallback(
    async (s: Suggestion) => {
      const libs = libsRef.current;
      setOpen(false);
      setQuery(s.secondary ? `${s.primary} ${s.secondary}` : s.primary);
      setLoading(true);
      setError(null);

      try {
        let result: AddressResult | null = null;

        if (libs.useNewApi && s.prediction?.toPlace) {
          // Yeni API: prediction → Place → fetchFields
          const place = s.prediction.toPlace();
          await place.fetchFields({
            fields: [
              'id',
              'formattedAddress',
              'location',
              'addressComponents',
              'displayName',
            ],
          });
          result = buildResult(place);
          // Yeni oturum token'ı (fiyatlandırma oturumunu kapatır)
          if (libs.places?.AutocompleteSessionToken) {
            libs.sessionToken = new libs.places.AutocompleteSessionToken();
          }
        } else if (libs.geocoding?.Geocoder) {
          // Fallback: placeId → Geocoder
          const geocoder = new libs.geocoding.Geocoder();
          const res: any = await new Promise((resolve, reject) => {
            geocoder.geocode({ placeId: s.placeId }, (r: any, status: any) => {
              if (status === 'OK' && r && r[0]) resolve(r[0]);
              else reject(new Error('Geocode başarısız: ' + status));
            });
          });
          result = buildResult(res);
        }

        if (result) {
          setSelected(result);
          // Konsola doğrulama verisi (brief §4 gereği)
          // eslint-disable-next-line no-console
          console.log('[AddressAutocomplete] seçilen adres:', result);
          onSelect?.(result);
        } else {
          setError('Adres detayları alınamadı.');
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[AddressAutocomplete] detay hatası:', err);
        setError('Adres detayları alınamadı. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    },
    [onSelect]
  );

  // --- Dışarı tıklayınca kapat ---------------------------------------------
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div ref={rootRef} className={className} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#fff',
          border: '1px solid #E9E4F0',
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 2px 16px rgba(139,92,246,0.06)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" stroke="#8B5CF6" strokeWidth="2" />
          <path d="M21 21l-4.3-4.3" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 16,
            color: '#1A1226',
            background: 'transparent',
          }}
        />
        {loading && (
          <span
            aria-label="yükleniyor"
            style={{
              width: 18,
              height: 18,
              border: '2px solid #E9E4F0',
              borderTopColor: '#8B5CF6',
              borderRadius: '50%',
              animation: 'cy-spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 50,
            listStyle: 'none',
            margin: 0,
            padding: 6,
            background: '#fff',
            border: '1px solid #E9E4F0',
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(26,18,38,0.12)',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F6F2FC')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ marginTop: 2, flexShrink: 0 }}
                >
                  <path
                    d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z"
                    stroke="#8B5CF6"
                    strokeWidth="1.6"
                  />
                  <circle cx="12" cy="10" r="2.4" stroke="#8B5CF6" strokeWidth="1.6" />
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 15, color: '#1A1226', fontWeight: 500 }}>
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span style={{ fontSize: 13, color: '#8A7FA0' }}>{s.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p style={{ marginTop: 12, color: '#C0392B', fontSize: 14 }}>{error}</p>
      )}

      {selected && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: '#F6F2FC',
            border: '1px solid #E9E4F0',
            borderRadius: 14,
            fontSize: 14,
            color: '#1A1226',
          }}
        >
          <strong style={{ color: '#7C3AED' }}>Doğrulanan adres</strong>
          <p style={{ margin: '8px 0 0' }}>{selected.formattedAddress}</p>
          <p style={{ margin: '4px 0 0', color: '#8A7FA0', fontSize: 13 }}>
            {[selected.il, selected.ilce, selected.mahalle].filter(Boolean).join(' · ') || '—'}
            {selected.lat != null && selected.lng != null
              ? ` · ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`
              : ''}
          </p>
        </div>
      )}

      <style>{`@keyframes cy-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
