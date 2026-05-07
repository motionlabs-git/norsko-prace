"use client";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";

interface Props {
  jobId: string;
  initialFavorited: boolean;
}

export function FavoriteButton({ jobId, initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleFavorite(jobId);
      setFavorited(result.isFavorited);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={favorited ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
      className={`absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150
        ${favorited
          ? "border-[#C8102E] bg-[#C8102E] text-white shadow-md"
          : "border-gray-200 bg-white/90 text-gray-400 hover:border-[#C8102E] hover:text-[#C8102E] shadow-sm"
        }
        ${isPending ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}
