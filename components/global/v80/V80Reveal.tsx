"use client";
import { useEffect } from "react";

/** [data-v80-reveal] öğelerine görünürlükte `.on` verir (Figma reveal). JS yoksa CSS fallback 2.5 sn'de açar. */
export function V80Reveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".v80 [data-v80-reveal]"));
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("on"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const delay = Number(el.dataset.d ?? 0) * 50;
          window.setTimeout(() => el.classList.add("on"), delay);
          io.unobserve(el);
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -16px 0px" }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return null;
}
