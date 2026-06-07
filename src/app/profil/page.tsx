import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Můj profil" };

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/profil");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-extrabold text-[var(--color-text)] mb-8">Můj profil</h1>

        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">E-mail</label>
            <p className="text-sm font-medium text-[var(--color-text)] bg-[var(--color-bg)] rounded-xl px-4 py-2.5 border border-[var(--color-border)]">
              {user.email}
            </p>
          </div>

          <ProfileForm userId={user.id} initialName={profile?.full_name ?? ""} />

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Předplatné</label>
            <div className="flex items-center gap-3 bg-[var(--color-bg)] rounded-xl px-4 py-3 border border-[var(--color-border)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">Beta</span>
              <p className="text-sm text-[var(--color-text-muted)]">Prémiové inzeráty — již brzy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
