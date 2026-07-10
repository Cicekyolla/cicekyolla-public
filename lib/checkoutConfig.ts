// ---------------------------------------------------------------------------
// CHECKOUT CONFIG — vesile (occasion) ve teslimat notu seçenekleri TEK KAYNAK.
// Admin-First: ileride admin/API'den yönetilebilsin diye satır-içi değil, burada.
// Bu seçimler ileride AI / CRM / öneri / kampanya / kart mesajı için kullanılacak.
// ---------------------------------------------------------------------------

export interface OccasionOption { id: string; emoji: string; label: string }
export interface DeliveryNoteOption { id: string; label: string }

export const OCCASIONS: OccasionOption[] = [
  { id: "sevgili", emoji: "❤️", label: "Sevgili" },
  { id: "es", emoji: "🌹", label: "Eş" },
  { id: "anne", emoji: "👩", label: "Anne" },
  { id: "baba", emoji: "👨", label: "Baba" },
  { id: "dogum_gunu", emoji: "🎉", label: "Doğum Günü" },
  { id: "kurumsal", emoji: "🏢", label: "Kurumsal" },
  { id: "tebrik", emoji: "🤝", label: "Tebrik" },
  { id: "gecmis_olsun", emoji: "🙏", label: "Geçmiş Olsun" },
  { id: "ogretmen", emoji: "🎓", label: "Öğretmen" },
  { id: "diger", emoji: "💐", label: "Diğer" },
];

export const DELIVERY_NOTES: DeliveryNoteOption[] = [
  { id: "guvenlik", label: "Güvenliğe bırakılabilir" },
  { id: "resepsiyon", label: "Resepsiyona bırakılabilir" },
  { id: "arama", label: "Alıcıyı aramayın" },
  { id: "surpriz", label: "Sürpriz (haber vermeyin)" },
  { id: "gonderen_gizli", label: "Göndereni söylemeyin" },
  { id: "once_ara", label: "Teslimattan önce beni arayın" },
];

export function occasionLabel(id?: string | null): string | null {
  if (!id) return null;
  const o = OCCASIONS.find((x) => x.id === id);
  return o ? `${o.emoji} ${o.label}` : null;
}
