"use client";

/**
 * CountUp — ZIP Homepage.tsx birebir.
 * Görünür olunca (IntersectionObserver) 0'dan hedefe sayar; tr-TR biçimlendirme + suffix.
 */

import { useEffect, useRef, useState } from "react";

export function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const step = target / 55;
        let v = 0;
        const t = setInterval(() => {
          v += step;
          if (v >= target) {
            setCount(target);
            clearInterval(t);
          } else {
            setCount(Math.floor(v));
          }
        }, 18);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString("tr-TR")}
      {suffix}
    </span>
  );
}
