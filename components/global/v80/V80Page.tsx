// ============================================================================
// GLOBAL VERSION 80 — ana sayfa kompozisyonu: bölümler Admin'in sırasında ve
// görünürlüğünde basılır (varsayılan = Figma Version 80 sırası).
// ============================================================================
import type { V80View } from "@/lib/global/v80/view";
import type { V80SectionId } from "@/lib/global/v80/schema";
import { V80Hero } from "./V80Hero";
import { V80Ticker } from "./V80Ticker";
import { V80Discovery } from "./V80Discovery";
import { V80Shop } from "./V80Shop";
import { V80Mood } from "./V80Mood";
import { V80CardMessage } from "./V80CardMessage";
import { V80Reviews } from "./V80Reviews";
import { V80Categories, V80Delivery, V80Collections, V80Destinations, V80Journey, V80Cta, V80TrustStrip, V80Content } from "./V80Sections";

export function V80Page({ view }: { view: V80View }) {
  const render = (id: V80SectionId) => {
    switch (id) {
      case "hero": return <V80Hero key={id} view={view} />;
      case "ticker": return <V80Ticker key={id} items={view.ticker} />;
      case "discovery": return <V80Discovery key={id} view={view} />;
      case "shop": return <V80Shop key={id} view={view} />;
      case "categories": return <V80Categories key={id} view={view} />;
      case "delivery": return <V80Delivery key={id} view={view} />;
      case "collections": return <V80Collections key={id} view={view} />;
      case "mood": return <V80Mood key={id} view={view} />;
      case "card": return <V80CardMessage key={id} view={view} />;
      case "destinations": return <V80Destinations key={id} view={view} />;
      case "journey": return <V80Journey key={id} view={view} />;
      case "reviews": return <V80Reviews key={id} t={view.texts} />;
      case "cta": return <V80Cta key={id} view={view} />;
      case "trust": return <V80TrustStrip key={id} view={view} />;
      case "content": return <V80Content key={id} view={view} />;
      default: return null;
    }
  };
  return (
    <main id="main-content" lang={view.locale} dir={view.dir}>
      {view.sections.map(render)}
    </main>
  );
}
