"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { FormAlert } from "@/components/auth/FormAlert";
import { validateNewPassword, viewForResponse, viewForThrown } from "@/lib/authErrors";

type TokenState = "kontrol" | "gecerli" | "gecersiz";

export default function SifreBelirleForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tokenState, setTokenState] = useState<TokenState>("kontrol");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "success">("error");

  // Token URL'den okunur; sunucuya sorulup hâlâ geçerli mi doğrulanır ki
  // kullanıcı süresi dolmuş bir bağlantıda boşuna form doldurmasın.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(fromUrl);
    if (!fromUrl) {
      setTokenState("gecersiz");
      return;
    }
    let cancelled = false;
    fetch(`/api/auth/sifre-sifirla/gecerli?token=${encodeURIComponent(fromUrl)}`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data: { usable?: boolean }) => {
        if (!cancelled) setTokenState(data?.usable ? "gecerli" : "gecersiz");
      })
      .catch(() => {
        if (!cancelled) setTokenState("gecersiz");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const passwordAgain = String(form.get("password_again") ?? "");

    // Ön denetim sunucu kuralıyla (8-200) AYNI; hata artık kırmızı ve alan işaretli.
    const preflight = validateNewPassword(password, passwordAgain);
    if (preflight) { setTone("error"); setMessage(preflight.message); return; }
    if (form.get("kvkk_onay") !== "on") {
      setTone("error");
      setMessage("Devam etmek için KVKK aydınlatma metnini onaylayın.");
      return;
    }

    setLoading(true);
    setMessage(null);
    let response: Response;
    try {
      response = await fetch("/api/auth/sifre-sifirla/tamamla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password, kvkk_onay: true }),
      });
    } catch (thrown) {
      setLoading(false);
      setTone("error");
      setMessage(viewForThrown(thrown).message);
      return;
    }
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const view = viewForResponse(response.status, body);
      setTone("error");
      setMessage(view.message);
      // Bağlantı tüketilmiş/süresi dolmuşsa formu kapat, yeni bağlantı iste.
      if (response.status === 400 && /Bağlantı/i.test(String((body as { error?: string } | null)?.error ?? ""))) {
        setTokenState("gecersiz");
      }
      return;
    }
    setTone("success");
    setMessage("Şifreniz belirlendi, hesabınıza yönlendiriliyorsunuz…");
    router.push("/hesabim");
  }

  return (
    <main className="bg-background px-6 py-16 text-foreground lg:px-14 lg:py-24">
      <div className="mx-auto max-w-[560px]">
        <div className="rounded-[var(--radius-xl)] border border-border bg-card p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)] lg:p-10">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
            <KeyRound className="h-7 w-7" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.28em] text-primary">Yeni şifre</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Şifrenizi belirleyin</h1>

          {tokenState === "kontrol" && (
            <p role="status" className="mt-6 leading-7 text-muted-foreground">
              Bağlantı doğrulanıyor…
            </p>
          )}

          {tokenState === "gecersiz" && (
            <div className="mt-6 grid gap-5">
              <p className="leading-7 text-muted-foreground">
                Bu bağlantı geçersiz veya süresi dolmuş. Şifre belirleme bağlantıları 30 dakika
                geçerlidir ve yalnız bir kez kullanılabilir.
              </p>
              <Link
                href="/sifremi-unuttum"
                className="rounded-full bg-primary px-8 py-4 text-center text-lg font-bold text-primary-foreground shadow-[0_18px_45px_rgba(139,92,246,.28)] transition-colors duration-200 hover:bg-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Yeni bağlantı iste
              </Link>
            </div>
          )}

          {tokenState === "gecerli" && (
            <form noValidate onSubmit={handleSubmit} className="mt-6 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold">
                Yeni şifre
                <input
                  name="password"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="En az 8 karakter"
                  aria-invalid={tone === "error" && message ? true : undefined}
                  aria-describedby={message ? "sifre-belirle-hata" : undefined}
                  className={`h-14 rounded-[var(--radius)] border bg-input-background px-4 outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${tone === "error" && message ? "border-[#FCA5A5]" : "border-border"}`}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Yeni şifre tekrar
                <input
                  name="password_again"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Şifrenizi tekrar girin"
                  className="h-14 rounded-[var(--radius)] border border-border bg-input-background px-4 outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </label>
              <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input
                  name="kvkk_onay"
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                KVKK aydınlatma metnini ve üyelik koşullarını okudum, kabul ediyorum.
              </label>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-[0_18px_45px_rgba(139,92,246,.28)] transition-colors duration-200 hover:bg-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              >
                {loading ? "Kaydediliyor…" : "Şifremi Kaydet"}
              </button>
              {message && <FormAlert id="sifre-belirle-hata" tone={tone} message={message} />}
              <div className="flex items-start gap-3 rounded-[var(--radius)] bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                Şifreniz şifrelenerek saklanır ve hiçbir çalışanımız tarafından görülemez.
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
