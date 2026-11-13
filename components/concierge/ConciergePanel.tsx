"use client";

/**
 * ConciergePanel — sohbet paneli (ilk tıklamada yüklenir; bkz. ConciergeLauncher).
 *
 * • Mobilde alttan açılan tam yükseklikte sayfa; masaüstünde sol altta 400 × 640 kart.
 * • Karşılama ve hızlı yanıtlar SABİT sözlük metnidir; model ilk müşteri mesajında çağrılır.
 * • Asistan yanıtı DÜZ METİN olarak çizilir (HTML yok). Ürün kartları API yanıtından gelir ve
 *   lib/concierge.ts → parseCards ile doğrulanır; bağlantı yalnız site içi yoldur.
 * • Sepete EKLEMEZ: kart müşterinin dilindeki ürün sayfasına gider ("Teslimat seç"); teslimat seçimi
 *   ve sepete ekleme oradaki mevcut akıştadır.
 * • Oturum belirteci yalnız sekme oturumunda (sessionStorage) saklanır; çerez yok.
 * • Sohbet geçmişi başlatıcıda tutulur (state / dispatch prop'ları): panel kapanıp açılınca kaybolmaz.
 * • Karta tıklanınca panel kapanır (ürün sayfasının üstünü örtmesin); geçmiş durduğu için geri dönülebilir.
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { Price } from "@/components/Price";
import { ProductImage } from "@/components/product/ProductImage";
import { useCurrency } from "@/lib/currency";
import { trackConcierge } from "@/lib/conciergeTracking";
import type { DictKey } from "@/lib/i18n/dict/tr";
import {
  buildRequestBody, canSend, conciergeWhatsappUrl, MAX_MESSAGE_CHARS, parseTurn, SESSION_STORAGE_KEY, tokenToSend,
  type CardTier, type ChatAction, type ChatError, type ChatMessage, type ChatState, type ConciergeCard, type TurnOutcome,
} from "@/lib/concierge";

type T = (key: DictKey, vars?: Record<string, string | number>) => string;

interface Props {
  locale: string;
  dir: "ltr" | "rtl";
  t: T;
  pathname: string | null;
  /** Sohbet durumu başlatıcıda yaşar → panel kapanıp açılınca geçmiş kaybolmaz. */
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  onClose: () => void;
  /** Asistan kapatıldı (bayrak) → başlatıcı da gizlenir. */
  onOff: () => void;
}

const TIER_KEY: Record<CardTier, DictKey> = {
  economy: "concierge.tierEconomy",
  recommended: "concierge.tierRecommended",
  premium: "concierge.tierPremium",
};
const ERROR_KEY: Record<ChatError, DictKey> = {
  network: "concierge.errorNetwork",
  rate: "concierge.errorRate",
  busy: "concierge.errorBusy",
};
const QUICK_KEYS: DictKey[] = ["concierge.quick1", "concierge.quick2", "concierge.quick3"];

/**
 * Çerez bandının ekranın altından kapladığı yükseklik (px). Panel açıkken 250 ms'de bir ölçülür: bant panelden
 * SONRA belirirse de (ilk ziyarette gecikmeli gelir) panel ve mesaj alanı bandın üstünde kalır.
 * Bant öğesi mevcut işaretle bulunur (`data-cookie-banner`, useOverlayBusy ile aynı ölçüm); yeni sistem değildir.
 */
function useCookieBandLift(): number {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const measure = () => {
      const tops = Array.from(document.querySelectorAll<HTMLElement>("[data-cookie-banner]"))
        .map((b) => b.getBoundingClientRect()).filter((r) => r.height > 0).map((r) => r.top);
      const next = tops.length ? Math.max(0, Math.round(window.innerHeight - Math.min(...tops))) : 0;
      setLift((prev) => (prev === next ? prev : next));
    };
    measure();
    const timer = setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => { clearInterval(timer); window.removeEventListener("resize", measure); };
  }, []);
  return lift;
}

