"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Job } from "@/types";

type AdminJob = Pick<Job, "id" | "title_cs" | "title_sk" | "company" | "category_level1" | "location_city" | "is_premium" | "is_active" | "published_at" | "requires_norwegian">;

interface Props {
  jobs: AdminJob[];
  locale: string;
}

export function AdminJobsTable({ jobs: initialJobs, locale }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "premium" | "inactive">("active");
  const [pending, startTransition] = useTransition();

  const isCs = locale === "cs";

  async function togglePremium(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("jobs").update({ is_premium: !current }).eq("id", id);
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_premium: !current } : j));
  }

  const filtered = jobs.filter((j) => {
    const title = (isCs ? j.title_cs : j.title_sk) ?? j.title_cs ?? "";
    const matchesSearch =
      !search ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      (j.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (j.location_city ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "active" && j.is_active) ||
      (filter === "premium" && j.is_premium) ||
      (filter === "inactive" && !j.is_active);

    return matchesSearch && matchesFilter;
  });

  const premiumCount = jobs.filter((j) => j.is_premium).length;
  const activeCount = jobs.filter((j) => j.is_active).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Aktivní", value: activeCount, color: "text-green-700 bg-green-50" },
          { label: "Prémiové", value: premiumCount, color: "text-[var(--color-primary)] bg-[var(--color-primary-light)]" },
          { label: "Celkem", value: jobs.length, color: "text-[var(--color-text-muted)] bg-[var(--color-bg)]" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border border-[var(--color-border)] px-5 py-4 ${color}`}>
            <p className="text-2xl font-extrabold">{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat inzerát, firmu, lokalitu…"
          className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        <div className="flex rounded-xl border border-[var(--color-border)] overflow-hidden text-xs font-semibold">
          {(["active", "premium", "all", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 transition-colors ${
                filter === f
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
              }`}
            >
              {{ active: "Aktivní", premium: "Premium", all: "Vše", inactive: "Neaktivní" }[f]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">{filtered.length} výsledků</p>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Premium</th>
                <th className="px-5 py-3 text-left">Název</th>
                <th className="px-5 py-3 text-left">Firma</th>
                <th className="px-5 py-3 text-left">Lokalita</th>
                <th className="px-5 py-3 text-left">Kategorie</th>
                <th className="px-5 py-3 text-left">Stav</th>
                <th className="px-5 py-3 text-left">Přidáno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((job) => {
                const title = (isCs ? job.title_cs : job.title_sk) ?? job.title_cs ?? "—";
                const date = job.published_at
                  ? new Date(job.published_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "2-digit" })
                  : "—";

                return (
                  <tr
                    key={job.id}
                    className={`transition-colors hover:bg-[var(--color-bg)] ${job.is_premium ? "bg-[var(--color-primary-light)]/40" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() => startTransition(() => togglePremium(job.id, job.is_premium))}
                        title={job.is_premium ? "Odebrat z premium" : "Označit jako premium"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          job.is_premium ? "bg-[var(--color-primary)]" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            job.is_premium ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="font-medium text-[var(--color-text)] truncate" title={title}>{title}</p>
                      {job.requires_norwegian && (
                        <span className="text-xs text-red-500">🇳🇴 vyžaduje norštinu</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)] truncate max-w-[120px]">{job.company ?? "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{job.location_city ?? "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)] text-xs">{job.category_level1 ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        job.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {job.is_active ? "Aktivní" : "Neaktivní"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)] text-xs whitespace-nowrap">{date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-[var(--color-text-muted)]">
              Žádné výsledky
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
