"use client";

// ---------------------------------------------------------------------------
// LIGHTBOX — Ürün detayda görsele dokununca TAM EKRAN büyütme.
// Premium, dependency-free. Mobil: pinch-to-zoom + çift-dokun zoom + sürükle pan +
// yatay swipe ile görsel değiştir + aşağı swipe/backdrop/X ile kapat. Masaüstü:
// tekerlek zoom + sürükle pan + ok tuşları + Esc. Video: tam ekran controls.
// ADDITIVE: yalnız görsel katman; sipariş/checkout/business mantığına DOKUNMAZ.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/media";

export interface LightboxItem {
  url: string;
  alt?: string | null;
  isVideo?: boolean;
}

type Props = {
  items: LightboxItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
};

const MAX_SCALE = 4;
const MIN_SCALE = 1;

export default function Lightbox({ items, index, onIndexChange, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const item = items[index];
  const isVid = !!item?.isVideo;

  // Gesture state (ref → re-render tetiklemez)
  const g = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    startDist: 0,
    startScale: 1,
    lastPan: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
    downX: 0,
    downY: 0,
    downTime: 0,
    lastTapTime: 0,
    moved: false,
  });

  const reset = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);

  const goto = useCallback((i: number) => {
    const n = items.length;
    if (n === 0) return;
    const ni = ((i % n) + n) % n;
    onIndexChange(ni);
    reset();
  }, [items.length, onIndexChange, reset]);

  // Body scroll lock + Esc/oklar (masaüstü)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goto(index + 1);
      else if (e.key === "ArrowLeft") goto(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [index, goto, onClose]);

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isVid) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const st = g.current;
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    st.moved = false;
    if (st.pointers.size === 2) {
      const [p1, p2] = [...st.pointers.values()];
      st.startDist = dist(p1, p2);
      st.startScale = scale;
    } else {
      st.downX = e.clientX; st.downY = e.clientY; st.downTime = Date.now();
      st.startPan = { x: tx, y: ty };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isVid) return;
    const st = g.current;
    if (!st.pointers.has(e.pointerId)) return;
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (st.pointers.size === 2 && st.startDist > 0) {
      const [p1, p2] = [...st.pointers.values()];
      const ratio = dist(p1, p2) / st.startDist;
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, st.startScale * ratio));
      setScale(ns);
      st.moved = true;
      return;
    }
    if (st.pointers.size === 1) {
      const dx = e.clientX - st.downX;
      const dy = e.clientY - st.downY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) st.moved = true;
      if (scale > 1) {
        setTx(st.startPan.x + dx);
        setTy(st.startPan.y + dy);
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const st = g.current;
    const p = st.pointers.get(e.pointerId);
    st.pointers.delete(e.pointerId);

    if (isVid) return;

    // Çift dokun/tık → zoom aç/kapa
    const now = Date.now();
    const isTap = !st.moved && now - st.downTime < 250;
    if (isTap) {
      if (now - st.lastTapTime < 300) {
        // double tap
        if (scale > 1) reset(); else setScale(2.5);
        st.lastTapTime = 0;
        return;
      }
      st.lastTapTime = now;
    }

    // Tek parmak bırakıldı ve zoom yoksa → swipe (yatay geçiş / aşağı kapat)
    if (st.pointers.size === 0 && scale <= 1 && p) {
      const dx = p.x - st.downX;
      const dy = p.y - st.downY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        goto(index + (dx < 0 ? 1 : -1));
      } else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
        onClose();
      }
    }
    if (st.pointers.size < 2) st.startDist = 0;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (isVid) return;
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale - e.deltaY * 0.0015 * scale));
    setScale(ns);
    if (ns <= 1) { setTx(0); setTy(0); }
  };

  if (!item) return null;
  const multi = items.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center select-none"
      style={{ background: "rgba(10,1,24,0.94)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Ürün görseli büyütülmüş görünüm"
    >
      {/* Kapat */}
      <button
        onClick={onClose}
        aria-label="Kapat"
        className="absolute top-4 right-4 z-[102] w-11 h-11 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Sayaç */}
      {multi ? (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[102] text-white/80 text-[13px] font-medium tabular-nums">
          {index + 1} / {items.length}
        </div>
      ) : null}

      {/* Prev / Next (masaüstü + tıklanabilir) */}
      {multi ? (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goto(index - 1); }}
            aria-label="Önceki"
            className="hidden sm:flex absolute left-4 z-[102] w-12 h-12 rounded-full items-center justify-center text-white bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goto(index + 1); }}
            aria-label="Sonraki"
            className="hidden sm:flex absolute right-4 z-[102] w-12 h-12 rounded-full items-center justify-center text-white bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      ) : null}

      {/* Medya alanı */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {isVid ? (
          <video
            src={mediaUrl(item.url)}
            controls
            autoPlay
            className="max-w-[94vw] max-h-[88vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={mediaUrl(item.url)}
            alt={item.alt ?? ""}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="max-w-[96vw] max-h-[90vh] object-contain will-change-transform"
            style={{
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              transition: g.current.pointers.size ? "none" : "transform 0.22s ease-out",
              cursor: scale > 1 ? "grab" : "zoom-in",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
          />
        )}
      </div>

      {/* İpucu */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[101] text-white/50 text-[11px] font-medium pointer-events-none">
        {isVid ? "" : "Yakınlaştırmak için çift dokun · parmakla büyüt"}
      </div>
    </div>
  );
}
