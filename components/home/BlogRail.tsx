/**
 * §ÇiçekYolla Rehber — ana sayfa blog bölümü (additive).
 * Konum: "Çiçeğin Yolculuğu" (FlowerJourney) bölümünün HEMEN ALTI, her iki
 * render yolunda da (CMS'li ve CMS'siz). Araya başka bölüm girmez.
 *
 * Tasarım: /blog sayfasının premium kart dilinin kompakt hâli — aynı yüzey
 * (#fbfafd), aynı kart geometrisi (26px radius, #e8e1f0 kenar, mor rozet),
 * aynı tipografi ölçeği. Yeni tasarım dili ÜRETİLMEZ.
 *
 * Hangi yazılar: sabit slug listesi YOK. Seçim Admin'den yönetilir
 * (getHomepageBlogPosts → "Ana sayfada göster" + sıra). Ana sayfa yalnız
 * gereken 3 yazıyı alır, tüm blog listesi yüklenmez.
 *
 * Görsel: proje genelindeki ana sayfa örüntüsüyle aynı — <img> + lazy.
 * next/image kullanılmaz: next.config'de remotePatterns tanımlı değil ve
 * kapak görselleri karışık kaynaklı (R2 / yerel / harici) → optimize edici
 * uzak host'ta kırık görsel üretirdi. Bölüm katlamanın altında olduğundan
 * lazy yükleme LCP'yi etkilemez.
 */

import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { BlogPost } from "@/components/blog/BlogExperience";

export function BlogRail({ posts }: { posts: BlogPost[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section
      aria-labelledby="home-rehber-baslik"
      className="bg-[#fbfafd] px-6 py-20 lg:px-14 lg:py-24"
    >
      <div className="mx-auto max-w-[1320px]">
        <p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">
          ÇiçekYolla Rehber
        </p>
        <h2
          id="home-rehber-baslik"
          className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-[1.06] text-[#160d22] md:text-5xl"
        >
          Çiçek Dünyasından
          <br />
          <span className="text-[#8b5cf6]">İlham &amp; Bilgi</span>
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-7 text-[#746b80]">
          Çiçeklerin anlamlarından bakım önerilerine, özel günlerden doğru çiçek
          seçimine uzanan rehberler.
        </p>

        <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-[26px] border border-[#e8e1f0] bg-white shadow-[0_22px_60px_rgba(45,22,72,.07)] transition duration-300 hover:shadow-[0_28px_70px_rgba(45,22,72,.12)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#f2eef6]">
                {post.image && (
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                )}
                <span className="absolute left-5 top-5 rounded-full bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white">
                  {post.category}
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-[#a097aa]">
                  <Clock3 className="h-4 w-4" />6 dk okuma
                </div>
                <h3 className="mt-4 text-xl font-bold leading-snug text-[#160d22]">
                  {post.title}
                </h3>
                <p className="mt-4 line-clamp-3 leading-6 text-[#817889]">
                  {post.excerpt}
                </p>
                <span className="mt-6 flex items-center gap-2 font-bold text-[#8b5cf6]">
                  Devamını Oku <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-[#e6dff0] bg-white px-8 py-4 font-bold text-[#7c3aed] shadow-[0_10px_30px_rgba(45,22,72,.06)] transition hover:border-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white"
          >
            Tüm Rehberleri Keşfet <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