function readToken(): string | null {
  try { return window.sessionStorage.getItem(SESSION_STORAGE_KEY); } catch { return null; }
}
function writeToken(token: string) {
  try { window.sessionStorage.setItem(SESSION_STORAGE_KEY, token); } catch { /* depolama kapalıysa her mesaj yeni oturumdur */ }
}

function Card({ card, t, onNavigate }: { card: ConciergeCard; t: T; onNavigate: () => void }) {
  // Aynı sekmede ürün sayfasına gidilirken panel kapanır; yeni sekme / pencere tıklamalarında açık kalır.
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackConcierge("card_click", card);
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) onNavigate();
  };
  return (
    <Link
      href={card.path}
      onClick={onClick}
      onAuxClick={(e) => { if (e.button === 1) trackConcierge("card_click", card); }}
      data-concierge-card={card.productId}
      className="flex gap-3 rounded-2xl border border-border bg-card p-2.5 text-start transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-card">
        <ProductImage src={card.imageUrl} alt={card.name} padding="0px" sizes="64px" avifMedia={false} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <span className="flex flex-col gap-1">
          {card.tier ? (
            <span className="w-fit rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold leading-4 text-accent-foreground">{t(TIER_KEY[card.tier])}</span>
          ) : null}
          <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{card.name}</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <Price minor={card.priceMinor} className="text-sm font-semibold text-foreground" />
          <span className="text-xs font-semibold text-primary">{t("concierge.cardCta")}</span>
        </span>
      </span>
    </Link>
  );
}

function Bubble({ m, t, locale, foreign, onNavigate }: { m: ChatMessage; t: T; locale: string; foreign: boolean; onNavigate: () => void }) {
  if (m.role === "user") {
    return (
      <div className="ms-auto max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap break-words">
        {m.text}
      </div>
    );
  }
  // Yanıt dili sayfa dilinden farklı olabilir (müşteri başka dilde yazdıysa) → yön ve dil yanıta göre.
  const lang = m.lang ?? locale;
  return (
    <div className="me-auto flex max-w-[92%] flex-col gap-2">
      <div lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-2xl bg-secondary px-3.5 py-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
        {m.text}
      </div>
      {m.cards && m.cards.length > 0 ? (
        <div className="flex flex-col gap-2">
          {m.cards.map((c) => <Card key={c.productId} card={c} t={t} onNavigate={onNavigate} />)}
          {foreign ? <p className="px-1 text-[11px] leading-4 text-muted-foreground">{t("concierge.tryNote")}</p> : null}
        </div>
      ) : null}
      {m.handoff ? (
        <a
          href={conciergeWhatsappUrl(locale)}
          target="_blank"
          rel="nofollow noopener noreferrer"
          data-concierge-whatsapp=""
          onClick={() => trackConcierge("whatsapp")}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("concierge.whatsapp")}
        </a>
      ) : null}
    </div>
  );
}

