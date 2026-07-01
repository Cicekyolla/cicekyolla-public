import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchSeoPage, type BodyBlock, type SeoPublicPage } from "@/lib/api";

// Kanonik/mutlak URL için site kökü. Şimdilik Vercel domaini; sonra cicekyolla.com.
// Tek yerden değişir (env → build). canonical_url path döndüğü için burada tamamlanır.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app"
).replace(/\/$/, "");

// ISR: statik üret, 5 dk'da bir tazele. Bilinmeyen path'ler istek anında üretilir.
export const revalidate = 300;
export const dynamicParams = true;

// Next slug dizisini backend path'ine çevirir: ["istanbul","kadikoy"] -> "/istanbul/kadikoy"
function slugToPath(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return "/";
  return "/" + slug.map((s) => decodeURIComponent(s)).join("/");
}

// Mutlak URL üretir (path -> https://site/path)
function absoluteUrl(path: string): string {
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}

type PageProps = { params: { slug?: string[] } };

// ---- SEO META (title / description / canonical / robots) ----
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const path = slugToPath(params.slug);
  const page = await fetchSeoPage(path);

  if (!page) {
    return { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  }

  const indexable = page.index_state === "index";

  return {
    title: page.title_tag,
    description: page.meta_description,
    alternates: { canonical: absoluteUrl(page.canonical_url || path) },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: page.title_tag,
      description: page.meta_description,
      url: absoluteUrl(page.canonical_url || path),
      locale: page.lang === "tr" ? "tr_TR" : page.lang,
      type: "website",
    },
  };
}

// ---- body_blocks -> HTML eşlemesi (additive; şimdilik paragraph) ----
function renderBlock(block: BodyBlock, i: number) {
  switch (block.type) {
    case "paragraph":
      return <p key={i}>{block.text}</p>;
    case "heading":
      return <h2 key={i}>{block.text}</h2>;
    default:
      // Bilinmeyen tip: metni varsa güvenli şekilde paragraf olarak bas.
      return block.text ? <p key={i}>{block.text}</p> : null;
  }
}

// ---- FAQPage JSON-LD (faq doluysa) — M9.6 gelince otomatik devreye girer ----
function faqJsonLd(page: SeoPublicPage): string | null {
  if (!page.faq || page.faq.length === 0) return null;
  const entities = page.faq
    .filter((f) => f.q && f.a)
    .map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
  if (entities.length === 0) return null;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entities,
  });
}

// ---- Sayfa ----
export default async function Page({ params }: PageProps) {
  const path = slugToPath(params.slug);
  const page = await fetchSeoPage(path);

  if (!page) notFound();

  const faqLd = faqJsonLd(page);
  // schema_jsonld backend'den geliyorsa (boş {} değilse) onu da bas.
  const rawSchema =
    page.schema_jsonld && Object.keys(page.schema_jsonld).length > 0
      ? JSON.stringify(page.schema_jsonld)
      : null;

  return (
    <main>
      <h1>{page.h1}</h1>

      {page.intro_html ? (
        <div dangerouslySetInnerHTML={{ __html: page.intro_html }} />
      ) : null}

      {page.body_blocks?.map((b, i) => renderBlock(b, i))}

      {page.faq && page.faq.length > 0 ? (
        <section>
          <h2>Sıkça Sorulan Sorular</h2>
          {page.faq.map((f, i) =>
            f.q && f.a ? (
              <div key={i}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ) : null
          )}
        </section>
      ) : null}

      {/* JSON-LD structured data */}
      {rawSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: rawSchema }}
        />
      ) : null}
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqLd }}
        />
      ) : null}
    </main>
  );
}
