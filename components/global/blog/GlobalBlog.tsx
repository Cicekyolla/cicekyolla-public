// ============================================================================
// GLOBAL BLOG MERKEZİ — /<dil>/blog liste, /<dil>/blog/<slug> detay ve Global ana
// sayfa rehber bölümü (ADDITIVE, 11 Eki 2026). Sunucu bileşenleri; stiller
// lib/global/v80/v80.css (.v80-blog-*). İçerik %100 Admin'den; boş dilde HİÇBİR
// şey basılmaz (sahte içerik yok). Yazı gövdesi TR ile aynı güvenli işaretleme
// renderer'ından geçer (ham HTML basılmaz).
// ============================================================================
import Link from "next/link";
import type { BlogPost } from "@/components/blog/BlogExperience";
import { BlogContent } from "@/components/blog/BlogContent";
import { DIR, localeBlogPath, type GlobalLocale } from "@/lib/global/config";
import { BLOG_COPY, formatBlogDate } from "@/lib/global/blogCopy";

function BlogCard({ locale, post, priority = false }: { locale: GlobalLocale; post: BlogPost; priority?: boolean }) {
  const t = BLOG_COPY[locale];
  const date = formatBlogDate(locale, post.publishedAt);
  return (
    <Link href={localeBlogPath(locale, post.slug)} className="v80-blog-card">
      {post.image ? (
        <div className="v80-frame">
          <img src={post.image} alt={post.title} className="v80-img" loading={priority ? "eager" : "lazy"} decoding="async" />
        </div>
      ) : null}
      <div className="v80-blog-card-body">
        {post.category ? <span className="v80-blog-chip">{post.category}</span> : null}
        <h3 className="v80-blog-card-title">{post.title}</h3>
        {post.excerpt ? <p className="v80-blog-excerpt">{post.excerpt}</p> : null}
        {date ? <time className="v80-blog-meta" dateTime={post.publishedAt}>{date}</time> : null}
        <span className="v80-blog-link">{t.read} →</span>
      </div>
    </Link>
  );
}

/** /<dil>/blog — yayındaki yazılar, Admin'deki sırayla. */
export function GlobalBlogList({ locale, posts }: { locale: GlobalLocale; posts: BlogPost[] }) {
  const t = BLOG_COPY[locale];
  return (
    <main id="main-content" lang={locale} dir={DIR[locale]} className="v80-section">
      <div className="v80-wrap">
        <header className="v80-blog-head">
          <h1 className="v80-blog-title">{t.title}</h1>
          <p className="v80-blog-lead">{t.description}</p>
        </header>
        <div className="v80-blog-grid">
          {posts.map((p, i) => <BlogCard key={p.slug} locale={locale} post={p} priority={i < 3} />)}
        </div>
      </div>
    </main>
  );
}

/** /<dil>/blog/<slug> — tek yazı. */
export function GlobalBlogArticle({ locale, post }: { locale: GlobalLocale; post: BlogPost }) {
  const t = BLOG_COPY[locale];
  const date = formatBlogDate(locale, post.publishedAt);
  return (
    <main id="main-content" lang={locale} dir={DIR[locale]} className="v80-section">
      <article className="v80-wrap">
        <div className="v80-blog-article">
          <Link href={localeBlogPath(locale)} className="v80-blog-back">← {t.back}</Link>
          <header style={{ marginTop: 24 }}>
            {post.category ? <span className="v80-blog-chip">{post.category}</span> : null}
            <h1 className="v80-blog-title" style={{ marginTop: 14 }}>{post.title}</h1>
            {date ? <time className="v80-blog-meta" dateTime={post.publishedAt} style={{ display: "block", marginTop: 12 }}>{date}</time> : null}
          </header>
          {post.image ? (
            <div className="v80-frame v80-blog-cover">
              <img src={post.image} alt={post.title} className="v80-img" loading="eager" decoding="async" />
            </div>
          ) : null}
          {post.excerpt ? <p className="v80-blog-lead" style={{ marginBottom: 28 }}>{post.excerpt}</p> : null}
          <BlogContent content={post.content} fallback={post.excerpt} />
          <div className="v80-blog-cta">
            <h2>{t.ctaTitle}</h2>
            <Link href={`/${locale}`} className="v80-btn">{t.ctaButton}</Link>
          </div>
        </div>
      </article>
    </main>
  );
}

/** Global ana sayfa altındaki rehber bölümü — o dilde gerçekten yayımlanan yazılar; yoksa hiç basılmaz. */
export function GlobalBlogRail({ locale, posts }: { locale: GlobalLocale; posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  const t = BLOG_COPY[locale];
  return (
    <section id="guides" className="v80-section" aria-labelledby="v80-guides-title">
      <div className="v80-wrap">
        <div className="v80-blog-rail-head">
          <h2 id="v80-guides-title" className="v80-h2">{t.guide}</h2>
          <Link href={localeBlogPath(locale)} className="v80-blog-link">{t.all} →</Link>
        </div>
        <div className="v80-blog-grid">
          {posts.map((p) => <BlogCard key={p.slug} locale={locale} post={p} />)}
        </div>
      </div>
    </section>
  );
}
