"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { FormAlert } from "@/components/auth/FormAlert";
import { validateResetRequest, viewForResponse, viewForThrown } from "@/lib/authErrors";
import { SUPPORT_WHATSAPP } from "@/lib/payment";

export default function SifremiUnuttumForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const identifier = String(new FormData(event.currentTarget).get("identifier") ?? "").trim();

    const preflight = validateResetRequest(identifier);
    if (preflight) {
      setError(preflight.message);
      return;
    }

    setLoading(true);
    setError(null);
    let response: Response;
    try {
      response = await fetch("/api/auth/sifre-sifirla/talep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier }),
      });
    } catch (thrown) {
      setLoading(false);
      setError(viewForThrown(thrown).message);
      return;
    }
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      // Teknik metin gösterilmez; sunucu hesap var/yok bilgisini zaten sızdırmaz.
      setError(viewForResponse(response.status, body).message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="bg-background px-6 py-16 text-foreground lg:px-14 lg:py-24">
      <div className="mx-auto max-w-[560px]">
        <div className="rounded-[var(--radius-xl)] border border-border bg-card p-8 shadow-[0_24px_70px_rgba(45,22,72,.07)] lg:p-10">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
            <MessageCircle className="h-7 w-7" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.28em] text-primary">Şifre yenileme</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Şifrenizi yeniden belirleyin</h1>

          {sent ? (
            <div className="mt-6 grid gap-5">
              <p className="leading-7 text-muted-foreground">
                Kayıtlı bir hesap bulunduysa, şifre belirleme bağlantısı hesabınızdaki telefon
                numarasına <strong className="text-foreground">WhatsApp</strong> ile gönderildi.
                Bağlantı <strong className="text-foreground">30 dakika</strong> geçerlidir.
              </p>
              <div className="flex items-start gap-3 rounded-[var(--radius)] bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                Bağlantı yalnız WhatsApp ile gider; e-posta gönderilmez. Hesabınızda geçerli bir cep
                telefonu kayıtlı değilse mesaj ulaşmaz — bu durumda aşağıdaki destek hattından
                yardım alabilirsiniz. Bağlantıyı kimseyle paylaşmayın.
              </div>
              {/* E-postayla kayıtlı ama telefonu olmayan üye için ÇIKIŞ YOLU:
                  eskiden bu durumda ekran "gönderildi" deyip sessizce bitiyordu. */}
              <a
                href={SUPPORT_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#25D366] px-8 py-4 text-center text-base font-bold text-[#128C7E] transition-colors hover:bg-[#F0FFF4]"
              >
                <MessageCircle className="h-4 w-4" /> Mesaj gelmediyse WhatsApp destek
              </a>
              <Link
                href="/giris"
                className="rounded-full bg-primary px-8 py-4 text-center text-lg font-bold text-primary-foreground shadow-[0_18px_45px_rgba(139,92,246,.28)] transition-colors duration-200 hover:bg-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="mt-6 grid gap-5">
              <p className="leading-7 text-muted-foreground">
                Hesabınızda kayıtlı e-posta adresinizi veya telefon numaranızı girin. Şifre belirleme
                bağlantısını, hesabınızdaki telefon numarasına WhatsApp ile göndereceğiz.
              </p>
              {error && <FormAlert id="sifirla-hata" tone="error" message={error} />}
              <label className="grid gap-2 text-sm font-semibold">
                E-posta veya telefon
                <input
                  name="identifier"
                  required
                  type="text"
                  autoComplete="username"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "sifirla-hata" : undefined}
                  placeholder="ornek@email.com veya 05XX XXX XX XX"
                  className={`h-14 rounded-[var(--radius)] border bg-input-background px-4 outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${error ? "border-[#FCA5A5]" : "border-border"}`}
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-[0_18px_45px_rgba(139,92,246,.28)] transition-colors duration-200 hover:bg-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              >
                {loading ? "Gönderiliyor…" : "Bağlantı Gönder"}
              </button>
              <Link href="/giris" className="text-center text-sm font-semibold text-primary">
                Giriş sayfasına dön
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
