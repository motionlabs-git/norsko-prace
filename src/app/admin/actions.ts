"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function togglePremiumAction(jobId: string, newValue: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Nepřihlášen" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Nedostatečná oprávnění" };

  const db = supabaseAdmin();
  const { error } = await db
    .from("jobs")
    .update({ is_premium: newValue })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/admin", "page");
  revalidatePath("/vybrane", "page");
  return {};
}
