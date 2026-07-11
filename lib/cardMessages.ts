// ---------------------------------------------------------------------------
// KART MESAJI KÜTÜPHANESİ — küratörlü öneriler (vesile × ton × dil).
// FAZ 1'de "Akıllı Öneri" bunları kullanır; FAZ 2'de gerçek AI (Claude Haiku,
// mevcut ANTHROPIC_API_KEY) devreye girince bu havuz AI'nın fallback'i olur.
// Admin-First: tek kaynak; ileride admin/API'den yönetilebilir.
// ---------------------------------------------------------------------------

export type Tone = "samimi" | "romantik" | "resmi" | "esprili" | "duygusal";
export type Lang = "tr" | "en";

export const TONES: { id: Tone; label: string }[] = [
  { id: "samimi", label: "Samimi" },
  { id: "romantik", label: "Romantik" },
  { id: "duygusal", label: "Duygusal" },
  { id: "resmi", label: "Resmi" },
  { id: "esprili", label: "Esprili" },
];

interface Msg { occasion: string; tone: Tone; lang: Lang; text: string }

const M: Msg[] = [
  // Sevgili
  { occasion: "sevgili", tone: "romantik", lang: "tr", text: "Hayatıma kattığın her renk için teşekkür ederim. Seni seviyorum. ❤️" },
  { occasion: "sevgili", tone: "romantik", lang: "tr", text: "Seninle her an daha güzel. İyi ki varsın, iyi ki benimlesin." },
  { occasion: "sevgili", tone: "samimi", lang: "tr", text: "Bugün seni biraz daha mutlu etmek istedim. Seni seviyorum!" },
  { occasion: "sevgili", tone: "duygusal", lang: "tr", text: "Kelimeler seni ne kadar sevdiğimi anlatmaya yetmiyor. Sonsuza dek." },
  { occasion: "sevgili", tone: "esprili", lang: "tr", text: "Bu çiçekler kadar tazesin (ve çok daha güzelsin). ❤️" },
  { occasion: "sevgili", tone: "romantik", lang: "en", text: "You color my world every single day. I love you. ❤️" },

  // Eş
  { occasion: "es", tone: "duygusal", lang: "tr", text: "Yolumuzun her adımında yanımda olduğun için teşekkür ederim. Seni seviyorum." },
  { occasion: "es", tone: "romantik", lang: "tr", text: "Bir ömür daha yan yana… İyi ki sen." },
  { occasion: "es", tone: "samimi", lang: "tr", text: "Küçük bir sürpriz, büyük bir sevgiyle. Seni seviyorum." },

  // Anne
  { occasion: "anne", tone: "duygusal", lang: "tr", text: "Canım annem, kalbimdeki en güzel yer hep senin. Seni çok seviyorum." },
  { occasion: "anne", tone: "samimi", lang: "tr", text: "Her şey için teşekkürler anne. İyi ki varsın. ❤️" },
  { occasion: "anne", tone: "resmi", lang: "tr", text: "Sevgili annem, sağlık ve mutlulukla dolu nice günler dilerim." },
  { occasion: "anne", tone: "duygusal", lang: "en", text: "Dear Mom, you are the warmest place in my heart. I love you." },

  // Baba
  { occasion: "baba", tone: "duygusal", lang: "tr", text: "Canım babam, gücümü senden alıyorum. Seni çok seviyorum." },
  { occasion: "baba", tone: "samimi", lang: "tr", text: "İyi ki babamsın. Sağlıkla, mutlulukla…" },

  // Doğum Günü
  { occasion: "dogum_gunu", tone: "samimi", lang: "tr", text: "Nice mutlu, sağlıklı yıllara! Doğum günün kutlu olsun. 🎉" },
  { occasion: "dogum_gunu", tone: "duygusal", lang: "tr", text: "Yeni yaşın; sağlık, sevgi ve gerçekleşen dileklerle dolsun." },
  { occasion: "dogum_gunu", tone: "esprili", lang: "tr", text: "Bir yaş daha! Ama merak etme, hâlâ genç ve muhteşemsin. 🎂" },
  { occasion: "dogum_gunu", tone: "resmi", lang: "tr", text: "Doğum gününüzü en içten dileklerimle kutlar, sağlıklı bir yıl dilerim." },
  { occasion: "dogum_gunu", tone: "samimi", lang: "en", text: "Happy Birthday! Wishing you health, joy and all your dreams. 🎉" },

  // Kurumsal / Tebrik
  { occasion: "kurumsal", tone: "resmi", lang: "tr", text: "Başarılarınızın devamını diler, saygılarımızı sunarız." },
  { occasion: "kurumsal", tone: "resmi", lang: "tr", text: "Bu özel gününüzde en içten tebriklerimizi iletiriz." },
  { occasion: "tebrik", tone: "samimi", lang: "tr", text: "Tebrikler! Bu güzel başarıyı sonuna kadar hak ettin. 🎊" },
  { occasion: "tebrik", tone: "resmi", lang: "tr", text: "Başarınızı kutlar, nice başarılara diye temenni ederiz." },

  // Geçmiş Olsun
  { occasion: "gecmis_olsun", tone: "duygusal", lang: "tr", text: "Geçmiş olsun. En kısa sürede sağlığına kavuşman en büyük dileğim." },
  { occasion: "gecmis_olsun", tone: "samimi", lang: "tr", text: "Acil şifalar! Bu çiçekler moralini yükseltsin diye. 💐" },
  { occasion: "gecmis_olsun", tone: "resmi", lang: "tr", text: "Acil şifalar diler, en kısa sürede sağlığınıza kavuşmanızı temenni ederiz." },

  // Öğretmen
  { occasion: "ogretmen", tone: "duygusal", lang: "tr", text: "Bize kattığınız her şey için teşekkürler. İyi ki varsınız. 🎓" },
  { occasion: "ogretmen", tone: "resmi", lang: "tr", text: "Emeğiniz ve rehberliğiniz için en içten teşekkürlerimizle." },

  // Diğer / genel
  { occasion: "diger", tone: "samimi", lang: "tr", text: "Aklımdasın. Bu küçük sürpriz gününü güzelleştirsin. 💐" },
  { occasion: "diger", tone: "duygusal", lang: "tr", text: "Bazı anlar çiçeklerle daha güzel. Seni düşünüyorum." },
  { occasion: "diger", tone: "resmi", lang: "tr", text: "İyi dileklerimle." },
  { occasion: "diger", tone: "samimi", lang: "en", text: "Thinking of you. Hope this brightens your day. 💐" },
];

const GENERIC: Record<Lang, string[]> = {
  tr: ["Sevgiyle gönderildi. 💐", "Bu güzel gün için…", "Aklımdasın, sevgilerimle."],
  en: ["Sent with love. 💐", "For this special day…", "Thinking of you."],
};

/** Vesile + ton + dile göre öneri havuzu (yeterli sonuç yoksa dil geneline düşer). */
export function suggestMessages(occasion: string | null, tone: Tone, lang: Lang): string[] {
  const occ = occasion ?? "diger";
  let pool = M.filter((m) => m.occasion === occ && m.lang === lang && m.tone === tone).map((m) => m.text);
  if (pool.length < 2) pool = pool.concat(M.filter((m) => m.occasion === occ && m.lang === lang).map((m) => m.text));
  if (pool.length < 2) pool = pool.concat(M.filter((m) => m.lang === lang && m.tone === tone).map((m) => m.text));
  const uniq = Array.from(new Set(pool));
  return uniq.length ? uniq.slice(0, 6) : GENERIC[lang];
}
