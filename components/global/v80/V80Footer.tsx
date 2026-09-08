// ============================================================================
// GLOBAL VERSION 80 — locale alt bilgi (Figma Version 80 footer: koyu zemin,
// yolculuk satırı, marka, MAĞAZA · YARDIM · TESLİMAT · TAKİP · İLETİŞİM, alt şerit).
// Sunucu bileşeni; model lib/global/v80/footer.ts'te çözülür (gerçek damarlar).
// Yalnız V80Shell çağırır → TR sayfalarında hiç çizilmez.
// ============================================================================
import Link from "next/link";
import type { V80FooterModel } from "@/lib/global/v80/footer";
import { BrandMark, WhatsAppIcon } from "./V80Icons";
import { V80CookiePrefs } from "./V80CookiePrefs";

function FooterLink({ l }: { l: { label: string; href: string; external?: boolean } }) {
  if (l.external) {
    return <a href={l.href} target="_blank" rel="noopener noreferrer nofollow">{l.label}</a>;
  }
  return <Link href={l.href}>{l.label}</Link>;
}

export function V80Footer({ model: m }: { model: V80FooterModel }) {
  return (
    <footer className="v80-footer" lang={m.locale} dir={m.dir} data-v80-footer>
      {m.journey ? <div className="v80-footer-journey"><span>{m.journey}</span></div> : null}
      <div className="v80-wrap">
        <div className="v80-footer-grid">
          <div className="v80-footer-brand">
            <Link href={m.homeHref} className="v80-footer-logo" aria-label={m.brand}>
              <BrandMark size={22} color="var(--v80-primary)" />
              <span className="v80-serif" style={{ fontStyle: "italic", fontSize: "1.25rem", letterSpacing: "-0.03em" }}>çiçekyolla</span>
            </Link>
            <p className="v80-footer-tagline">{m.tagline1}<br />{m.tagline2}</p>
            <p className="v80-footer-since">{m.since}</p>
          </div>

          {m.columns.map((col) => (
            <nav key={col.key} aria-label={col.title} className={`v80-footer-col v80-footer-col-${col.key}`}>
              <h3 className="v80-footer-h">{col.title}</h3>
              <ul>
                {col.links.map((l) => <li key={l.key}><FooterLink l={l} /></li>)}
              </ul>
            </nav>
          ))}

          <div className="v80-footer-col v80-footer-contact">
            <h3 className="v80-footer-h">{m.contact.title}</h3>
            <ul>
              <li><a href={m.contact.phoneHref} dir="ltr">{m.contact.phone}</a></li>
              <li>
                <a href={m.contact.whatsapp} target="_blank" rel="noopener noreferrer nofollow" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <WhatsAppIcon size={13} /> {m.contact.whatsappLabel}
                </a>
              </li>
              <li><a href={m.contact.emailHref} dir="ltr">{m.contact.email}</a></li>
              <li><span className="v80-footer-address">{m.contact.address}</span></li>
            </ul>
          </div>
        </div>

        <div className="v80-footer-bottom">
          <p>{m.rights}</p>
          <div>
            <V80CookiePrefs label={m.cookies} />
            {m.cta.label ? <Link href={m.cta.href} className="v80-footer-cta">{m.cta.label} ↗</Link> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
