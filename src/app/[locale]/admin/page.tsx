import { createClient } from "@/utils/supabase/server";
import { AdminJobsTable } from "./AdminJobsTable";
import type { Job } from "@/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export const metadata = { title: "Admin" };
export const revalidate = 0;

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("id, title_cs, title_sk, company, category_level1, location_city, is_premium, is_active, published_at, requires_norwegian")
    .order("published_at", { ascending: false });

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

        <AdminJobsTable jobs={jobs} locale={locale} />
      </div>
    </div>
  );
}