export default function ConciergePanel({ locale, dir, t, pathname, state, dispatch, onClose, onOff }: Props) {
  const lift = useCookieBandLift();
  const [draft, setDraft] = useState("");
  const { isForeign } = useCurrency();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const closedRef = useRef(false);
  closedRef.current = state.closed;
  // Panel yanıt beklenirken kapatılıp açılırsa busyRef sıfırlanır; süren tur state.pending'den bilinir.
  // Ekranda görünen mesaj sayısı (gönderim anındaki değer): 0 ise belirteç gönderilmez → yeni oturum (lib/concierge.ts tokenToSend).
  const visibleRef = useRef(0);
  visibleRef.current = state.messages.length;
  const pendingRef = useRef(false);
  pendingRef.current = state.pending;

  const send = useCallback(async (raw: string) => {
    if (busyRef.current || pendingRef.current || !canSend(raw, false, closedRef.current)) return;
    busyRef.current = true;
    dispatch({ type: "send", text: raw });
    setDraft("");
    trackConcierge("message");
    let outcome: TurnOutcome;
    try {
      const res = await fetch("/api/concierge/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildRequestBody(raw, locale, pathname, tokenToSend(visibleRef.current, readToken()))),
        cache: "no-store",
      });
      let json: unknown = null;
      try { json = await res.json(); } catch { json = null; }
      outcome = parseTurn(res.status, json, res.headers.get("retry-after"));
    } catch {
      outcome = { kind: "error" };
    }
    if ((outcome.kind === "reply" || outcome.kind === "busy") && outcome.sessionToken) writeToken(outcome.sessionToken);
    busyRef.current = false;
    dispatch({ type: "outcome", outcome });
  }, [locale, pathname, dispatch]);

  // Bayrak kapandıysa panel kapanır.
  useEffect(() => { if (state.off) onOff(); }, [state.off, onOff]);
  // Yeni mesajda en alta kaydır.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages.length, state.pending, state.error]);
  // Açılışta giriş alanına odaklan; Esc ile kapat.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(draft); };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(draft); }
  };
  const sendable = canSend(draft, state.pending, state.closed);

  return (
    <>
      <button type="button" aria-hidden="true" tabIndex={-1} onClick={onClose} className="fixed inset-0 z-[9989] bg-foreground/30 lg:hidden" />
      <section
        role="dialog"
        aria-label={t("concierge.title")}
        dir={dir}
        data-concierge-panel=""
        // Çerez bandı açıkken panel bandın üstüne çıkar; üstten taşmaması için yükseklik de o kadar kısalır.
        style={lift ? { marginBottom: lift, maxHeight: `calc(100dvh - ${lift + 24}px)` } : undefined}
        className="fixed inset-x-0 bottom-0 z-[9990] flex h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl lg:inset-x-auto lg:bottom-6 lg:left-6 lg:h-[640px] lg:max-h-[calc(100dvh-48px)] lg:w-[400px] lg:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="truncate font-display text-base font-semibold text-foreground">{t("concierge.title")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("concierge.close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div ref={listRef} role="log" aria-live="polite" aria-relevant="additions" className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="me-auto max-w-[92%] rounded-2xl bg-secondary px-3.5 py-2 text-sm leading-relaxed text-foreground">{t("concierge.greeting")}</div>
          {state.messages.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {QUICK_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => void send(t(k))}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-start text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t(k)}
                </button>
              ))}
            </div>
          ) : null}
          {state.messages.map((m) => <Bubble key={m.id} m={m} t={t} locale={locale} foreign={isForeign} onNavigate={onClose} />)}
          {state.pending ? (
            <div className="me-auto flex items-center gap-1 rounded-2xl bg-secondary px-3.5 py-3" data-concierge-typing="">
              <span className="sr-only">{t("concierge.typing")}</span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" aria-hidden="true" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms] motion-reduce:animate-none" aria-hidden="true" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms] motion-reduce:animate-none" aria-hidden="true" />
            </div>
          ) : null}
          {state.error ? (
            <div role="alert" className="me-auto flex max-w-[92%] flex-col gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5">
              <p className="text-sm leading-relaxed text-destructive">{t(ERROR_KEY[state.error])}</p>
              <div className="flex flex-wrap gap-2">
                {state.failedText ? (
                  <button
                    type="button"
                    onClick={() => void send(state.failedText ?? "")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("concierge.retry")}
                  </button>
                ) : null}
                <a
                  href={conciergeWhatsappUrl(locale)}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  onClick={() => trackConcierge("whatsapp")}
                  className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("concierge.whatsapp")}
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-border bg-card px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="concierge-input">{t("concierge.placeholder")}</label>
            <textarea
              id="concierge-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_MESSAGE_CHARS}
              disabled={state.closed}
              placeholder={t("concierge.placeholder")}
              autoComplete="off"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl bg-input-background px-3.5 py-2.5 text-base leading-snug text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 lg:text-sm"
            />
            <button
              type="submit"
              disabled={!sendable}
              aria-label={t("concierge.send")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:opacity-40"
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
          <p className="px-1 text-[11px] leading-4 text-muted-foreground">{t("concierge.privacy")}</p>
        </form>
      </section>
    </>
  );
}
