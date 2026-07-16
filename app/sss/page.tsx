import { permanentRedirect } from "next/navigation";

export default function LegacyFaqPage() {
  permanentRedirect("/sik-sorulan-sorular");
}
