/**
 * §Blog içerik renderer'ı (ADDITIVE, 30.08.2026).
 *
 * Blog Merkezi editöründen gelen hafif işaretlemeyi React öğelerine çevirir.
 * HAM HTML BASILMAZ (dangerouslySetInnerHTML yok) → XSS yüzeyi yoktur.
 *
 * GERİYE UYUMLULUK: işaretleme içermeyen düz metin, bugünkü çıktının birebir
 * aynısını üretir — aynı <p> sınıfları, aynı boşluk ölçüleri.
 */

import Link from "next/link";
import { parseBlogContent, type InlineNode } from "@/lib/blogContent";

const P_CLASS = "mb-7 text-lg leading-8 text-[#62596d]";

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.t === "b") return <strong key={i} className="font-semibold text-[#3f3649]">{n.v}</strong>;
        if (n.t === "i") return <em key={i}>{n.v}</em>;
        if (n.t === "a") {
          const external = /^https?:\/\//i.test(n.href);
          return external ? (
            <a
              key={i}
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#8b5cf6] underline underline-offset-2"
            >
              {n.v}
            </a>
          ) : (
            <Link
              key={i}
              href={n.href}
              className="font-semibold text-[#8b5cf6] underline underline-offset-2"
            >
              {n.v}
            </Link>
          );
        }
        return <span key={i}>{n.v}</span>;
      })}
    </>
  );
}

export function BlogContent({ content, fallback }: { content: string; fallback: string }) {
  const blocks = parseBlogContent(content);

  if (blocks.length === 0) {
    return <p className={P_CLASS}>{fallback}</p>;
  }

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "h2") {
          return (
            <h2
              key={i}
              className="mb-4 mt-10 font-serif text-3xl font-semibold leading-tight text-[#160d22]"
            >
              <Inline nodes={block.inline} />
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="mb-7 list-disc space-y-2 pl-6 text-lg leading-8 text-[#62596d]">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline nodes={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={P_CLASS}>
            <Inline nodes={block.inline} />
          </p>
        );
      })}
    </>
  );
}
