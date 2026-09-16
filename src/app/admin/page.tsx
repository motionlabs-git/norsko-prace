import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminJobsTable } from "./AdminJobsTable";
import type { Job } from "@/types";

export const metadata = { title: "Admin" };
export const revalidate = 0;

// Mimo komponentu — Date.now() v renderu hlásí react-hooks/purity
function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

export default async function AdminPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("id, title_cs, title_sk, company, category_level1, location_city, is_premium, is_active, published_at, requires_norwegian")
    .order("published_at", { ascending: false });

  // Stav NAV syncu: synced_at = kurzor, kam feed došel. Když zaostává, sync neběží/nestíhá.
  const { data: lastSync } = await supabaseAdmin()
    .from("sync_log")
    .select("synced_at, pages, upserted")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const syncAgeHours = lastSync ? hoursSince(lastSync.synced_at) : null;
  // Cron běží jednou týdně → do 8 dní je stáří kurzoru normální
  const syncStale = syncAgeHours === null || syncAgeHours > 8 * 24;

  const jobs = (data ?? []) as Pick<Job, "id" | "title_cs" | "title_sk" | "company" | "category_level1" | "location_city" | "is_premium" | "is_active" | "published_at" | "requires_norwegian">[];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-10 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text)]">Admin panel</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{jobs.length} inzerátů celkem</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
              Premium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />
              Standardní
            </span>
          </div>
        </div>

        <div
          className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
            syncStale
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {syncAgeHours === null ? (
            <strong>⚠️ NAV sync ještě neproběhl.</strong>
          ) : (
            <>
              <strong>{syncStale ? "⚠️ NAV sync zaostává" : "✓ NAV sync v pořádku"}</strong> — data aktuální k{" "}
              {new Date(lastSync!.synced_at).toLocaleString("cs-CZ")} ({syncAgeHours < 48 ? `${Math.round(syncAgeHours)} h` : `${Math.round(syncAgeHours / 24)} dní`}).
              {syncStale && " Zkontroluj Vercel → Logs u /api/sync."}
            </>
          )}
        </div>

        <AdminJobsTable jobs={jobs} />
      </div>
    </div>
  );
}
