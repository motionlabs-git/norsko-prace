"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(jobId: string): Promise<{ isFavorited: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nepřihlášen");

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .single();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    revalidatePath("/oblibene");
    return { isFavorited: false };
  } else {
    await supabase.from("favorites").insert({ user_id: user.id, job_id: jobId });
    revalidatePath("/oblibene");
    return { isFavorited: true };
  }
}
