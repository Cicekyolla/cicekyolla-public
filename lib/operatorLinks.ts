// Operatör bağlantısı denetimi (saf). intro_html içinde elle yazılmış en az bir <a> varsa
// sayfa "elle bağlantı yönetilen" sayılır ve otomatik sözlük enjeksiyonu HİÇ çalışmaz.
// Gerekçe: otomatik sözlük "İstanbul"u Tuzla'da bir mahalleye, "Feneryolu"yu Kadıköy'e bağlıyordu.
export function hasOperatorLinks(html: string | null | undefined): boolean {
  return typeof html === "string" && /<a[\s>]/i.test(html);
}
