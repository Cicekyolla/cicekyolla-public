// ============================================================================
// GLOBAL BLOG MERKEZİ — arayüz metinleri (ADDITIVE). Yalnız kalıp metinler; yazı
// içerikleri %100 Admin'den (seo_page("/<dil>/blog").body_blocks) gelir.
// ============================================================================
import type { GlobalLocale } from "./config.ts";

export interface BlogCopy {
  /** Liste sayfası başlığı (H1) ve <title>. */
  title: string;
  /** Liste sayfası meta açıklaması. */
  description: string;
  /** Ana sayfa rehber bölümü başlığı. */
  guide: string;
  /** "Tüm yazılar" bağlantısı. */
  all: string;
  /** Kart bağlantısı. */
  read: string;
  /** Detaydan listeye dönüş. */
  back: string;
  /** Detay sonu çağrı başlığı + düğmesi. */
  ctaTitle: string;
  ctaButton: string;
}

export const BLOG_COPY: Record<GlobalLocale, BlogCopy> = {
  en: { title: "Flower Journal", description: "Flower care, meanings, gifting ideas and delivery guides from ÇiçekYolla's florists in Istanbul.", guide: "Guides & Inspiration", all: "All articles", read: "Read article", back: "Back to journal", ctaTitle: "Say it with flowers", ctaButton: "Shop flowers" },
  de: { title: "Blumen-Journal", description: "Blumenpflege, Bedeutungen, Geschenkideen und Liefer-Ratgeber von den Floristen von ÇiçekYolla in Istanbul.", guide: "Ratgeber & Inspiration", all: "Alle Artikel", read: "Artikel lesen", back: "Zurück zum Journal", ctaTitle: "Sagen Sie es mit Blumen", ctaButton: "Blumen ansehen" },
  fr: { title: "Journal des fleurs", description: "Entretien des fleurs, significations, idées cadeaux et guides de livraison par les fleuristes de ÇiçekYolla à Istanbul.", guide: "Guides & inspiration", all: "Tous les articles", read: "Lire l'article", back: "Retour au journal", ctaTitle: "Dites-le avec des fleurs", ctaButton: "Voir les fleurs" },
  nl: { title: "Bloemenjournaal", description: "Bloemverzorging, betekenissen, cadeau-ideeën en bezorggidsen van de bloemisten van ÇiçekYolla in Istanbul.", guide: "Gidsen & inspiratie", all: "Alle artikelen", read: "Lees artikel", back: "Terug naar journaal", ctaTitle: "Zeg het met bloemen", ctaButton: "Bekijk bloemen" },
  it: { title: "Diario dei fiori", description: "Cura dei fiori, significati, idee regalo e guide alla consegna dai fioristi di ÇiçekYolla a Istanbul.", guide: "Guide e ispirazione", all: "Tutti gli articoli", read: "Leggi l'articolo", back: "Torna al diario", ctaTitle: "Dillo con i fiori", ctaButton: "Scopri i fiori" },
  es: { title: "Diario de flores", description: "Cuidado de flores, significados, ideas de regalo y guías de entrega de los floristas de ÇiçekYolla en Estambul.", guide: "Guías e inspiración", all: "Todos los artículos", read: "Leer artículo", back: "Volver al diario", ctaTitle: "Dilo con flores", ctaButton: "Ver flores" },
  pt: { title: "Diário das flores", description: "Cuidados com flores, significados, ideias de presente e guias de entrega dos floristas da ÇiçekYolla em Istambul.", guide: "Guias e inspiração", all: "Todos os artigos", read: "Ler artigo", back: "Voltar ao diário", ctaTitle: "Diga com flores", ctaButton: "Ver flores" },
  az: { title: "Çiçək jurnalı", description: "ÇiçekYolla-nın İstanbuldakı floristlərindən çiçək baxımı, mənaları, hədiyyə ideyaları və çatdırılma bələdçiləri.", guide: "Bələdçilər və ilham", all: "Bütün yazılar", read: "Yazını oxu", back: "Jurnala qayıt", ctaTitle: "Hisslərinizi çiçəklərlə deyin", ctaButton: "Çiçəklərə bax" },
  ru: { title: "Цветочный журнал", description: "Уход за цветами, их значения, идеи подарков и гиды по доставке от флористов ÇiçekYolla в Стамбуле.", guide: "Гиды и вдохновение", all: "Все статьи", read: "Читать статью", back: "Назад к журналу", ctaTitle: "Скажите это цветами", ctaButton: "Смотреть цветы" },
  ar: { title: "مجلة الزهور", description: "العناية بالزهور ومعانيها وأفكار الهدايا وأدلة التوصيل من منسقي الزهور في ÇiçekYolla في إسطنبول.", guide: "أدلة وإلهام", all: "كل المقالات", read: "اقرأ المقال", back: "العودة إلى المجلة", ctaTitle: "عبّر بالزهور", ctaButton: "تصفح الزهور" },
  zh: { title: "花艺志", description: "来自伊斯坦布尔 ÇiçekYolla 花艺师的养护技巧、花语、送礼灵感与配送指南。", guide: "指南与灵感", all: "全部文章", read: "阅读文章", back: "返回花艺志", ctaTitle: "用花传情", ctaButton: "浏览鲜花" },
  ja: { title: "フラワージャーナル", description: "イスタンブールの ÇiçekYolla フローリストによる花のお手入れ、花言葉、ギフトのアイデア、配送ガイド。", guide: "ガイドとインスピレーション", all: "すべての記事", read: "記事を読む", back: "ジャーナルに戻る", ctaTitle: "花で想いを伝える", ctaButton: "花を見る" },
  ko: { title: "플라워 저널", description: "이스탄불 ÇiçekYolla 플로리스트가 전하는 꽃 관리, 꽃말, 선물 아이디어와 배송 가이드.", guide: "가이드 & 영감", all: "모든 글", read: "글 읽기", back: "저널로 돌아가기", ctaTitle: "꽃으로 마음을 전하세요", ctaButton: "꽃 보기" },
};

/** Yayın tarihi — o dilin tarih biçimi (geçersiz tarih → null, uydurma tarih basılmaz). */
export function formatBlogDate(locale: GlobalLocale, iso: string | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(t));
  } catch {
    return null;
  }
}
