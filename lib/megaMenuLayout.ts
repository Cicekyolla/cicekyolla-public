/* ============================================================================
   CICEKYOLLA — HEADER NAV CONFIG + MEGA MENÜ DENGELEME (SUNUM KATMANI)
   Bağımlılıksız saf modül (node --test ile test edilir). headerNav.ts bunları
   re-export eder; dış API değişmez.
   ============================================================================ */

export interface HeaderNavItem { match: string; label: string }

// Config yalnız "hangi kategori header'da + sıra + etiket" belirler; VERİ
// (isim/çocuk/torun/link/görsel) CANLI CategoryTree'den gelir → tek kaynak.
// NOT: "Premium Çiçekler" ve "Doğum Günü" girişleri kaldırıldı — production
// ağacında bu isimde kategori YOK, ikisi de sessizce düşüyordu (canlıda hiç
// görünmüyordu). Görünen set değişmedi; yalnız ölü config temizlendi.
// "Yapay Dekorasyon" = mevcut production kök kategorisi (yapay-dekorasyon,
// 9 alt aile + 27 torun) — yeni kategori YARATILMADI, yalnız nav'a eklendi.
export const HEADER_NAV_CONFIG: HeaderNavItem[] = [
  { match: "Çiçekler", label: "Çiçekler" },
  { match: "Gönderim Amacına Göre", label: "Gönderim Amacına Göre" },
  { match: "Buketler", label: "Buketler" },
  { match: "Güller", label: "Güller" },
  { match: "Orkideler", label: "Orkideler" },
  { match: "Saksı Bitkileri", label: "Saksı Bitkileri" },
  { match: "Kampanyalar", label: "Kampanyalar" },
  { match: "Koleksiyonlar", label: "Koleksiyonlar" },
  { match: "Yapay Dekorasyon", label: "Yapay Dekorasyon" },
];

export interface MegaColumn {
  title: string;
  href: string;
  links: { name: string; href: string }[];
  /** Uzun bir ailenin bir sonraki sütuna taşan devamı (SUNUM; DB hiyerarşisi değişmez). */
  continued?: boolean;
}

/* ----------------------------------------------------------------------------
   MEGA MENÜ — KATEGORİ OLMAYAN EK SÜTUNLAR

   Mega menü kategori ağacından beslenir ve link'ler `/kategori/<slug>` üretir.
   Kategori OLMAYAN sayfalar (ör. /abonelik) bu yolla menüye giremez; kategori
   uydurmak da yanlış olur — sahte bir kategori yanlış URL ve yanlış SEO demektir.

   Bu harita, o sayfalar için TEK ve AÇIK istisnadır: nav başlığına manuel bir
   sütun ekler. Kategori verisi DEĞİŞMEZ, tek kaynak korunur.

   ⚠️ Buraya yalnız gerçekten var olan bir route eklenir. Var olmayan bir yola
   link vermek header'da ölü link üretir.
   ---------------------------------------------------------------------------- */
export const MEGA_EXTRA_COLUMNS: Record<string, MegaColumn[]> = {
  Kampanyalar: [
    {
      title: 'Abonelik',
      href: '/abonelik',
      links: [{ name: 'Çiçek Aboneliği', href: '/abonelik' }],
    },
  ],
};

/* ----------------------------------------------------------------------------
   MEGA MENÜ DENGELEME
   Sorun: kolon sayısı = child sayısı (Çiçekler → 16 kolon) ve Güller gibi uzun
   aileler tek sütunda dikey liste oluşturup yan sütunları boş bırakıyordu.
   Çözüm: aileler SIRASI KORUNARAK K sütuna sıralı-dengeli dağıtılır; bir aile
   sütunun kalan alanına sığmıyorsa bölünür ve devamı (`continued`) sonraki
   sütunda aynı başlıkla sürer. DB parent/child ilişkisi DEĞİŞMEZ.
   ---------------------------------------------------------------------------- */
const famRows = (c: MegaColumn) => 1 + c.links.length; // başlık + linkler

export function balanceMegaColumns(
  columns: MegaColumn[],
  columnCount = 4,
  opts: { minSplit?: number; slack?: number } = {},
): MegaColumn[][] {
  const k = Math.max(1, columnCount);
  const minSplit = opts.minSplit ?? 3; // bölünen parçada en az bu kadar link kalsın
  const slack = opts.slack ?? 1;
  if (columns.length === 0) return [];
  const out: MegaColumn[][] = Array.from({ length: k }, () => []);
  let col = 0;
  let used = 0;
  let remainingRows = columns.reduce((s, c) => s + famRows(c), 0);
  // Dinamik hedef: kalan satır / kalan sütun — erken sütunlar dolunca sonraki
  // sütunların hedefi yeniden hesaplanır, son sütuna yığılma olmaz.
  const target = () => Math.ceil(remainingRows / (k - col));
  const push = (c: MegaColumn) => { out[col].push(c); used += famRows(c); remainingRows -= famRows(c); };
  const nextCol = () => { if (col < k - 1) { col++; used = 0; } };

  for (const fam of columns) {
    const rows = famRows(fam);
    const t = target();
    const fits = used + rows <= t + slack;
    // Küçük aşım (ailenin yarısından az) sütunu bölmekten iyidir.
    const smallOvershoot = used > 0 && used + rows - t <= Math.max(1, Math.floor(rows / 2));
    if (col === k - 1 || used === 0 && rows <= t + slack || fits || smallOvershoot) {
      push(fam);
      if (used >= t && col < k - 1) nextCol();
      continue;
    }
    const remaining = t + slack - used;
    if (used === 0 || (remaining - 1 >= minSplit && fam.links.length - (remaining - 1) >= minSplit)) {
      // Boş sütuna sığmayan çok uzun aile ya da anlamlı kalan alan → böl, devamı sonraki sütunda.
      const headLen = used === 0 ? Math.max(minSplit, t - 1) : remaining - 1;
      const head = fam.links.slice(0, headLen);
      let rest = fam.links.slice(headLen);
      push({ ...fam, links: head });
      if (rest.length === 0) { if (used >= t && col < k - 1) nextCol(); continue; }
      nextCol();
      while (rest.length > 0) {
        const cap = col === k - 1 ? rest.length : Math.max(minSplit, target() + slack - used - 1);
        const part = rest.slice(0, cap);
        rest = rest.slice(cap);
        push({ ...fam, links: part, continued: true });
        if (rest.length > 0) nextCol();
      }
      if (used >= target() && col < k - 1) nextCol();
    } else {
      nextCol();
      push(fam);
      if (used >= target() && col < k - 1) nextCol();
    }
  }
  return out.filter((c) => c.length > 0);
}
