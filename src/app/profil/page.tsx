import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getEntitlement, hasPremiumPlus, getContactAccess, FREE_CONTACT_LIMIT } from "@/lib/entitlement";
import { reconcileSubscription } from "@/lib/subscription-sync";
import { ManageSubscriptionButton } from "@/components/premium/ManageSubscriptionButton";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Můj profil" };

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/profil");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  let ent = await getEntitlement(user.id);
  // Po návratu z platby ještě nemusel dorazit webhook → dotáhni stav přímo ze Stripe
  if (checkout === "success" && !ent.active) {
    try {
      if (await reconcileSubscription(user.id, user.email)) ent = await getEntitlement(user.id);
    } catch (err) {
      console.error("reconcileSubscription:", err instanceof Error ? err.message : err);
    }
  }
  const access = await getContactAccess(user.id, ent);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-extrabold text-[var(--color-text)] mb-8">Můj profil</h1>

        {checkout === "success" && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            {ent.active ? (
              <>
                <strong>🎉 Díky! {hasPremiumPlus(ent) ? "Premium Plus" : "Premium"} je aktivní.</strong> Kontakty
                a Vybrané práce máš odemčené, potvrzení ti přijde e-mailem.
              </>
            ) : (
              <>
                <strong>Platba proběhla, aktivujeme předplatné…</strong> Obvykle to trvá pár sekund —
                obnov stránku.
              </>
            )}
          </div>
        )}

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
            {ent.active ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                    {hasPremiumPlus(ent) ? "Premium Plus" : "Premium"}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">Aktivní</span>
                </div>
                {ent.currentPeriodEnd && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {ent.cancelAtPeriodEnd ? "Předplatné skončí " : "Obnoví se "}
                    {new Date(ent.currentPeriodEnd).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <ManageSubscriptionButton className="mt-3 rounded-full border border-[var(--color-primary)] px-4 py-2 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition" />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Nemáš aktivní předplatné.</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    Kontakty zdarma: využito <strong className="text-[var(--color-text)]">{access.used} z {FREE_CONTACT_LIMIT}</strong>
                  </p>
                </div>
                <Link href="/premium" className="cta-arrow inline-flex flex-shrink-0 items-center rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition">
                  Aktivovat Premium
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
