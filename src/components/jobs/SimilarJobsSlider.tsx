"use client";

import { useRef } from "react";
import { JobCard } from "./JobCard";
import type { localizeJob, getCategoryMeta } from "@/lib/jobs";

type JobItem = {
  job: ReturnType<typeof localizeJob>;
  meta: ReturnType<typeof getCategoryMeta>;
};

interface Props {
  items: JobItem[];
  label: string;
}

function ChevronLeft() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>;
}

function ChevronRight() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>;
}

export function SimilarJobsSlider({ items, label }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  };
  if (items.length === 0) return null;

  return (
    <section className="bg-[var(--color-bg)] py-10 border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">{label}</h2>
          <div className="flex gap-2">
            <button onClick={() => scroll("left")} aria-label="Předchozí" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"><ChevronLeft /></button>
            <button onClick={() => scroll("right")} aria-label="Další" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"><ChevronRight /></button>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: "none" }}>
          {items.map(({ job, meta }) => (
            <div key={job.id} className="w-72 flex-shrink-0 snap-start">
              <JobCard job={job} meta={meta} headingLevel="h3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
