export { createClient as createServerSupabase } from "@/utils/supabase/server";
export { createClient as createBrowserSupabase } from "@/utils/supabase/client";

import { createClient as createSupabaseJs } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function supabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseJs(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
