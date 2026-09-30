"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { FormAlert } from "@/components/auth/FormAlert";
import { PASSWORD_MAX, PASSWORD_MIN, validateNewPassword, viewForResponse, viewForThrown } from "@/lib/authErrors";
import { takeResetToken, urlWithoutResetToken } from "@/lib/resetToken";

type TokenState = "kontrol" | "gecerli" | "gecersiz";

export default function SifreBelirleForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tokenState, setTokenState] = useState<TokenState>("kontrol");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "success">("error");
  /* Onay kutusu İŞARETSİZ başlar; gövdeye gerçek değeri gider (DESIGN §3.A.10).
     API `sifre-sifirla/tamamla` yeni bir giriş oluşturacaksa `kvkk_onay`
     bekliyor — sabit true göndermek, alınmamış onayı kaydetmek olurdu. */
  const [kvkkOnay, setKvkkOnay] = useState(false);

  /*
   * Token okuma (DESIGN §3.A.9).
   *
   * İKİ BİÇİM de okunur: önce `#token=` (API `RESET_LINK_FRAGMENT=true` iken —
   * fragment sunucuya ve Referer'a hiç gitmez), sonra bugünkü `?token=`.
   * Böylece API bayrağı açıldığında public'te hiçbir şey değiştirmek gerekmez
   * ve bayrak kapalıyken eski bağlantılar çalışmaya devam eder.
   *
   * Sayfanın başındaki satır içi script token'ı çoğunlukla zaten almış ve
   * adresi temizlemiş olur; burada yalnız o değer devralınır. Script hiç
   * çalışmadıysa (tarayıcı engeli) URL'den okunur ve adres BURADA temizlenir.
   *
   * Doğrulama isteği POST'tur: token'ı yeniden bir sorgu dizesine yazmak,
   * fragment'e taşımanın bütün kazancını geri verirdi.
   */
  useEffect(() => {
    const fromUrl = takeResetToken(window as unknown as Record<string, unknown> & { location: Location });
    if (!fromUrl) {
      setTokenState("gecersiz");
      return;
    }
    setToken(fromUrl);
    try {
      const cleaned = urlWithoutResetToken(window.location);
      if (cleaned !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(null, "", cleaned);
      }
    } catch {
      /* history erişilemezse sayfa yine çalışır; yalnız adres temizlenmez. */
    }
    let cancelled = false;
    fetch("/api/auth/sifre-sifirla/gecerli", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: fromUrl }),
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
    if (!kvkkOnay) {
      setTone("error");
      setMessage("Devam etmek için Üyelik Aydınlatma Metni'ni okuduğunuzu onaylayın.");
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
        body: JSON.stringify({ token, password, kvkk_onay: kvkkOnay }),
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
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  autoComplete="new-password"
                  placeholder={`En az ${PASSWORD_MIN} karakter`}
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
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  autoComplete="new-password"
                  placeholder="Şifrenizi tekrar girin"
                  className="h-14 rounded-[var(--radius)] border border-border bg-input-background px-4 outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </label>
              <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input
                  name="kvkk_onay"
                  type="checkbox"
                  checked={kvkkOnay}
                  onChange={(event) => {
                    setKvkkOnay(event.target.checked);
                    setMessage(null);
                  }}
                  aria-describedby={message ? "sifre-belirle-hata" : undefined}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <span>
                  <Link href="/kvkk" target="_blank" className="font-semibold text-primary underline underline-offset-2">
                    Üyelik Aydınlatma Metni
                  </Link>
                  &apos;ni okudum, kişisel verilerimin üyelik kapsamında işlenmesini kabul ediyorum.
                </span>
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
