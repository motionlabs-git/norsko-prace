"use client";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";

interface Particle { id: number; angle: number; dist: number; }

interface Props {
  jobId: string;
  initialFavorited: boolean;
  variant?: "card" | "detail";
  locale?: string;
}

function HeartIcon({ filled, pop }: { filled: boolean; pop: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 flex-shrink-0"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={pop ? { animation: "heart-pop 0.35s ease-out" } : undefined}
    >
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

let particleCounter = 0;

function spawnParticles(): Particle[] {
  const count = 8;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + Math.random() * 20 - 10;
    const dist = 28 + Math.random() * 18;
    return { id: ++particleCounter, angle, dist };
  });
}

export function FavoriteButton({ jobId, initialFavorited, variant = "card", locale = "cs" }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pop, setPop] = useState(false);
  const isCs = locale === "cs";

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!favorited) {
      // Burst only when favoriting
      setParticles(spawnParticles());
      setPop(true);
      setTimeout(() => setPop(false), 400);
      setTimeout(() => setParticles([]), 800);
    }

    startTransition(async () => {
      const result = await toggleFavorite(jobId);
      setFavorited(result.isFavorited);
    });
  }

  const particleEls = particles.map((p) => {
    const rad = (p.angle * Math.PI) / 180;
    const hx = `${Math.cos(rad) * p.dist}px`;
    const hy = `${Math.sin(rad) * p.dist}px`;
    return (
      <span
        key={p.id}
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          pointerEvents: "none",
          fontSize: "10px",
          lineHeight: 1,
          color: "#C8102E",
          animation: "heart-fly 0.7s ease-out forwards",
          ["--hx" as string]: hx,
          ["--hy" as string]: hy,
        }}
      >
        ♥
      </span>
    );
  });

  if (variant === "detail") {
    return (
      <div className="relative">
        {particleEls}
        <button
          onClick={handleClick}
          disabled={isPending}
          aria-label={favorited
            ? (isCs ? "Odebrat z oblíbených" : "Odstrániť z obľúbených")
            : (isCs ? "Uložit do oblíbených" : "Uložiť do obľúbených")}
          className={`cursor-pointer flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition-all duration-150
            ${favorited
              ? "border-[#C8102E] bg-[#C8102E] text-white"
              : "border-gray-200 bg-white text-gray-500 hover:border-[#C8102E] hover:text-[#C8102E]"
            }
            ${isPending ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <HeartIcon filled={favorited} pop={pop} />
          {favorited
            ? (isCs ? "Uloženo" : "Uložené")
            : (isCs ? "Uložit do oblíbených" : "Uložiť do obľúbených")}
        </button>
      </div>
    );
  }

  // card variant — small circle, absolutely positioned
  return (
    <div className="absolute top-3 right-3 z-10 group/fav">
      {particleEls}
      <button
        onClick={handleClick}
        disabled={isPending}
        aria-label={favorited ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
        className={`cursor-pointer flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150
          ${favorited
            ? "border-[#C8102E] bg-[#C8102E] text-white shadow-md"
            : "border-gray-200 bg-white/90 text-gray-400 hover:border-[#C8102E] hover:text-[#C8102E] shadow-sm"
          }
          ${isPending ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <HeartIcon filled={favorited} pop={pop} />
      </button>
      <div className="pointer-events-none absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/fav:opacity-100">
        {favorited ? "Odebrat z oblíbených" : "Uložit do oblíbených"}
        <div className="absolute -top-1 right-3 h-2 w-2 rotate-45 bg-gray-900" />
      </div>
    </div>
  );
}
