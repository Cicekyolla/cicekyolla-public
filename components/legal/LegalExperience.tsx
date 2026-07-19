import { ShieldCheck } from "lucide-react";

export interface LegalBlock { title: string; text: string }

export function LegalExperience({ eyebrow, title, description, blocks }:{
  eyebrow:string; title:string; description:string; blocks:LegalBlock[];
}) {
  return (
    <main className="min-h-screen bg-[#FAFAFC] px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-[936px]">
        <header className="mb-10 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8B5CF6]">{eyebrow}</p>
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.03em] text-[#111827] sm:text-5xl">{title}</h1>
        </header>
        <aside className="mb-12 flex gap-5 rounded-[24px] border border-[#DDD6FE] bg-[#F3F0FF] p-7 sm:p-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="mb-2 text-base font-bold text-[#111827]">Bilgileriniz Güvende</h2>
            <p className="leading-7 text-[#667085]">{description}</p>
          </div>
        </aside>
        <article className="rounded-[28px] border border-black/[0.04] bg-white px-6 py-8 shadow-[0_18px_60px_rgba(17,24,39,0.06)] sm:px-14 sm:py-12">
          <div className="space-y-10">
            {blocks.map((block,index)=>(
              <section key={`${index}-${block.title}`} className="grid gap-4 sm:grid-cols-[30px_1fr]">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#8B5CF6] text-xs font-bold text-white">{index+1}</span>
                <div>
                  <h2 className="mb-3 text-base font-bold text-[#111827]">{block.title}</h2>
                  <div className="whitespace-pre-line text-[15px] leading-7 text-[#667085]">{block.text}</div>
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
