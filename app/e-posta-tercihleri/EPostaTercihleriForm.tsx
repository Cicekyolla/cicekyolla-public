"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailX } from "lucide-react";
import { FormAlert } from "@/components/auth/FormAlert";
import { viewForThrown } from "@/lib/authErrors";
import {
  PREFERENCE_TEXT,
  preferencePageView,
  takeUnsubscribeToken,
  unsubscribeResultView,
  urlWithoutUnsubscribeToken,
  type PreferencePageView,
} from "@/lib/emailPreferences";

/**
 * Kampanya e-postasından çıkış ekranı. Her durum cümlesi SUNUCUNUN alanlarından
 * türetilir (lib/emailPreferences.ts): geçerli mi, zaten çıkılmış mı, maskeli
 * adres. Açılışta yalnız OKUNUR; çıkış kişinin düğmeye basmasıyla POST edilir.
 */
export default function EPostaTercihleriForm() {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<PreferencePageView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const found = takeUnsubscribeToken(window as unknown as Record<string, unknown> & { location: Location });
    // Satır içi script çalışmadıysa (tarayıcı engeli) adres BURADA temizlenir.
    try {
      const cleaned = urlWithoutUnsubscribeToken(window.location);
      if (cleaned !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(null, "", cleaned);
      }
    } catch {
      /* history erişilemezse sayfa yine çalışır. */
    }
    setToken(found);
    if (!found) {
      setView(preferencePageView(null, 0, null));
      return;
    }
    let cancelled = false;
    fetch(`/api/email-preferences?t=${encodeURIComponent(found)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!cancelled) setView(preferencePageView(found, response.status, body));
      })
      .catch((thrown) => {
        if (!cancelled) {
          setView({ state: "error", title: PREFERENCE_TEXT.errorTitle, message: viewForThrown(thrown).message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function unsubscribe() {
    if (!token) return;
    setBusy(true);
    setError(null);
    let response: Response;
    try {
      response = await fetch("/api/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token }),
      });
    } catch (thrown) {
      setBusy(false);
      setError(viewForThrown(thrown).message);
      return;
    }
    const body = await response.json().catch(() => null);
    setBusy(false);
    const next = unsubscribeResultView(response.status, body);
    // Sunucu reddettiyse ekran "aktif" kalır ve sebep gösterilir; başarı
    // YALNIZ sunucunun read-back'iyle ("withdrawn") çizilir.
    if (next.state === "error") {
      setError(next.message);
      return;
    }
    setView(next);
  }

  return (
    <main className="bg-background px-6 py-16 text-foreground lg:px-14 lg:py-24">
      <div className="mx-auto max-w-[560px]">
        <div className="rounded-[var(--radius-xl)] border border-border bg-card p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)] lg:p-10">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
            <MailX className="h-7 w-7" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.28em] text-primary">E-posta tercihleri</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">{view?.title ?? "Bağlantınız kontrol ediliyor"}</h1>

          {!view && (
            <p role="status" className="mt-6 leading-7 text-muted-foreground">
              Bağlantınız doğrulanıyor…
            </p>
          )}

          {view && (
            <div className="mt-6 grid gap-5">
              {(view.state === "active" || view.state === "done") && view.maskedEmail && (
                <p className="rounded-[18px] bg-muted p-4 text-sm text-muted-foreground">
                  E-posta adresi: <strong className="text-foreground">{view.maskedEmail}</strong>
                  {view.statusLabel ? (
                    <>
                      <br />
                      Durum: <strong className="text-foreground">{view.statusLabel}</strong>
                    </>
                  ) : null}
                </p>
              )}
              <p role={view.state === "done" ? "status" : undefined} className="leading-7 text-muted-foreground">
                {view.message}
              </p>

              {error && <FormAlert tone="error" message={error} />}

              {view.state === "active" && (
                <button
                  type="button"
                  onClick={unsubscribe}
                  disabled={busy}
                  className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-[0_18px_45px_rgba(139,92,246,.28)] transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  {busy ? "İşleniyor…" : "Aboneliği bırak"}
                </button>
              )}

              {view.state !== "active" && (
                <Link href="/hesabim" className="font-semibold text-primary underline underline-offset-2">
                  Hesabım sayfasına git
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
