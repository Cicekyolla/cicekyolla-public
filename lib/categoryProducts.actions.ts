"use client";

/**
 * ProductCard — ZIP Homepage.tsx birebir port. Reusable ürün kartı (BestSellers + ileride ürün grid'leri).
 * Hover: görsel zoom + "Sepete Ekle" yukarı kayar; wishlist toggle; badge + fiyat + rating.
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. Görsel/etkileşim birebir.
 */

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Heart } from "lucide-react";

export type Product = {
  id: number;
  name: string;
  subtitle?: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  reviews?: number;
  slug: string;
  badge?: string;
};

export function ProductCard({ product, idx }: { product: Product; idx: number }) {
  const [wish, setWish] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/urun/${product.slug}`}
        className="group flex flex-col h-full rounded-[20px] border border-[#F1F0F5] bg-white overflow-hidden transition-all duration-300 hover:shadow-[0_14px_36px_rgba(124,58,237,0.10)] hover:border-[#EDE9FE]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image container — beyaz stüdyo zemini, kırpma yok (object-contain) */}
        <div className="relative overflow-hidden bg-white" style={{ aspectRatio: "4/5" }}>
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-3"
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 50%)", opacity: hovered ? 1 : 0 }}
          />

          {/* Badge — glassmorphism */}
          {product.badge ? (
          <div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-wider"
            style={{
              background: "rgba(139,92,246,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
            }}
          >
            {product.badge}
          </div>
          ) : null}

          {/* Wishlist */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setWish(!wish);
            }}
            aria-label="Favorilere ekle"
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              transform: wish ? "scale(1.1)" : "scale(1)",
            }}
          >
            <Heart className={`w-4 h-4 transition-colors ${wish ? "fill-[#8B5CF6] text-[#8B5CF6]" : "text-[#9CA3AF]"}`} />
          </button>

          {/* Quick add — slides up on hover */}
          <motion.div
            animate={{ y: hovered ? 0 : "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 p-4"
          >
            <button
              className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                boxShadow: "0 8px 24px rgba(139,92,246,0.5)",
              }}
            >
              Sepete Ekle
            </button>
          </motion.div>
        </div>

        {/* Info — kartla bütünleşik; ad 2 satır, fiyat sabit alt hizalı */}
        <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4">
          {product.subtitle ? (
            <p className="text-[10px] text-[#A855F7] font-bold tracking-[0.18em] uppercase mb-1.5">{product.subtitle}</p>
          ) : null}
          <h3
            className="text-[#111827] font-semibold leading-snug transition-colors duration-200 group-hover:text-[#7C3AED]"
            style={{ fontSize: "14.5px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.55em" }}
          >
            {product.name}
          </h3>
          <div className="mt-auto pt-3 flex items-baseline gap-2">
            <span style={{ fontFamily: "var(--font-display)", fontSize: "19px" }} className="font-semibold text-[#111827]">
              ₺{product.price}
            </span>
            {product.originalPrice ? (
              <span className="text-sm text-[#C4B5FD] line-through font-medium">₺{product.originalPrice}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
